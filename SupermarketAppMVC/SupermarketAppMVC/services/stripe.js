const Stripe = require('stripe');

let cachedStripe = null;

const getStripe = () => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
        return null;
    }
    if (!cachedStripe) {
        cachedStripe = new Stripe(secret);
    }
    return cachedStripe;
};

const createCheckoutSession = async (data) => {
    const stripe = getStripe();
    if (!stripe) {
        throw new Error('Stripe is not configured.');
    }

    const {
        amount,
        currency,
        description,
        successUrl,
        cancelUrl,
        metadata,
        customerEmail,
        clientReferenceId
    } = data || {};

    const safeAmount = Number(amount);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
        throw new Error('Invalid Stripe amount.');
    }

    const unitAmount = Math.round(safeAmount * 100);
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: String(currency || 'sgd').toLowerCase(),
                    unit_amount: unitAmount,
                    product_data: {
                        name: description || 'Supermarket order'
                    }
                },
                quantity: 1
            }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail || undefined,
        client_reference_id: clientReferenceId || undefined,
        metadata: metadata || undefined
    });

    return session;
};

const retrieveCheckoutSession = async (sessionId) => {
    const stripe = getStripe();
    if (!stripe) {
        throw new Error('Stripe is not configured.');
    }
    if (!sessionId) {
        throw new Error('Missing Stripe session id.');
    }
    return stripe.checkout.sessions.retrieve(sessionId);
};

module.exports = {
    createCheckoutSession,
    retrieveCheckoutSession
};
