const Subscription = require('../models/subscription');
const PaymentAttempt = require('../models/paymentAttempt');
const Notifications = require('./notifications');

const addInterval = (date, unit, count) => {
    const base = new Date(date.getTime());
    const safeCount = Number.isFinite(count) && count > 0 ? count : 1;

    switch (unit) {
        case 'week':
        case 'weeks':
            base.setDate(base.getDate() + (7 * safeCount));
            return base;
        case 'day':
        case 'days':
            base.setDate(base.getDate() + safeCount);
            return base;
        case 'month':
        case 'months':
        default:
            base.setMonth(base.getMonth() + safeCount);
            return base;
    }
};

const processDueSubscriptions = () => {
    Subscription.findDue((err, subs) => {
        if (err) {
            console.error('Subscription billing check failed:', err);
            return;
        }

        (subs || []).forEach((sub) => {
            const now = new Date();
            PaymentAttempt.create({
                userId: sub.user_id,
                provider: sub.provider || 'subscription',
                method: 'subscription',
                status: 'INITIATED',
                amount: sub.amount,
                currency: sub.currency
            }, () => {});

            Notifications.sendNotification({
                userId: sub.user_id,
                channel: 'email',
                destination: null,
                payload: {
                    message: `Subscription billing initiated for ${sub.plan_name || 'plan'}.`,
                    amount: sub.amount,
                    currency: sub.currency
                }
            });

            const nextBilling = addInterval(now, sub.interval_unit, sub.interval_count);
            Subscription.updateNextBilling(sub.id, nextBilling, () => {});
        });
    });
};

module.exports = {
    processDueSubscriptions,
    addInterval
};
