const db = require('../db');

const paymentsReport = (req, res) => {
    const summarySql = `
        SELECT
            o.payment_method AS paymentMethod,
            o.payment_status AS paymentStatus,
            COUNT(*) AS orderCount,
            SUM(o.total) AS totalAmount
        FROM orders o
        GROUP BY o.payment_method, o.payment_status
        ORDER BY orderCount DESC
    `;

    const attemptsSql = `
        SELECT
            pa.id,
            pa.user_id AS userId,
            pa.order_id AS orderId,
            pa.provider,
            pa.method,
            pa.status,
            pa.amount,
            pa.currency,
            pa.failure_reason AS failureReason,
            pa.created_at AS createdAt,
            u.username,
            u.email
        FROM payment_attempts pa
        LEFT JOIN users u ON u.id = pa.user_id
        ORDER BY pa.created_at DESC
        LIMIT 100
    `;

    const reconcileSql = `
        SELECT o.id, o.user_id, o.total, o.payment_status, o.payment_method
        FROM orders o
        LEFT JOIN payment_attempts pa ON pa.order_id = o.id
        WHERE o.payment_status = 'PAID' AND pa.id IS NULL
        ORDER BY o.created_at DESC
        LIMIT 50
    `;

    const fraudSql = `
        SELECT
            fe.id,
            fe.user_id AS userId,
            fe.risk_score AS riskScore,
            fe.flags,
            fe.action,
            fe.ip_address AS ipAddress,
            fe.created_at AS createdAt,
            u.username,
            u.email
        FROM fraud_events fe
        LEFT JOIN users u ON u.id = fe.user_id
        ORDER BY fe.created_at DESC
        LIMIT 50
    `;

    db.query(summarySql, (summaryErr, summaryRows) => {
        if (summaryErr) {
            console.error('Payment summary error:', summaryErr);
            req.flash('error', 'Unable to load payment summary.');
            return res.redirect('/inventory');
        }

        db.query(attemptsSql, (attemptsErr, attemptRows) => {
            if (attemptsErr) {
                console.error('Payment attempts error:', attemptsErr);
                req.flash('error', 'Unable to load payment attempts.');
                return res.redirect('/inventory');
            }

            db.query(reconcileSql, (reconErr, reconRows) => {
                if (reconErr) {
                    console.error('Reconciliation error:', reconErr);
                    req.flash('error', 'Unable to load reconciliation report.');
                    return res.redirect('/inventory');
                }

                db.query(fraudSql, (fraudErr, fraudRows) => {
                    if (fraudErr) {
                        console.error('Fraud report error:', fraudErr);
                        req.flash('error', 'Unable to load fraud report.');
                        return res.redirect('/inventory');
                    }

                    return res.render('adminPaymentsReport', {
                        user: req.session.user,
                        summary: summaryRows || [],
                        attempts: attemptRows || [],
                        missingAttempts: reconRows || [],
                        fraudEvents: fraudRows || [],
                        messages: res.locals.messages,
                        errors: res.locals.errors
                    });
                });
            });
        });
    });
};

module.exports = {
    paymentsReport
};
