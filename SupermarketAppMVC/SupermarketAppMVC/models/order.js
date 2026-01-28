const connection = require('../db');

const DELIVERY_STATUSES = ['packed', 'shipped', 'in_transit', 'received'];

const buildInvoiceNumber = (orderId) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `INV-${yyyy}${mm}${dd}-${orderId}`;
};

const normaliseDeliveryStatus = (status) => {
    const value = typeof status === 'string' ? status.toLowerCase() : '';
    return DELIVERY_STATUSES.includes(value) ? value : null;
};

const normalisePaymentStatus = (status) => {
    const value = typeof status === 'string' ? status.toUpperCase() : '';
    return ['PENDING', 'PAID', 'FAILED'].includes(value) ? value : null;
};

const buildOrderTotals = (cartItems, deliveryFee) => {
    const totalBeforeRound = cartItems.reduce((sum, item) => {
        const unitPrice = Number(item.price);
        const quantity = Number(item.quantity);
        if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) {
            return sum;
        }
        return sum + (unitPrice * quantity);
    }, 0);

    const orderTotal = Number(totalBeforeRound.toFixed(2));
    const safeDeliveryFee = Number.isFinite(deliveryFee) && deliveryFee > 0
        ? Number(deliveryFee.toFixed(2))
        : 0;
    const finalTotal = Number((orderTotal + safeDeliveryFee).toFixed(2));

    return { orderTotal, safeDeliveryFee, finalTotal };
};

/**
 * Create a new order for the given user and cart items.
 * Inserts into orders, creates order_items, and deducts inventory within a transaction.
 * @param {number} userId
 * @param {Array<{productId:number, productName:string, quantity:number, price:number}>} cartItems
 * @param {Function} callback Node-style callback(err, result)
 */
const create = (userId, cartItems, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    const {
        deliveryMethod = 'pickup',
        deliveryAddress = null,
        deliveryFee = 0,
        paymentMethod = null,
        paypalCaptureId = null,
        deliveryStatus = null,
        paymentStatus = null,
        currencyCode = 'SGD',
        exchangeRate = 1,
        invoiceNumber = null
    } = options || {};

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return callback(new Error('Cart is empty.'));
    }

    connection.beginTransaction((transactionError) => {
        if (transactionError) {
            return callback(transactionError);
        }

        const totals = buildOrderTotals(cartItems, deliveryFee);

        const safePaymentMethod = typeof paymentMethod === 'string' && paymentMethod.length
            ? paymentMethod.slice(0, 30)
            : null;
        const safePaypalCaptureId = typeof paypalCaptureId === 'string' && paypalCaptureId.length
            ? paypalCaptureId.slice(0, 80)
            : null;
        const safePaymentStatus = normalisePaymentStatus(paymentStatus) || 'PAID';
        const safeDeliveryStatus = normaliseDeliveryStatus(deliveryStatus)
            || 'packed';
        const safeCurrency = typeof currencyCode === 'string' && currencyCode.length
            ? currencyCode.slice(0, 5)
            : 'SGD';
        const safeExchangeRate = Number.isFinite(exchangeRate) && exchangeRate > 0
            ? Number(exchangeRate.toFixed(6))
            : 1;

        const orderSql = `
            INSERT INTO orders (
                user_id,
                total,
                delivery_method,
                delivery_address,
                delivery_fee,
                delivery_status,
                payment_method,
                paypal_capture_id,
                payment_status,
                currency_code,
                exchange_rate,
                invoice_number
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        connection.query(
            orderSql,
            [userId, totals.finalTotal, deliveryMethod, deliveryAddress, totals.safeDeliveryFee, safeDeliveryStatus, safePaymentMethod, safePaypalCaptureId, safePaymentStatus, safeCurrency, safeExchangeRate, invoiceNumber],
            (orderError, orderResult) => {
            if (orderError) {
                return connection.rollback(() => callback(orderError));
            }

            const orderId = orderResult.insertId;
            const resolvedInvoice = invoiceNumber || buildInvoiceNumber(orderId);

            const itemPromises = cartItems.map((item) => new Promise((resolve, reject) => {
                const quantity = Number(item.quantity);
                if (!Number.isFinite(quantity) || quantity <= 0) {
                    return reject(new Error(`Invalid quantity detected for ${item.productName}.`));
                }

                const productSql = 'SELECT quantity FROM products WHERE id = ? AND is_deleted = 0 FOR UPDATE';
                connection.query(productSql, [item.productId], (productError, productRows) => {
                    if (productError) {
                        return reject(productError);
                    }

                    if (productRows.length === 0) {
                        return reject(new Error(`${item.productName} does not exist.`));
                    }

                    const availableQuantity = Number(productRows[0].quantity);
                    if (availableQuantity < quantity) {
                        return reject(new Error(`Insufficient stock for ${item.productName}.`));
                    }

                    const unitPrice = Number(item.price);
                    if (!Number.isFinite(unitPrice)) {
                        return reject(new Error(`Invalid price detected for ${item.productName}.`));
                    }

                    const insertItemSql = 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)';
                    connection.query(insertItemSql, [orderId, item.productId, quantity, unitPrice], (itemError) => {
                        if (itemError) {
                            return reject(itemError);
                        }

                        const updateProductSql = 'UPDATE products SET quantity = quantity - ? WHERE id = ?';
                        connection.query(updateProductSql, [quantity, item.productId], (updateError) => {
                            if (updateError) {
                                return reject(updateError);
                            }
                            resolve();
                        });
                    });
                });
            }));

            Promise.all(itemPromises)
                .then(() => {
                    const invoiceSql = 'UPDATE orders SET invoice_number = ? WHERE id = ?';
                    connection.query(invoiceSql, [resolvedInvoice, orderId], (invoiceErr) => {
                        if (invoiceErr) {
                            return connection.rollback(() => callback(invoiceErr));
                        }

                        connection.commit((commitError) => {
                            if (commitError) {
                                return connection.rollback(() => callback(commitError));
                            }
                            callback(null, {
                                orderId,
                                total: totals.finalTotal,
                                deliveryMethod,
                                deliveryAddress,
                                deliveryFee: totals.safeDeliveryFee,
                                deliveryStatus: safeDeliveryStatus,
                                paymentMethod: safePaymentMethod,
                                paypalCaptureId: safePaypalCaptureId,
                                paymentStatus: safePaymentStatus,
                                currencyCode: safeCurrency,
                                exchangeRate: safeExchangeRate,
                                invoiceNumber: resolvedInvoice
                            });
                        });
                    });
                })
                .catch((error) => {
                    connection.rollback(() => callback(error));
                });
        });
    });
};

const createPending = (userId, cartItems, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    const {
        deliveryMethod = 'pickup',
        deliveryAddress = null,
        deliveryFee = 0,
        deliveryStatus = null,
        paymentStatus = 'PENDING',
        currencyCode = 'SGD',
        exchangeRate = 1,
        invoiceNumber = null
    } = options || {};

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return callback(new Error('Cart is empty.'));
    }

    const totals = buildOrderTotals(cartItems, deliveryFee);
    const safeDeliveryStatus = normaliseDeliveryStatus(deliveryStatus)
        || 'packed';
    const safePaymentStatus = normalisePaymentStatus(paymentStatus) || 'PENDING';
    const safeCurrency = typeof currencyCode === 'string' && currencyCode.length
        ? currencyCode.slice(0, 5)
        : 'SGD';
    const safeExchangeRate = Number.isFinite(exchangeRate) && exchangeRate > 0
        ? Number(exchangeRate.toFixed(6))
        : 1;

    connection.beginTransaction((transactionError) => {
        if (transactionError) {
            return callback(transactionError);
        }

        const orderSql = `
            INSERT INTO orders (
                user_id,
                total,
                delivery_method,
                delivery_address,
                delivery_fee,
                delivery_status,
                payment_method,
                paypal_capture_id,
                payment_status,
                currency_code,
                exchange_rate,
                invoice_number
            )
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)
        `;

        connection.query(
            orderSql,
            [userId, totals.finalTotal, deliveryMethod, deliveryAddress, totals.safeDeliveryFee, safeDeliveryStatus, safePaymentStatus, safeCurrency, safeExchangeRate, invoiceNumber],
            (orderError, orderResult) => {
                if (orderError) {
                    return connection.rollback(() => callback(orderError));
                }

                const orderId = orderResult.insertId;
                const resolvedInvoice = invoiceNumber || buildInvoiceNumber(orderId);

                const itemPromises = cartItems.map((item) => new Promise((resolve, reject) => {
                    const quantity = Number(item.quantity);
                    if (!Number.isFinite(quantity) || quantity <= 0) {
                        return reject(new Error(`Invalid quantity detected for ${item.productName}.`));
                    }

                    const unitPrice = Number(item.price);
                    if (!Number.isFinite(unitPrice)) {
                        return reject(new Error(`Invalid price detected for ${item.productName}.`));
                    }

                    const insertItemSql = 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)';
                    connection.query(insertItemSql, [orderId, item.productId, quantity, unitPrice], (itemError) => {
                        if (itemError) {
                            return reject(itemError);
                        }
                        resolve();
                    });
                }));

                Promise.all(itemPromises)
                    .then(() => {
                        const invoiceSql = 'UPDATE orders SET invoice_number = ? WHERE id = ?';
                        connection.query(invoiceSql, [resolvedInvoice, orderId], (invoiceErr) => {
                            if (invoiceErr) {
                                return connection.rollback(() => callback(invoiceErr));
                            }

                            connection.commit((commitError) => {
                                if (commitError) {
                                    return connection.rollback(() => callback(commitError));
                                }
                                callback(null, {
                                    orderId,
                                    total: totals.finalTotal,
                                    deliveryMethod,
                                    deliveryAddress,
                                    deliveryFee: totals.safeDeliveryFee,
                                    deliveryStatus: safeDeliveryStatus,
                                    paymentStatus: safePaymentStatus,
                                    currencyCode: safeCurrency,
                                    exchangeRate: safeExchangeRate,
                                    invoiceNumber: resolvedInvoice
                                });
                            });
                        });
                    })
                    .catch((error) => {
                        connection.rollback(() => callback(error));
                    });
            }
        );
    });
};

const syncPendingOrder = (orderId, userId, cartItems, options, callback) => {
    const {
        deliveryMethod = 'pickup',
        deliveryAddress = null,
        deliveryFee = 0,
        deliveryStatus = null,
        currencyCode = 'SGD',
        exchangeRate = 1
    } = options || {};

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return callback(new Error('Cart is empty.'));
    }

    const totals = buildOrderTotals(cartItems, deliveryFee);
    const safeDeliveryStatus = normaliseDeliveryStatus(deliveryStatus)
        || 'packed';
    const safeCurrency = typeof currencyCode === 'string' && currencyCode.length
        ? currencyCode.slice(0, 5)
        : 'SGD';
    const safeExchangeRate = Number.isFinite(exchangeRate) && exchangeRate > 0
        ? Number(exchangeRate.toFixed(6))
        : 1;

    connection.beginTransaction((transactionError) => {
        if (transactionError) {
            return callback(transactionError);
        }

        const selectSql = 'SELECT id, payment_status FROM orders WHERE id = ? AND user_id = ? FOR UPDATE';
        connection.query(selectSql, [orderId, userId], (selectErr, rows) => {
            if (selectErr) {
                return connection.rollback(() => callback(selectErr));
            }

            if (!rows || !rows.length) {
                return connection.rollback(() => callback(new Error('Order not found.')));
            }

            const currentStatus = String(rows[0].payment_status || '').toUpperCase();
            if (currentStatus !== 'PENDING') {
                return connection.rollback(() => callback(new Error('Order is not pending.')));
            }

            const updateSql = `
                UPDATE orders
                SET total = ?, delivery_method = ?, delivery_address = ?, delivery_fee = ?, delivery_status = ?,
                    currency_code = ?, exchange_rate = ?
                WHERE id = ? AND user_id = ?
            `;

            connection.query(
                updateSql,
                [totals.finalTotal, deliveryMethod, deliveryAddress, totals.safeDeliveryFee, safeDeliveryStatus, safeCurrency, safeExchangeRate, orderId, userId],
                (updateErr) => {
                    if (updateErr) {
                        return connection.rollback(() => callback(updateErr));
                    }

                    const deleteSql = 'DELETE FROM order_items WHERE order_id = ?';
                    connection.query(deleteSql, [orderId], (deleteErr) => {
                        if (deleteErr) {
                            return connection.rollback(() => callback(deleteErr));
                        }

                        const itemPromises = cartItems.map((item) => new Promise((resolve, reject) => {
                            const quantity = Number(item.quantity);
                            if (!Number.isFinite(quantity) || quantity <= 0) {
                                return reject(new Error(`Invalid quantity detected for ${item.productName}.`));
                            }

                            const unitPrice = Number(item.price);
                            if (!Number.isFinite(unitPrice)) {
                                return reject(new Error(`Invalid price detected for ${item.productName}.`));
                            }

                            const insertItemSql = 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)';
                            connection.query(insertItemSql, [orderId, item.productId, quantity, unitPrice], (itemError) => {
                                if (itemError) {
                                    return reject(itemError);
                                }
                                resolve();
                            });
                        }));

                        Promise.all(itemPromises)
                            .then(() => {
                                connection.commit((commitError) => {
                                    if (commitError) {
                                        return connection.rollback(() => callback(commitError));
                                    }
                                    callback(null, {
                                        orderId,
                                        total: totals.finalTotal,
                                        deliveryMethod,
                                        deliveryAddress,
                                        deliveryFee: totals.safeDeliveryFee,
                                        deliveryStatus: safeDeliveryStatus,
                                        paymentStatus: 'PENDING'
                                    });
                                });
                            })
                            .catch((error) => {
                                connection.rollback(() => callback(error));
                            });
                    });
                }
            );
        });
    });
};

const finalizePendingOrder = (orderId, paymentData, callback) => {
    const {
        paymentMethod = null,
        paypalCaptureId = null,
        paymentStatus = 'PAID',
        invoiceNumber = null
    } = paymentData || {};

    const safePaymentMethod = typeof paymentMethod === 'string' && paymentMethod.length
        ? paymentMethod.slice(0, 30)
        : null;
    const safePaypalCaptureId = typeof paypalCaptureId === 'string' && paypalCaptureId.length
        ? paypalCaptureId.slice(0, 80)
        : null;
    const safePaymentStatus = normalisePaymentStatus(paymentStatus) || 'PAID';

    connection.beginTransaction((transactionError) => {
        if (transactionError) {
            return callback(transactionError);
        }

        const selectSql = 'SELECT id, payment_status FROM orders WHERE id = ? FOR UPDATE';
        connection.query(selectSql, [orderId], (selectErr, rows) => {
            if (selectErr) {
                return connection.rollback(() => callback(selectErr));
            }

            if (!rows || !rows.length) {
                return connection.rollback(() => callback(new Error('Order not found.')));
            }

            const currentStatus = String(rows[0].payment_status || '').toUpperCase();
            if (currentStatus !== 'PENDING') {
                return connection.rollback(() => callback(new Error('Order is not pending.')));
            }

            const itemsSql = 'SELECT product_id, quantity, price FROM order_items WHERE order_id = ?';
            connection.query(itemsSql, [orderId], (itemsErr, items) => {
                if (itemsErr) {
                    return connection.rollback(() => callback(itemsErr));
                }

                if (!items || !items.length) {
                    return connection.rollback(() => callback(new Error('No items found for order.')));
                }

                const itemPromises = items.map((item) => new Promise((resolve, reject) => {
                    const quantity = Number(item.quantity);
                    if (!Number.isFinite(quantity) || quantity <= 0) {
                        return reject(new Error('Invalid quantity in order.'));
                    }

                    const productSql = 'SELECT quantity FROM products WHERE id = ? AND is_deleted = 0 FOR UPDATE';
                    connection.query(productSql, [item.product_id], (productError, productRows) => {
                        if (productError) {
                            return reject(productError);
                        }

                        if (productRows.length === 0) {
                            return reject(new Error(`Product #${item.product_id} does not exist.`));
                        }

                        const availableQuantity = Number(productRows[0].quantity);
                        if (availableQuantity < quantity) {
                            return reject(new Error(`Insufficient stock for product #${item.product_id}.`));
                        }

                        const updateProductSql = 'UPDATE products SET quantity = quantity - ? WHERE id = ?';
                        connection.query(updateProductSql, [quantity, item.product_id], (updateError) => {
                            if (updateError) {
                                return reject(updateError);
                            }
                            resolve();
                        });
                    });
                }));

                Promise.all(itemPromises)
                    .then(() => {
                        const updateSql = `
                            UPDATE orders
                            SET payment_method = ?, paypal_capture_id = ?, payment_status = ?,
                                invoice_number = COALESCE(invoice_number, ?)
                            WHERE id = ?
                        `;
                        const resolvedInvoice = invoiceNumber || buildInvoiceNumber(orderId);
                        connection.query(updateSql, [safePaymentMethod, safePaypalCaptureId, safePaymentStatus, resolvedInvoice, orderId], (updateErr) => {
                            if (updateErr) {
                                return connection.rollback(() => callback(updateErr));
                            }

                            connection.commit((commitError) => {
                                if (commitError) {
                                    return connection.rollback(() => callback(commitError));
                                }
                                callback(null, { orderId, paymentStatus: safePaymentStatus, invoiceNumber: resolvedInvoice });
                            });
                        });
                    })
                    .catch((error) => {
                        connection.rollback(() => callback(error));
                    });
            });
        });
    });
};

const updatePaymentStatus = (orderId, status, callback) => {
    const safeStatus = normalisePaymentStatus(status);
    if (!safeStatus) {
        return callback(new Error('Invalid payment status.'));
    }

    const sql = `
        UPDATE orders
        SET payment_status = ?
        WHERE id = ? AND payment_status <> 'PAID'
    `;
    connection.query(sql, [safeStatus, orderId], callback);
};

const incrementPaymentAttempts = (orderId, errorMessage, callback) => {
    const safeMessage = errorMessage ? String(errorMessage).trim().slice(0, 255) : null;
    const sql = `
        UPDATE orders
        SET payment_attempts = COALESCE(payment_attempts, 0) + 1,
            last_payment_error = ?
        WHERE id = ?
    `;
    connection.query(sql, [safeMessage, orderId], callback);
};

/**
 * Retrieve orders placed by a specific user.
 * @param {number} userId
 * @param {Function} callback
 */
const findByUser = (userId, callback) => {
    const sql = `
        SELECT id, total, created_at, delivery_method, delivery_address, delivery_fee, delivery_status,
               payment_method, paypal_capture_id, payment_status, refunded_amount, currency_code, exchange_rate, invoice_number
        FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
    `;
    connection.query(sql, [userId], callback);
};

const findById = (orderId, callback) => {
    const sql = `
        SELECT id, user_id, total, created_at, delivery_method, delivery_address, delivery_fee, delivery_status,
               payment_method, paypal_capture_id, payment_status, refunded_amount, currency_code, exchange_rate, invoice_number
        FROM orders
        WHERE id = ?
        LIMIT 1
    `;
    connection.query(sql, [orderId], callback);
};

const findAllWithUsers = (callback) => {
    const sql = `
        SELECT
            o.id,
            o.total,
            o.created_at,
            o.delivery_method,
            o.delivery_address,
            o.delivery_fee,
            o.delivery_status,
            o.payment_method,
            o.paypal_capture_id,
            o.payment_status,
            o.refunded_amount,
            o.currency_code,
            o.exchange_rate,
            o.invoice_number,
            u.username,
            u.email,
            u.contact,
            u.address AS account_address,
            u.free_delivery
        FROM orders o
        JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC, o.id DESC
    `;
    connection.query(sql, callback);
};

/**
 * Retrieve order items for a list of order ids.
 * @param {number[]} orderIds
 * @param {Function} callback
 */
const findItemsByOrderIds = (orderIds, callback) => {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return callback(null, []);
    }

    const sql = `
        SELECT
            oi.id,
            oi.order_id,
            oi.product_id,
            oi.quantity,
            oi.price,
            COALESCE(p.productName, CONCAT('Deleted product #', oi.product_id)) AS productName,
            p.image,
            p.discountPercentage,
            p.offerMessage,
            p.is_deleted
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id IN (?)
        ORDER BY oi.order_id DESC, productName ASC
    `;
    connection.query(sql, [orderIds], callback);
};

const userHasPurchasedProduct = (userId, productId, callback) => {
    const sql = `
        SELECT 1
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ? AND oi.product_id = ?
        LIMIT 1
    `;
    connection.query(sql, [userId, productId], (err, rows) => {
        if (err) {
            return callback(err);
        }
        return callback(null, rows && rows.length > 0);
    });
};

/**
 * Retrieve global best-selling products ordered by total quantity sold.
 * @param {number} limit Number of products to fetch
 * @param {Function} callback
 */
const getBestSellers = (limit, callback) => {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 5;
    const sql = `
        SELECT
            p.id,
            p.productName,
            p.price,
            p.image,
            p.discountPercentage,
            p.offerMessage,
            SUM(oi.quantity) AS totalSold
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE p.is_deleted = 0
        GROUP BY p.id, p.productName, p.price, p.image, p.discountPercentage, p.offerMessage
        ORDER BY totalSold DESC
        LIMIT ?
    `;
    connection.query(sql, [safeLimit], callback);
};

const updateDelivery = (orderId, deliveryData, callback) => {
    const {
        deliveryMethod = 'pickup',
        deliveryAddress = null,
        deliveryFee = 0,
        deliveryStatus = null
    } = deliveryData || {};

    const safeFee = Number.isFinite(deliveryFee) && deliveryFee > 0
        ? Number(deliveryFee.toFixed(2))
        : 0;
    const safeStatus = normaliseDeliveryStatus(deliveryStatus);
    const sql = `
        UPDATE orders
        SET delivery_method = ?, delivery_address = ?, delivery_fee = ?, total = total - delivery_fee + ?,
            delivery_status = COALESCE(?, delivery_status)
        WHERE id = ?
    `;
    connection.query(sql, [deliveryMethod, deliveryAddress, safeFee, safeFee, safeStatus, orderId], callback);
};

const findByIdForUser = (orderId, userId, callback) => {
    const sql = `
        SELECT id, user_id, total, created_at, delivery_method, delivery_address, delivery_fee, delivery_status,
               payment_method, paypal_capture_id, payment_status, refunded_amount, currency_code, exchange_rate, invoice_number
        FROM orders
        WHERE id = ? AND user_id = ?
        LIMIT 1
    `;
    connection.query(sql, [orderId, userId], (err, rows) => {
        if (err) {
            return callback(err);
        }
        return callback(null, rows && rows.length ? rows[0] : null);
    });
};

const addRefundedAmount = (orderId, amount, callback) => {
    const safeAmount = Number(amount);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
        return callback(new Error('Invalid refund amount.'));
    }

    const sql = `
        UPDATE orders
        SET refunded_amount = COALESCE(refunded_amount, 0) + ?
        WHERE id = ?
    `;
    connection.query(sql, [safeAmount, orderId], callback);
};

const updateDeliveryStatus = (orderId, status, callback) => {
    const safeStatus = normaliseDeliveryStatus(status);
    if (!safeStatus) {
        return callback(new Error('Invalid delivery status.'));
    }
    const sql = `
        UPDATE orders
        SET delivery_status = ?
        WHERE id = ?
    `;
    connection.query(sql, [safeStatus, orderId], callback);
};

module.exports = {
    create,
    createPending,
    syncPendingOrder,
    finalizePendingOrder,
    buildInvoiceNumber,
    updatePaymentStatus,
    incrementPaymentAttempts,
    findByUser,
    findById,
    findByIdForUser,
    findAllWithUsers,
    findItemsByOrderIds,
    getBestSellers,
    updateDelivery,
    userHasPurchasedProduct,
    addRefundedAmount,
    updateDeliveryStatus
};
