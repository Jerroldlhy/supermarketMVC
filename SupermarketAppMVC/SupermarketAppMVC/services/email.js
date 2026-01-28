const nodemailer = require('nodemailer');

let cachedTransporter = null;

const buildTransporter = () => {
    if (cachedTransporter) {
        return cachedTransporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 0);
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
        return null;
    }

    cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });

    return cachedTransporter;
};

const sendMail = async ({ to, subject, text, html, from }) => {
    const transporter = buildTransporter();
    if (!transporter) {
        throw new Error('SMTP is not configured.');
    }

    const sender = from || process.env.SMTP_FROM || process.env.SMTP_USER;
    const payload = {
        from: sender,
        to,
        subject: subject || 'Supermarket App notification',
        text,
        html
    };

    return transporter.sendMail(payload);
};

module.exports = {
    sendMail
};
