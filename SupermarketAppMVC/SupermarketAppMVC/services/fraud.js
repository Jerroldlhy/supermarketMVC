const db = require('../db');
const PaymentAttempt = require('../models/paymentAttempt');

const MAX_ATTEMPTS_PER_WINDOW = Number(process.env.FRAUD_MAX_ATTEMPTS || 5);
const MAX_FAILED_PER_WINDOW = Number(process.env.FRAUD_MAX_FAILED || 3);
const WINDOW_MINUTES = Number(process.env.FRAUD_WINDOW_MINUTES || 10);
const BLOCK_ON_RISK = String(process.env.FRAUD_BLOCK || 'true').toLowerCase() === 'true';
const MAX_AMOUNT = Number(process.env.FRAUD_MAX_AMOUNT || 0);

const assessPaymentAttempt = (req, userId, context, callback) => {
    if (typeof context === 'function') {
        callback = context;
        context = {};
    }
    const details = context || {};
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 45);

    PaymentAttempt.countRecentAttempts({ userId, ipAddress, minutes: WINDOW_MINUTES }, (err, count) => {
        if (err) {
            return callback(err, { action: 'allow', riskScore: 0, flags: [] });
        }

        PaymentAttempt.countRecentFailures({ userId, ipAddress, minutes: WINDOW_MINUTES }, (failErr, failedCount) => {
            if (failErr) {
                return callback(failErr, { action: 'allow', riskScore: 0, flags: [] });
            }

            const flags = [];
            let riskScore = 0;

            if (count >= MAX_ATTEMPTS_PER_WINDOW) {
                flags.push('velocity');
                riskScore += 70;
            }

            if (failedCount >= MAX_FAILED_PER_WINDOW) {
                flags.push('rapid_failures');
                riskScore += 50;
            }

            const amount = Number(details.amount || 0);
            if (MAX_AMOUNT > 0 && Number.isFinite(amount) && amount >= MAX_AMOUNT) {
                flags.push('high_amount');
                riskScore += 40;
            }

            const action = (riskScore >= 70 && BLOCK_ON_RISK)
                ? 'block'
                : (riskScore >= 40 ? 'review' : 'allow');

            const sql = `
                INSERT INTO fraud_events (user_id, risk_score, flags, action, ip_address)
                VALUES (?, ?, ?, ?, ?)
            `;
            db.query(sql, [userId || null, riskScore, flags.join(','), action, ipAddress], () => {
                return callback(null, { action, riskScore, flags, ipAddress });
            });
        });
    });
};

module.exports = {
    assessPaymentAttempt
};
