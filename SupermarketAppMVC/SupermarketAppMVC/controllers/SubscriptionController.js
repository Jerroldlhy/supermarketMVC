const Subscription = require('../models/subscription');
const { DEFAULT_CURRENCY, normaliseCurrency } = require('../services/currency');
const { addInterval } = require('../services/subscriptionService');

const list = (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorised' });
    }

    Subscription.listByUser(req.session.user.id, (err, rows) => {
        if (err) {
            console.error('Subscription list error:', err);
            return res.status(500).json({ error: 'Unable to fetch subscriptions' });
        }
        return res.json(rows || []);
    });
};

const create = (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorised' });
    }

    const planName = String(req.body.planName || 'Subscription').trim().slice(0, 100);
    const intervalUnit = String(req.body.intervalUnit || 'month').trim().toLowerCase();
    const intervalCount = Number(req.body.intervalCount || 1);
    const amount = Number(req.body.amount || 0);
    const currency = normaliseCurrency(req.body.currency || DEFAULT_CURRENCY);

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid subscription amount' });
    }

    const nextBillingAt = addInterval(new Date(), intervalUnit, intervalCount);

    Subscription.create({
        userId: req.session.user.id,
        planName,
        intervalUnit,
        intervalCount,
        amount,
        currency,
        provider: 'internal',
        status: 'ACTIVE',
        nextBillingAt
    }, (err, result) => {
        if (err) {
            console.error('Subscription create error:', err);
            return res.status(500).json({ error: 'Unable to create subscription' });
        }

        return res.json({
            id: result.insertId,
            planName,
            intervalUnit,
            intervalCount,
            amount,
            currency,
            nextBillingAt
        });
    });
};

module.exports = {
    list,
    create
};
