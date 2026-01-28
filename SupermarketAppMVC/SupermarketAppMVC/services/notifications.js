const path = require('path');
const ejs = require('ejs');
const Notification = require('../models/notification');
const Email = require('./email');

const sendNotification = async (data) => {
    const { userId, channel, destination, payload } = data || {};

    Notification.create({ userId, channel, destination, payload, status: 'SENT' }, (err) => {
        if (err) {
            console.error('Notification log failed:', err);
        }
    });

    if (channel === 'email') {
        if (!destination) {
            console.warn('[email] missing destination, skipping send.');
            return;
        }
        const message = payload && payload.message ? String(payload.message) : 'You have a new notification.';
        const subject = payload && payload.subject ? String(payload.subject) : 'Supermarket App notification';
        const html = payload && payload.html ? String(payload.html) : null;
        try {
            await Email.sendMail({
                to: destination,
                subject,
                text: message,
                html
            });
        } catch (error) {
            console.error('Email send failed:', error);
        }
    } else if (channel === 'sms') {
        console.log(`[sms] to ${destination}:`, payload);
    }
};

const formatMoney = (value, currencySymbol = '$') => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
        return `${currencySymbol}0.00`;
    }
    return `${currencySymbol}${amount.toFixed(2)}`;
};

const buildInvoiceEmail = (user, order, items) => {
    const currencyCode = order && order.currency_code ? String(order.currency_code) : 'SGD';
    const symbol = currencyCode === 'USD' ? '$' : '$';
    const invoiceNumber = order && order.invoice_number ? String(order.invoice_number) : `INV-${order && order.id ? order.id : 'N/A'}`;
    const createdAt = order && order.created_at ? new Date(order.created_at) : new Date();
    const deliveryFee = Number(order && order.delivery_fee ? order.delivery_fee : 0);

    const lineItems = (items || []).map((item) => {
        const name = item.productName || item.product_name || item.name || 'Item';
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const total = quantity * price;
        return {
            name: String(name),
            quantity: Number.isFinite(quantity) ? quantity : 0,
            price,
            total
        };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const total = Number(order && order.total ? order.total : subtotal + deliveryFee);

    const subject = `Invoice ${invoiceNumber} - Supermarket App`;
    const intro = `Hi ${user && user.username ? user.username : 'there'},`;

    const linesText = lineItems.map((item) =>
        `- ${item.name} x${item.quantity} @ ${formatMoney(item.price, symbol)} = ${formatMoney(item.total, symbol)}`
    ).join('\n');

    const text = [
        intro,
        '',
        `Thanks for your purchase! Here is your invoice.`,
        `Invoice: ${invoiceNumber}`,
        `Order ID: ${order && order.id ? order.id : 'N/A'}`,
        `Date: ${createdAt.toLocaleString()}`,
        '',
        'Items:',
        linesText || '- (No items found)',
        '',
        `Subtotal: ${formatMoney(subtotal, symbol)}`,
        `Delivery fee: ${formatMoney(deliveryFee, symbol)}`,
        `Total: ${formatMoney(total, symbol)}`,
        '',
        `Currency: ${currencyCode}`,
        '',
        'Thank you for shopping with us!'
    ].join('\n');

    const rowsHtml = lineItems.map((item) => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatMoney(item.price, symbol)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatMoney(item.total, symbol)}</td>
        </tr>
    `).join('');

    const html = `
        <div style="font-family:Arial, sans-serif; color:#222;">
            <h2 style="margin:0 0 8px;">Supermarket App Invoice</h2>
            <p style="margin:0 0 16px;">${intro}</p>
            <p style="margin:0 0 16px;">Thanks for your purchase! Here is your invoice.</p>
            <table style="margin-bottom:16px;">
                <tr><td><strong>Invoice</strong></td><td style="padding-left:8px;">${invoiceNumber}</td></tr>
                <tr><td><strong>Order ID</strong></td><td style="padding-left:8px;">${order && order.id ? order.id : 'N/A'}</td></tr>
                <tr><td><strong>Date</strong></td><td style="padding-left:8px;">${createdAt.toLocaleString()}</td></tr>
                <tr><td><strong>Currency</strong></td><td style="padding-left:8px;">${currencyCode}</td></tr>
            </table>
            <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                <thead>
                    <tr>
                        <th style="text-align:left; padding:8px; border-bottom:2px solid #333;">Item</th>
                        <th style="text-align:center; padding:8px; border-bottom:2px solid #333;">Qty</th>
                        <th style="text-align:right; padding:8px; border-bottom:2px solid #333;">Price</th>
                        <th style="text-align:right; padding:8px; border-bottom:2px solid #333;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml || `<tr><td colspan="4" style="padding:8px;">No items found.</td></tr>`}
                </tbody>
            </table>
            <table style="width:100%; max-width:300px; margin-left:auto;">
                <tr><td style="padding:4px 0;">Subtotal</td><td style="padding:4px 0; text-align:right;">${formatMoney(subtotal, symbol)}</td></tr>
                <tr><td style="padding:4px 0;">Delivery fee</td><td style="padding:4px 0; text-align:right;">${formatMoney(deliveryFee, symbol)}</td></tr>
                <tr><td style="padding:6px 0; font-weight:bold;">Total</td><td style="padding:6px 0; text-align:right; font-weight:bold;">${formatMoney(total, symbol)}</td></tr>
            </table>
            <p style="margin-top:24px;">Thank you for shopping with us!</p>
        </div>
    `;

    return { subject, text, html };
};

const buildRefundInvoiceEmail = async (user, refund, refundItems, orderTotal, refundedToDate, remaining) => {
    const invoiceNumber = refund && refund.invoiceNumber ? String(refund.invoiceNumber) : 'REFUND';
    const subject = `Refund Invoice ${invoiceNumber} - Supermarket App`;
    const intro = `Hi ${user && user.username ? user.username : 'there'},`;

    const safeRefundItems = Array.isArray(refundItems) ? refundItems : [];
    const textLines = safeRefundItems.map((item) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const lineTotal = qty * unitPrice;
        const name = item.productName || `Product #${item.productId || ''}`;
        return `- ${name} x${qty} @ $${unitPrice.toFixed(2)} = $${lineTotal.toFixed(2)}`;
    });

    const text = [
        intro,
        '',
        'Your refund has been processed. Here is your refund invoice.',
        `Invoice: ${invoiceNumber}`,
        `Refund Amount: $${Number(refund.amount || 0).toFixed(2)} ${refund.currency || ''}`,
        `Refund Status: ${refund.status || 'UNKNOWN'}`,
        `Refund Date: ${refund.createdAt ? new Date(refund.createdAt).toLocaleString() : '-'}`,
        '',
        'Refund Items:',
        textLines.length ? textLines.join('\n') : '- No refund items recorded.',
        '',
        `Order Total: $${Number(orderTotal || 0).toFixed(2)}`,
        `Refunded Total (to date): $${Number(refundedToDate || 0).toFixed(2)}`,
        `Remaining Balance: $${Number(remaining || 0).toFixed(2)}`,
        '',
        'Thank you for shopping with us!'
    ].join('\n');

    const templatePath = path.join(__dirname, '..', 'views', 'emails', 'refundInvoiceEmail.ejs');
    const html = await ejs.renderFile(templatePath, {
        refund,
        refundItems: safeRefundItems,
        orderTotal,
        refundedToDate,
        remaining
    });

    return { subject, text, html };
};

const sendPaymentUpdate = (user, order, status, items) => {
    if (!user) {
        return;
    }

    const basePayload = {
        orderId: order ? order.id : null,
        status,
        amount: order ? order.total : null
    };

    if (user.email) {
        const isCompleted = status === 'completed' || status === 'paid' || status === 'success';
        const invoice = isCompleted && Array.isArray(items) ? buildInvoiceEmail(user, order || {}, items) : null;
        sendNotification({
            userId: user.id,
            channel: 'email',
            destination: user.email,
            payload: invoice
                ? { ...basePayload, message: invoice.text, subject: invoice.subject, html: invoice.html }
                : { ...basePayload, message: `Payment ${status} for order #${basePayload.orderId}.` }
        });
    }

    if (user.contact) {
        sendNotification({
            userId: user.id,
            channel: 'sms',
            destination: user.contact,
            payload: { ...basePayload, message: `Order #${basePayload.orderId} payment ${status}.` }
        });
    }
};

const sendRefundInvoice = async (user, refund, refundItems, orderTotal, refundedToDate, remaining) => {
    if (!user || !user.email) {
        return;
    }

    try {
        const invoice = await buildRefundInvoiceEmail(user, refund || {}, refundItems, orderTotal, refundedToDate, remaining);
        await sendNotification({
            userId: user.id,
            channel: 'email',
            destination: user.email,
            payload: {
                message: invoice.text,
                subject: invoice.subject,
                html: invoice.html
            }
        });
    } catch (error) {
        console.error('Refund invoice email failed:', error);
    }
};

module.exports = {
    sendNotification,
    sendPaymentUpdate,
    sendRefundInvoice
};
