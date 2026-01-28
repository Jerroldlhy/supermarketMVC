const db = require('../db');

const create = (data, callback) => {
    const {
        attemptId = null,
        orderId = null,
        provider,
        providerOrderId,
        status = 'PENDING',
        nextRetryAt = null,
        retryCount = 0,
        lastError = null
    } = data || {};

    const sql = `
        INSERT INTO payment_retries (
            attempt_id,
            order_id,
            provider,
            provider_order_id,
            status,
            next_retry_at,
            retry_count,
            last_error
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [attemptId, orderId, provider, providerOrderId, status, nextRetryAt, retryCount, lastError], callback);
};

const findDue = (limit, callback) => {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const sql = `
        SELECT *
        FROM payment_retries
        WHERE status = 'PENDING'
          AND next_retry_at IS NOT NULL
          AND next_retry_at <= NOW()
        ORDER BY next_retry_at ASC
        LIMIT ?
    `;
    db.query(sql, [safeLimit], callback);
};

const updateRetry = (id, data, callback) => {
    const { status, nextRetryAt, retryCount, lastError } = data || {};
    const sql = `
        UPDATE payment_retries
        SET status = ?, next_retry_at = ?, retry_count = ?, last_error = ?
        WHERE id = ?
    `;
    db.query(sql, [status, nextRetryAt, retryCount, lastError, id], callback);
};

module.exports = {
    create,
    findDue,
    updateRetry
};
