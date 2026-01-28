const db = require('../db');

const create = (data, callback) => {
    const { userId, channel, destination, payload, status = 'QUEUED' } = data || {};
    const safePayload = payload ? JSON.stringify(payload).slice(0, 2000) : null;

    const sql = `
        INSERT INTO notifications (user_id, channel, destination, payload, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [userId || null, channel, destination || null, safePayload, status], callback);
};

module.exports = {
    create
};
