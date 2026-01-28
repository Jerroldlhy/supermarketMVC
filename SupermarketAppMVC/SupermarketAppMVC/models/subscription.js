const db = require('../db');

const create = (data, callback) => {
    const {
        userId,
        planName,
        intervalUnit = 'month',
        intervalCount = 1,
        amount,
        currency,
        provider = 'internal',
        status = 'ACTIVE',
        nextBillingAt = null,
        providerSubscriptionId = null
    } = data || {};

    const sql = `
        INSERT INTO subscriptions (
            user_id,
            plan_name,
            interval_unit,
            interval_count,
            amount,
            currency,
            provider,
            status,
            next_billing_at,
            provider_subscription_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [userId, planName, intervalUnit, intervalCount, amount, currency, provider, status, nextBillingAt, providerSubscriptionId],
        callback
    );
};

const listByUser = (userId, callback) => {
    const sql = `
        SELECT *
        FROM subscriptions
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
    `;
    db.query(sql, [userId], callback);
};

const findDue = (callback) => {
    const sql = `
        SELECT *
        FROM subscriptions
        WHERE status = 'ACTIVE'
          AND next_billing_at IS NOT NULL
          AND next_billing_at <= NOW()
        ORDER BY next_billing_at ASC
    `;
    db.query(sql, callback);
};

const updateNextBilling = (id, nextBillingAt, callback) => {
    const sql = `
        UPDATE subscriptions
        SET next_billing_at = ?
        WHERE id = ?
    `;
    db.query(sql, [nextBillingAt, id], callback);
};

module.exports = {
    create,
    listByUser,
    findDue,
    updateNextBilling
};
