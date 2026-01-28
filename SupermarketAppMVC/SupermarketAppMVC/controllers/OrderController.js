const Order = require('../models/order');
const User = require('../models/user');
const Cart = require('../models/cart');

const DELIVERY_FEE = 1.5;
const DELIVERY_STATUSES = ['packed', 'shipped', 'in_transit', 'received'];
const paypalTracking = require('../services/paypalTracking');
const { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES, normaliseCurrency, getSymbol, convertAmount, getExchangeRate } = require('../services/currency');
const Notifications = require('../services/notifications');

const normaliseDeliveryStatus = (status) => {
    const value = typeof status === 'string' ? status.toLowerCase() : '';
    return DELIVERY_STATUSES.includes(value) ? value : null;
};

const normalisePrice = (value) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
    }
    return Number(parsed.toFixed(2));
};

const decorateProduct = (product) => {
    if (!product) {
        return product;
    }

    const basePrice = normalisePrice(product.price);
    const discountPercentage = Math.min(
        100,
        Math.max(0, Number.parseFloat(product.discountPercentage) || 0)
    );
    const hasDiscount = discountPercentage > 0;
    const offerMessage = product.offerMessage ? String(product.offerMessage).trim() : null;
    const effectivePrice = hasDiscount
        ? normalisePrice(basePrice * (1 - discountPercentage / 100))
        : basePrice;

    return {
        ...product,
        price: basePrice,
        discountPercentage,
        offerMessage,
        effectivePrice,
        hasDiscount
    };
};

const computeDeliveryFee = (user, deliveryMethod, waiveFee = false) => {
    if (deliveryMethod !== 'delivery') {
        return 0;
    }

    if (waiveFee) {
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

const resolveCheckoutDetails = (req, fallbackAddress) => {
    const checkout = req.session.checkout || {};
    const deliveryMethod = checkout.deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
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

const resolveCurrency = (req) => {
    const sessionCurrency = req.session.currency || DEFAULT_CURRENCY;
    return normaliseCurrency(sessionCurrency);
};

/**
 * Persist delivery details and redirect to the payment step.
 */
const startCheckout = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        req.flash('error', 'Only shoppers can proceed to payment.');
        return res.redirect('/cart');
    }

    const requestedMethod = String(req.body.deliveryMethodOverride || req.body.deliveryMethod || '').toLowerCase();
    const deliveryMethod = requestedMethod === 'delivery' ? 'delivery' : 'pickup';
    const providedAddress = sanitiseDeliveryAddress(req.body.deliveryAddress) || req.session.user.address;
    const deliveryAddress = deliveryMethod === 'delivery' ? sanitiseDeliveryAddress(providedAddress) : null;

    if (deliveryMethod === 'delivery' && !deliveryAddress) {
        req.flash('error', 'Please provide a delivery address.');
        return res.redirect('/cart');
    }

    req.session.checkout = {
        deliveryMethod,
        deliveryAddress
    };

    return req.session.save(() => res.redirect('/cart/payment'));
};

/**
 * Show payment options for the current cart.
 */
const payment = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        req.flash('error', 'Only shoppers can access payment.');
        return res.redirect('/cart');
    }

    if (!req.session.checkout) {
        req.flash('error', 'Please select delivery or pickup before payment.');
        return res.redirect('/cart');
    }

    const userId = req.session.user.id;
    const fallbackAddress = req.session.user ? req.session.user.address : null;
    const checkoutDetails = resolveCheckoutDetails(req, fallbackAddress);
    const selectedCurrency = resolveCurrency(req);
    const currencySymbol = getSymbol(selectedCurrency);
    const exchangeRate = getExchangeRate(DEFAULT_CURRENCY, selectedCurrency);

    Cart.getCart(userId, (cartErr, cartItems) => {
        if (cartErr) {
            console.error('Error loading cart for payment:', cartErr);
            req.flash('error', 'Unable to load payment options.');
            return res.redirect('/cart');
        }

        const subtotal = (cartItems || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = Number((subtotal + checkoutDetails.deliveryFee).toFixed(2));
        const convertedTotal = convertAmount(total, DEFAULT_CURRENCY, selectedCurrency);
        const convertedSubtotal = convertAmount(subtotal, DEFAULT_CURRENCY, selectedCurrency);
        const convertedDeliveryFee = convertAmount(checkoutDetails.deliveryFee, DEFAULT_CURRENCY, selectedCurrency);

        const renderPayment = () => {
            if (cartItems && cartItems.length) {
                req.session.paymentPending = { active: true, updatedAt: new Date().toISOString() };
            } else {
                req.session.paymentPending = null;
                req.session.pendingOrderId = null;
            }

            res.render('payment', {
                user: req.session.user,
                cart: cartItems,
                subtotal: Number(subtotal.toFixed(2)),
                deliveryFee: checkoutDetails.deliveryFee,
                total,
                deliveryMethod: checkoutDetails.deliveryMethod,
                deliveryAddress: checkoutDetails.deliveryAddress,
                currency: selectedCurrency,
                currencySymbol,
                exchangeRate,
                convertedSubtotal,
                convertedDeliveryFee,
                convertedTotal,
                availableCurrencies: SUPPORTED_CURRENCIES,
                PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
                messages: res.locals.messages,
                errors: res.locals.errors
            });
        };

        if (!cartItems || cartItems.length === 0) {
            return renderPayment();
        }

        const pendingOrderId = req.session.pendingOrderId;

        const createPendingOrder = () => {
            Order.createPending(userId, cartItems, {
                deliveryMethod: checkoutDetails.deliveryMethod,
                deliveryAddress: checkoutDetails.deliveryAddress,
                deliveryFee: checkoutDetails.deliveryFee,
                deliveryStatus: 'packed',
                paymentStatus: 'PENDING',
                currencyCode: selectedCurrency,
                exchangeRate
            }, (pendingErr, pendingResult) => {
                if (pendingErr) {
                    console.error('Error creating pending order:', pendingErr);
                    req.flash('error', 'Unable to prepare your payment. Please try again.');
                    return res.redirect('/cart');
                }

                req.session.pendingOrderId = pendingResult.orderId;
                return renderPayment();
            });
        };

        if (!pendingOrderId) {
            return createPendingOrder();
        }

        Order.syncPendingOrder(pendingOrderId, userId, cartItems, {
            deliveryMethod: checkoutDetails.deliveryMethod,
            deliveryAddress: checkoutDetails.deliveryAddress,
            deliveryFee: checkoutDetails.deliveryFee,
            deliveryStatus: 'packed',
            currencyCode: selectedCurrency,
            exchangeRate
        }, (syncErr) => {
            if (syncErr) {
                req.session.pendingOrderId = null;
                return createPendingOrder();
            }
            return renderPayment();
        });
    });
};

/**
 * Handle checkout and order creation.
 */
const checkout = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        req.flash('error', 'Only shoppers can complete checkout.');
        return res.redirect('/cart');
    }

    const userId = req.session.user.id;
    const payment = req.session.payment || {};

    if (!payment.method) {
        req.flash('error', 'Please complete payment before checking out.');
        return res.redirect('/cart/payment');
    }

    if (!req.session.checkout) {
        req.flash('error', 'Please select delivery or pickup before payment.');
        return res.redirect('/cart');
    }

    const fallbackAddress = req.session.user ? req.session.user.address : null;
    const checkoutDetails = resolveCheckoutDetails(req, fallbackAddress);
    const paymentMethod = typeof payment.method === 'string' ? payment.method : null;
    const paymentReference = typeof payment.captureId === 'string' ? payment.captureId : null;
    const pendingOrderId = req.session.pendingOrderId;
    const selectedCurrency = resolveCurrency(req);
    const exchangeRate = getExchangeRate(DEFAULT_CURRENCY, selectedCurrency);

    if (checkoutDetails.deliveryMethod === 'delivery' && !checkoutDetails.deliveryAddress) {
        req.flash('error', 'Please provide a delivery address.');
        return res.redirect('/cart');
    }

    Cart.getCart(userId, (cartErr, cartItems) => {
        if (cartErr) {
            console.error('Error loading cart for checkout:', cartErr);
            req.flash('error', 'Unable to load your cart right now.');
            return res.redirect('/cart');
        }

        if (!cartItems.length) {
            req.flash('error', 'Your cart is empty.');
            return res.redirect('/cart');
        }

        const handleSuccess = () => {
            Cart.clearCart(userId, (clearErr) => {
                if (clearErr) {
                    console.error('Error clearing cart after checkout:', clearErr);
                }
                req.session.payment = null;
                req.session.checkout = null;
                req.session.paymentPending = null;
                req.session.pendingOrderId = null;
                req.flash('success', `Thanks for your purchase! ${checkoutDetails.deliveryMethod === 'delivery' ? 'We will deliver your order shortly.' : 'Pickup details will be shared soon.'}`);
                return res.redirect('/orders/history');
            });
        };

        const handleError = (error) => {
            console.error('Error during checkout:', error);
            req.flash('error', error.message || 'Unable to complete checkout. Please try again.');
            return res.redirect('/cart');
        };

        if (pendingOrderId) {
            return Order.finalizePendingOrder(pendingOrderId, {
                paymentMethod,
                paypalCaptureId: paymentReference,
                paymentStatus: 'PAID'
            }, (error) => {
                if (error) {
                    return handleError(error);
                }
                Order.findById(pendingOrderId, (findErr, rows) => {
                    if (!findErr && rows && rows[0]) {
                        Order.findItemsByOrderIds([pendingOrderId], (itemsErr, itemRows) => {
                            const items = (!itemsErr && itemRows) ? itemRows : [];
                            Notifications.sendPaymentUpdate(req.session.user, rows[0], 'completed', items);
                        });
                    }
                });
                return handleSuccess();
            });
        }

        Order.create(userId, cartItems, {
            deliveryMethod: checkoutDetails.deliveryMethod,
            deliveryAddress: checkoutDetails.deliveryAddress,
            deliveryFee: checkoutDetails.deliveryFee,
            paymentMethod,
            paypalCaptureId: paymentReference,
            paymentStatus: 'PAID',
            currencyCode: selectedCurrency,
            exchangeRate
        }, (error) => {
            if (error) {
                return handleError(error);
            }
            Order.findByUser(userId, (findErr, rows) => {
                if (!findErr && rows && rows[0]) {
                    const latestOrder = rows[0];
                    Order.findItemsByOrderIds([latestOrder.id], (itemsErr, itemRows) => {
                        const items = (!itemsErr && itemRows) ? itemRows : [];
                        Notifications.sendPaymentUpdate(req.session.user, latestOrder, 'completed', items);
                    });
                }
            });
            return handleSuccess();
        });
    });
};

/**
 * Display purchase history for the logged-in user.
 */
const history = (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'Please log in to view purchases.');
        return res.redirect('/login');
    }

    const resolvePaymentReminder = (callback) => {
        const pendingOrderId = req.session.pendingOrderId;
        if (!pendingOrderId) {
            return callback(false);
        }

        const userId = req.session.user.id;
        Order.findByIdForUser(pendingOrderId, userId, (orderErr, order) => {
            if (orderErr || !order) {
                req.session.pendingOrderId = null;
                req.session.paymentPending = null;
                return callback(false);
            }

            const status = String(order.payment_status || '').toUpperCase();
            if (status !== 'PENDING') {
                req.session.pendingOrderId = null;
                req.session.paymentPending = null;
                return callback(false);
            }

            return callback(true);
        });
    };

    resolvePaymentReminder((hasPendingPayment) => {
        Order.findByUser(req.session.user.id, (ordersError, orderRows) => {
            if (ordersError) {
                console.error('Error fetching purchase history:', ordersError);
                req.flash('error', 'Unable to load purchase history.');
                return res.redirect('/shopping');
            }

            const orders = (orderRows || []).map((order) => ({
                ...order,
                delivery_method: order.delivery_method || 'pickup',
                delivery_address: order.delivery_address,
                delivery_fee: Number(order.delivery_fee || 0)
            }));
            const orderIds = orders.map(order => order.id);

            Order.findItemsByOrderIds(orderIds, (itemsError, itemRows) => {
                if (itemsError) {
                    console.error('Error fetching order items:', itemsError);
                    req.flash('error', 'Unable to load purchase history.');
                    return res.redirect('/shopping');
                }

                const itemsByOrder = orderIds.reduce((acc, id) => {
                    acc[id] = [];
                    return acc;
                }, {});

                const normalisedItems = (itemRows || []).map((item) => {
                    const isDeleted = item.is_deleted === 1 || /^Deleted product /.test(item.productName || '');
                    return {
                        ...item,
                        isDeleted,
                        image: isDeleted ? null : item.image
                    };
                });

                normalisedItems.forEach((item) => {
                    if (!itemsByOrder[item.order_id]) {
                        itemsByOrder[item.order_id] = [];
                    }
                    itemsByOrder[item.order_id].push(item);
                });

                Order.getBestSellers(4, (bestErr, bestRows) => {
                    if (bestErr) {
                        console.error('Error fetching best sellers:', bestErr);
                    }

                    res.render('orderHistory', {
                        user: req.session.user,
                        orders,
                        orderItems: itemsByOrder,
                        bestSellers: (bestRows || []).map(decorateProduct),
                        messages: res.locals.messages,
                        errors: res.locals.errors,
                        paymentReminder: hasPendingPayment
                    });
                });
            });
        });
    });
};

const printOrder = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) {
        req.flash('error', 'Invalid order selected.');
        return res.redirect('/orders/history');
    }

    Order.findById(orderId, (orderErr, orderRows) => {
        if (orderErr || !orderRows || !orderRows.length) {
            req.flash('error', 'Order not found.');
            return res.redirect('/orders/history');
        }

        const order = orderRows[0];
        const sessionUser = req.session.user;
        const isOwner = sessionUser && sessionUser.id === order.user_id;
        const isAdmin = sessionUser && sessionUser.role === 'admin';

        if (!isOwner && !isAdmin) {
            req.flash('error', 'You are not authorised to view this receipt.');
            return res.redirect('/orders/history');
        }

        Order.findItemsByOrderIds([orderId], (itemsErr, itemRows) => {
            if (itemsErr) {
                req.flash('error', 'Unable to load order items.');
                return res.redirect('/orders/history');
            }

            const normalisedItems = (itemRows || []).map((item) => {
                const isDeleted = item.is_deleted === 1 || /^Deleted product /.test(item.productName || '');
                return {
                    ...item,
                    isDeleted,
                    image: isDeleted ? null : item.image
                };
            });

            res.render('orderReceipt', {
                user: req.session.user,
                order: {
                    ...order,
                    delivery_method: order.delivery_method || 'pickup',
                    delivery_address: order.delivery_address,
                    delivery_fee: Number(order.delivery_fee || 0)
                },
                items: normalisedItems
            });
        });
    });
};

const listAllDeliveries = (req, res) => {
    Order.findAllWithUsers((orderErr, orderRows) => {
        if (orderErr) {
            console.error('Error fetching deliveries:', orderErr);
            req.flash('error', 'Unable to load deliveries.');
            return res.redirect('/inventory');
        }

        const orders = orderRows || [];
        const orderIds = orders.map(order => order.id);

        Order.findItemsByOrderIds(orderIds, (itemsErr, itemRows) => {
            if (itemsErr) {
                console.error('Error fetching delivery items:', itemsErr);
                req.flash('error', 'Unable to load deliveries.');
                return res.redirect('/inventory');
            }

            const itemsByOrder = orderIds.reduce((acc, id) => {
                acc[id] = [];
                return acc;
            }, {});

            (itemRows || []).forEach((item) => {
                if (!itemsByOrder[item.order_id]) {
                    itemsByOrder[item.order_id] = [];
                }
                itemsByOrder[item.order_id].push(item);
            });

            res.render('adminDeliveries', {
                user: req.session.user,
                orders,
                orderItems: itemsByOrder,
                messages: res.locals.messages,
                errors: res.locals.errors
            });
        });
    });
};

const updateDeliveryDetails = (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) {
        req.flash('error', 'Invalid order selected.');
        return res.redirect(req.session.user && req.session.user.role === 'admin' ? '/admin/deliveries' : '/orders/history');
    }

    Order.findById(orderId, (orderErr, orderRows) => {
        if (orderErr) {
            console.error('Error locating order for delivery update:', orderErr);
            req.flash('error', 'Unable to update delivery.');
            return res.redirect(req.session.user && req.session.user.role === 'admin' ? '/admin/deliveries' : '/orders/history');
        }

        if (!orderRows || !orderRows.length) {
            req.flash('error', 'Order not found.');
            return res.redirect(req.session.user && req.session.user.role === 'admin' ? '/admin/deliveries' : '/orders/history');
        }

        const order = orderRows[0];
        const sessionUser = req.session.user;
        const isAdmin = sessionUser && sessionUser.role === 'admin';
        const isOwner = sessionUser && sessionUser.id === order.user_id;

        // Only admins can update delivery details; shoppers can only view
        if (!isAdmin) {
            req.flash('error', 'Only administrators can update delivery details.');
            return res.redirect('/orders/history');
        }

        if (order.delivery_status === 'received') {
            req.flash('error', 'Delivery is already confirmed and cannot be changed.');
            return res.redirect('/admin/deliveries');
        }

        User.findById(order.user_id, (userErr, userRows) => {
            if (userErr) {
                console.error('Error fetching user for delivery update:', userErr);
                req.flash('error', 'Unable to update delivery.');
                return res.redirect(isAdmin ? '/admin/deliveries' : '/orders/history');
            }

            const account = userRows && userRows[0];
            const deliveryMethod = req.body.deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
            const requestedAddress = sanitiseDeliveryAddress(req.body.deliveryAddress) || (account ? account.address : null);
            const waiveFee = isAdmin && (req.body.waiveFee === 'on' || req.body.waiveFee === 'true');
            const deliveryFee = computeDeliveryFee(account, deliveryMethod, waiveFee);
            const redirectPath = isAdmin ? '/admin/deliveries' : '/orders/history';
            const deliveryStatus = normaliseDeliveryStatus(req.body.deliveryStatus);

            if (req.body.deliveryStatus && !deliveryStatus) {
                req.flash('error', 'Invalid delivery status.');
                return res.redirect(redirectPath);
            }
            if (isAdmin && deliveryStatus === 'received') {
                req.flash('error', 'Only shoppers can confirm delivery.');
                return res.redirect(redirectPath);
            }

            if (deliveryMethod === 'delivery' && !requestedAddress) {
                req.flash('error', 'Delivery address is required.');
                return res.redirect(redirectPath);
            }

            Order.updateDelivery(orderId, {
                deliveryMethod,
                deliveryAddress: deliveryMethod === 'delivery' ? requestedAddress : null,
                deliveryFee,
                deliveryStatus
            }, (updateErr) => {
                if (updateErr) {
                    console.error('Error updating delivery details:', updateErr);
                    req.flash('error', 'Unable to update delivery right now.');
                    return res.redirect(redirectPath);
                }

                req.flash('success', 'Delivery details updated.');
                return res.redirect(redirectPath);
            });
        });
    });
};

const addTracking = (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) {
        req.flash('error', 'Invalid order selected.');
        return res.redirect('/admin/deliveries');
    }

    Order.findById(orderId, async (orderErr, orderRows) => {
        if (orderErr || !orderRows || !orderRows.length) {
            req.flash('error', 'Order not found.');
            return res.redirect('/admin/deliveries');
        }

        const order = orderRows[0];
        const isPaypal = String(order.payment_method || '').toLowerCase() === 'paypal';
        const captureId = order.paypal_capture_id || order.paypalCaptureId;

        if (!isPaypal || !captureId) {
            req.flash('error', 'PayPal capture ID not found for this order.');
            return res.redirect('/admin/deliveries');
        }

        const trackingNumber = String(req.body.trackingNumber || '').trim();
        const carrier = String(req.body.carrier || '').trim();
        const carrierOther = String(req.body.carrierOther || '').trim();

        if (!trackingNumber) {
            req.flash('error', 'Tracking number is required.');
            return res.redirect('/admin/deliveries');
        }
        if (!carrier) {
            req.flash('error', 'Carrier is required.');
            return res.redirect('/admin/deliveries');
        }

        const deliveryStatus = String(order.delivery_status || '').toLowerCase();
        const paypalStatus = deliveryStatus === 'received'
            ? 'DELIVERED'
            : (deliveryStatus === 'in_transit' ? 'IN_TRANSIT' : 'SHIPPED');

        const payload = {
            trackers: [
                {
                    transaction_id: String(captureId),
                    status: paypalStatus,
                    tracking_number: trackingNumber,
                    carrier: carrier,
                    carrier_name_other: carrier === 'OTHER' ? (carrierOther || 'Other') : undefined,
                    notify_buyer: true
                }
            ]
        };

        try {
            const result = await paypalTracking.addTrackingBatch(payload);
            if (result.status >= 200 && result.status < 300) {
                req.flash('success', 'Tracking sent to PayPal.');
                return res.redirect('/admin/deliveries');
            }

            const errors = result.data && result.data.errors;
            const msg = Array.isArray(errors) && errors.length
                ? errors[0].message || 'PayPal tracking failed.'
                : 'PayPal tracking failed.';
            req.flash('error', msg);
            return res.redirect('/admin/deliveries');
        } catch (error) {
            console.error('PayPal tracking error:', error);
            req.flash('error', 'PayPal tracking failed.');
            return res.redirect('/admin/deliveries');
        }
    });
};

const confirmDelivery = (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'Please log in to confirm delivery.');
        return res.redirect('/login');
    }

    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) {
        req.flash('error', 'Invalid order selected.');
        return res.redirect('/orders/history');
    }

    const userId = req.session.user.id;
    Order.findByIdForUser(orderId, userId, (orderErr, order) => {
        if (orderErr) {
            console.error('Error loading order for delivery confirmation:', orderErr);
            req.flash('error', 'Unable to confirm delivery.');
            return res.redirect('/orders/history');
        }

        if (!order) {
            req.flash('error', 'Order not found.');
            return res.redirect('/orders/history');
        }

        if (order.delivery_method !== 'delivery') {
            req.flash('error', 'This order is not marked for delivery.');
            return res.redirect('/orders/history');
        }

        if (order.delivery_status === 'received') {
            req.flash('success', 'Delivery already confirmed.');
            return res.redirect('/orders/history');
        }

        Order.updateDeliveryStatus(orderId, 'received', (updateErr) => {
            if (updateErr) {
                console.error('Error updating delivery status:', updateErr);
                req.flash('error', 'Unable to confirm delivery.');
                return res.redirect('/orders/history');
            }

            req.flash('success', 'Delivery confirmed. Thank you!');
            return res.redirect('/orders/history');
        });
    });
};

const retryPayment = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        req.flash('error', 'Only shoppers can retry payment.');
        return res.redirect('/orders/history');
    }

    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) {
        req.flash('error', 'Invalid order selected.');
        return res.redirect('/orders/history');
    }

    const userId = req.session.user.id;
    Order.findByIdForUser(orderId, userId, (orderErr, order) => {
        if (orderErr || !order) {
            req.flash('error', 'Order not found.');
            return res.redirect('/orders/history');
        }

        const status = String(order.payment_status || '').toUpperCase();
        if (status !== 'PENDING') {
            req.flash('error', 'Payment is already completed or failed.');
            return res.redirect('/orders/history');
        }

        req.session.pendingOrderId = orderId;
        req.session.checkout = {
            deliveryMethod: order.delivery_method === 'delivery' ? 'delivery' : 'pickup',
            deliveryAddress: order.delivery_address || null
        };
        if (order.currency_code) {
            req.session.currency = order.currency_code;
        }
        req.session.paymentPending = { active: true, updatedAt: new Date().toISOString() };
        return res.redirect('/cart/payment');
    });
};

const markPaymentFailed = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const orderId = req.session.pendingOrderId;
    if (!orderId) {
        return res.json({ ok: true });
    }

    const userId = req.session.user.id;
    Order.findByIdForUser(orderId, userId, (orderErr, order) => {
        if (orderErr || !order) {
            return res.json({ ok: true });
        }

        Order.updatePaymentStatus(orderId, 'FAILED', () => {
            Order.incrementPaymentAttempts(orderId, 'Payment failed', () => {});
            req.session.pendingOrderId = null;
            req.session.paymentPending = null;
            return res.json({ ok: true });
        });
    });
};

const setCurrency = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        req.flash('error', 'Only shoppers can update currency.');
        return res.redirect('/cart/payment');
    }

    const selectedCurrency = normaliseCurrency(req.body.currency || DEFAULT_CURRENCY);
    req.session.currency = selectedCurrency;
    return req.session.save(() => res.redirect('/cart/payment'));
};

module.exports = {
    startCheckout,
    payment,
    checkout,
    confirmDelivery,
    history,
    printOrder,
    listAllDeliveries,
    updateDeliveryDetails,
    addTracking,
    retryPayment,
    markPaymentFailed,
    setCurrency
};
