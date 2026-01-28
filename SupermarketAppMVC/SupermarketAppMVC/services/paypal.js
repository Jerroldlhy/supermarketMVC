const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_API;

const tokenCache = {
    accessToken: null,
    expiresAt: 0
};

async function getAccessToken() {
    if (!PAYPAL_CLIENT || !PAYPAL_SECRET || !PAYPAL_API) {
        throw new Error('Missing PayPal configuration.');
    }

    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is not available. Use Node 18+ or add a fetch polyfill.');
    }

    if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
        return tokenCache.accessToken;
    }

    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    if (data && data.access_token && data.expires_in) {
        const bufferMs = 60 * 1000;
        tokenCache.accessToken = data.access_token;
        tokenCache.expiresAt = Date.now() + (Number(data.expires_in) * 1000) - bufferMs;
    }
    return data.access_token;
}

async function createOrder(amount, options) {
    const { currencyCode = 'SGD', invoiceNumber = null, customId = null } = options || {};
    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currencyCode,
                    value: amount
                },
                invoice_id: invoiceNumber || undefined,
                custom_id: customId || undefined
            }]
        })
    });
    return response.json();
}

async function captureOrder(orderId) {
    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });
    return response.json();
}

module.exports = {
    createOrder,
    captureOrder,
    getAccessToken
};
