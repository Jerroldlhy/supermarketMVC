const netsService = require('../services/nets');
const Cart = require('../models/cart');
const Order = require('../models/order');
const PaymentAttempt = require('../models/paymentAttempt');
const Notifications = require('../services/notifications');

const DELIVERY_FEE = 1.5;

const computeDeliveryFee = (user, deliveryMethod) => {
    if (deliveryMethod !== 'delivery') {
        return 0;
    }

    if (user && (user.free_delivery || user.free_delivery === 1)) {
        return 0;
    }

    return DELIVERY_FEE;
};

const sanitiseDeliveryAddress = (address) => {
    if (!address) {
        return null;
    }
    const trimmed = address.trim();
    return trimmed.length ? trimmed.slice(0, 255) : null;
};

const resolveCheckoutDetails = (req) => {
    const checkout = req.session.checkout || {};
    const deliveryMethod = checkout.deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
    const fallbackAddress = req.session.user ? req.session.user.address : null;
    const deliveryAddress = deliveryMethod === 'delivery'
        ? sanitiseDeliveryAddress(checkout.deliveryAddress || fallbackAddress)
        : null;
    const deliveryFee = computeDeliveryFee(req.session.user, deliveryMethod);

    return {
        deliveryMethod,
        deliveryAddress,
        deliveryFee
    };
};

const readStatusFlag = (status) => {
    if (!status) return { pending: true };

    const responseCode = String(status.response_code || '');
    const txnStatus = Number(status.txn_status);

    if (responseCode === '00' && txnStatus === 1) {
        return { success: true };
    }

    if (responseCode && responseCode !== '00') {
        return { fail: true, error: status.error_message || 'Transaction failed.' };
    }

    if (Number.isFinite(txnStatus) && txnStatus > 1) {
        return { fail: true, error: status.error_message || 'Transaction failed.' };
    }

    return { pending: true };
};

const queryTxnStatus = async (txnRetrievalRef, courseInitId) => {
    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is not available.');
    }

    const payload = {
        txn_retrieval_ref: txnRetrievalRef
    };

    if (courseInitId) {
        payload.course_init_id = courseInitId;
    }

    const response = await fetch(
        'https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/query',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.API_KEY,
                'project-id': process.env.PROJECT_ID
            },
            body: JSON.stringify(payload)
        }
    );

    const data = await response.json();
    return data && data.result ? data.result.data : null;
};

module.exports = {
    requestQr: netsService.generateQrCode,

    async streamStatus(req, res) {
        const txnRetrievalRef = req.params.txnRetrievalRef;
        const courseInitId = req.query.course_init_id || '';

        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.flushHeaders();

        let closed = false;
        const interval = setInterval(async () => {
            try {
                const status = await queryTxnStatus(txnRetrievalRef, courseInitId);
                const flag = readStatusFlag(status);

                res.write(`data: ${JSON.stringify(flag)}\n\n`);

                if (flag.success || flag.fail) {
                    clearInterval(interval);
                    if (!closed) res.end();
                }
            } catch (err) {
                res.write(`data: ${JSON.stringify({ fail: true })}\n\n`);
                clearInterval(interval);
                if (!closed) res.end();
            }
        }, 3000);

        req.on('close', () => {
            closed = true;
            clearInterval(interval);
        });
    },

    success(req, res) {
        const txnRef = String(req.query.txn_retrieval_ref || '');
        if (!req.session.netsActive || !req.session.netsTxnRetrievalRef || req.session.netsTxnRetrievalRef !== txnRef) {
            return res.redirect('/cart/payment');
        }

        req.session.payment = { method: 'nets' };
        req.session.netsActive = false;
        req.session.netsTxnRetrievalRef = null;

        const userId = req.session.user.id;
        const checkoutDetails = resolveCheckoutDetails(req);

        const payment = req.session.payment || {};
        const paymentMethod = typeof payment.method === 'string' ? payment.method : null;
        const pendingOrderId = req.session.pendingOrderId;

        Cart.getCart(userId, (err, cartItems) => {
            if (err) {
                console.error('Error loading cart for NETS checkout:', err);
                req.flash('error', 'Unable to complete NETS checkout.');
                return res.redirect('/cart');
            }

            if (!cartItems.length) {
                req.flash('error', 'Your cart is empty.');
                return res.redirect('/cart');
            }

            const handleSuccess = (orderId) => {
                Cart.clearCart(userId, (clearErr) => {
                    if (clearErr) {
                        console.error('Error clearing cart after NETS checkout:', clearErr);
                    }

                    req.session.payment = null;
                    req.session.checkout = null;
                    req.session.paymentPending = null;
                    req.session.pendingOrderId = null;
                    PaymentAttempt.updateStatusByProviderOrder(txnRef, 'SUCCEEDED', null, () => {});
                    Order.findById(orderId, (findErr, rows) => {
                        if (!findErr && rows && rows[0]) {
                            Order.findItemsByOrderIds([orderId], (itemsErr, itemRows) => {
                                const items = (!itemsErr && itemRows) ? itemRows : [];
                                Notifications.sendPaymentUpdate(req.session.user, rows[0], 'completed', items);
                            });
                        }
                    });

                    return res.render('netsTxnSuccessStatus', {
                        message: 'Payment successful.',
                        orderId: orderId || null
                    });
                });
            };

            if (pendingOrderId) {
                return Order.finalizePendingOrder(pendingOrderId, {
                    paymentMethod,
                    paypalCaptureId: null,
                    paymentStatus: 'PAID'
                }, (orderErr, result) => {
                    if (orderErr) {
                        console.error('Error finalizing NETS order:', orderErr);
                        req.flash('error', 'Unable to complete NETS checkout.');
                        return res.redirect('/cart');
                    }
                    return handleSuccess(result && result.orderId ? result.orderId : pendingOrderId);
                });
            }

            Order.create(userId, cartItems, {
                deliveryMethod: checkoutDetails.deliveryMethod,
                deliveryAddress: checkoutDetails.deliveryAddress,
                deliveryFee: checkoutDetails.deliveryFee,
                paymentMethod,
                paypalCaptureId: null,
                paymentStatus: 'PAID'
            }, (orderErr, result) => {
                if (orderErr) {
                    console.error('Error creating NETS order:', orderErr);
                    req.flash('error', 'Unable to complete NETS checkout.');
                    return res.redirect('/cart');
                }
                return handleSuccess(result && result.orderId ? result.orderId : null);
            });
        });
    },

    fail(req, res) {
        const txnRef = String(req.query.txn_retrieval_ref || '');
        if (!req.session.netsActive || !req.session.netsTxnRetrievalRef || req.session.netsTxnRetrievalRef !== txnRef) {
            return res.redirect('/cart/payment');
        }

        const message = req.query.message || 'Transaction failed.';
        const amount = req.session.netsLastAmount || null;
        const pendingOrderId = req.session.pendingOrderId;
        req.session.netsActive = false;
        req.session.netsTxnRetrievalRef = null;
        if (pendingOrderId) {
            Order.updatePaymentStatus(pendingOrderId, 'FAILED', () => {
                Order.incrementPaymentAttempts(pendingOrderId, message, () => {});
                req.session.pendingOrderId = null;
                req.session.paymentPending = null;
            });
        }
        PaymentAttempt.updateStatusByProviderOrder(txnRef, 'FAILED', message, () => {});
        Notifications.sendPaymentUpdate(req.session.user, { id: pendingOrderId, total: null }, 'failed');
        return res.render('netsTxnFailStatus', { message, amount });
    }
};
