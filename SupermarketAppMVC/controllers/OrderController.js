const Order = require('../models/order');
const User = require('../models/user');
const Cart = require('../models/cart');

const DELIVERY_FEE = 1.5;

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

/**
 * Handle checkout and order creation.
 */
const checkout = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        req.flash('error', 'Only shoppers can complete checkout.');
        return res.redirect('/cart');
    }

    const userId = req.session.user.id;

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

        const deliveryMethod = req.body.deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
        const providedAddress = sanitiseDeliveryAddress(req.body.deliveryAddress) || req.session.user.address;
        const deliveryAddress = deliveryMethod === 'delivery' ? sanitiseDeliveryAddress(providedAddress) : null;

        if (deliveryMethod === 'delivery' && !deliveryAddress) {
            req.flash('error', 'Please provide a delivery address.');
            return res.redirect('/cart');
        }

        const deliveryFee = computeDeliveryFee(req.session.user, deliveryMethod);

        Order.create(userId, cartItems, { deliveryMethod, deliveryAddress, deliveryFee }, (error) => {
            if (error) {
                console.error('Error during checkout:', error);
                req.flash('error', error.message || 'Unable to complete checkout. Please try again.');
                return res.redirect('/cart');
            }

            Cart.clearCart(userId, (clearErr) => {
                if (clearErr) {
                    console.error('Error clearing cart after checkout:', clearErr);
                }
                req.flash('success', `Thanks for your purchase! ${deliveryMethod === 'delivery' ? 'We will deliver your order shortly.' : 'Pickup details will be shared soon.'}`);
                return res.redirect('/orders/history');
            });
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
                    errors: res.locals.errors
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

            if (deliveryMethod === 'delivery' && !requestedAddress) {
                req.flash('error', 'Delivery address is required.');
                return res.redirect(redirectPath);
            }

            Order.updateDelivery(orderId, {
                deliveryMethod,
                deliveryAddress: deliveryMethod === 'delivery' ? requestedAddress : null,
                deliveryFee
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

module.exports = {
    checkout,
    history,
    printOrder,
    listAllDeliveries,
    updateDeliveryDetails
};
