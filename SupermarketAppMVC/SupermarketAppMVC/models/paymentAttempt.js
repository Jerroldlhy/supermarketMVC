const db = require('../db');

const create = (data, callback) => {
    const {
        userId,
        orderId = null,
        provider,
        method,
        status = 'INITIATED',
        amount = null,
        currency = null,
        ipAddress = null,
        deviceFingerprint = null,
        failureReason = null,
        providerOrderId = null
    } = data || {};

    const sql = `
        INSERT INTO payment_attempts (
            user_id,
            order_id,
            provider,
            method,
            status,
            amount,
            currency,
            ip_address,
            device_fingerprint,
            failure_reason,
            provider_order_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [userId, orderId, provider, method, status, amount, currency, ipAddress, deviceFingerprint, failureReason, providerOrderId],
        callback
    );
};

const updateStatusByProviderOrder = (providerOrderId, status, failureReason, callback) => {
    const sql = `
        UPDATE payment_attempts
        SET status = ?, failure_reason = ?
        WHERE provider_order_id = ?
    `;
    db.query(sql, [status, failureReason || null, providerOrderId], callback);
};

const updateStatusById = (attemptId, status, failureReason, callback) => {
    const sql = `
        UPDATE payment_attempts
        SET status = ?, failure_reason = ?
        WHERE id = ?
    `;
    db.query(sql, [status, failureReason || null, attemptId], callback);
};

const countRecentAttempts = (criteria, callback) => {
    const { userId, ipAddress, minutes = 10 } = criteria || {};
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 10;

    const sql = `
        SELECT COUNT(*) AS attemptCount
        FROM payment_attempts
        WHERE created_at >= (NOW() - INTERVAL ? MINUTE)
          AND (
            (user_id IS NOT NULL AND user_id = ?)
            OR (ip_address IS NOT NULL AND ip_address = ?)
          )
    `;

    db.query(sql, [safeMinutes, userId || null, ipAddress || null], (err, rows) => {
        if (err) {
            return callback(err);
        }
        const count = rows && rows.length ? Number(rows[0].attemptCount) : 0;
        return callback(null, count);
    });
};

const countRecentFailures = (criteria, callback) => {
    const { userId, ipAddress, minutes = 10 } = criteria || {};
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 10;

    const sql = `
        SELECT COUNT(*) AS attemptCount
        FROM payment_attempts
        WHERE created_at >= (NOW() - INTERVAL ? MINUTE)
          AND status = 'FAILED'
          AND (
            (user_id IS NOT NULL AND user_id = ?)
            OR (ip_address IS NOT NULL AND ip_address = ?)
          )
    `;

    db.query(sql, [safeMinutes, userId || null, ipAddress || null], (err, rows) => {
        if (err) {
            return callback(err);
        }
        const count = rows && rows.length ? Number(rows[0].attemptCount) : 0;
        return callback(null, count);
    });
};

module.exports = {
    create,
    updateStatusByProviderOrder,
    updateStatusById,
    countRecentAttempts,
    countRecentFailures
};
