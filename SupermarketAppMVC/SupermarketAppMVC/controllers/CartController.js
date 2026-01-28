const db = require('../db');
const Cart = require('../models/cart');

const ensureShopperRole = (req, res) => {
    const shopperRoles = ['user'];
    if (!req.session.user || !shopperRoles.includes(req.session.user.role)) {
        req.flash('error', 'Access denied.');
        res.redirect('/inventory');
        return false;
    }
    return true;
};

const calculatePricing = (product) => {
    const basePrice = Number.parseFloat(product.price) || 0;
    const discountPercentage = Math.min(
        100,
        Math.max(0, Number.parseFloat(product.discountPercentage) || 0)
    );
    const hasDiscount = discountPercentage > 0;
    const discountedPrice = hasDiscount
        ? Number((basePrice * (1 - discountPercentage / 100)).toFixed(2))
        : Number(basePrice.toFixed(2));

    return {
        basePrice: Number(basePrice.toFixed(2)),
        discountPercentage,
        finalPrice: discountedPrice,
        hasDiscount
    };
};

const addToCart = (req, res) => {
    if (!ensureShopperRole(req, res)) {
        return;
    }

    const userId = req.session.user.id;
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    if (Number.isNaN(productId)) {
        req.flash('error', 'Invalid product selected.');
        return res.redirect('/shopping');
    }

    db.query('SELECT * FROM products WHERE id = ? AND is_deleted = 0', [productId], (error, results) => {
        if (error) {
            console.error('Error fetching product:', error);
            req.flash('error', 'Unable to add product to cart at this time.');
            return res.redirect('/shopping');
        }

        if (results.length === 0) {
            req.flash('error', 'Product not found.');
            return res.redirect('/shopping');
        }

        const product = results[0];
        const available = Number(product.quantity) || 0;
        if (available <= 0) {
            req.flash('error', 'Sorry, this item is out of stock.');
            return res.redirect('/shopping');
        }

        const fetchCartSql = 'SELECT quantity FROM cart WHERE user_id = ? AND product_id = ? LIMIT 1';
        db.query(fetchCartSql, [userId, productId], (cartErr, cartRows) => {
            if (cartErr) {
                console.error('Error checking cart quantity:', cartErr);
                req.flash('error', 'Unable to add product to cart at this time.');
                return res.redirect('/shopping');
            }

            const existingQty = cartRows.length ? (Number(cartRows[0].quantity) || 0) : 0;
            const desiredQty = existingQty + quantity;

            if (desiredQty > available) {
                req.flash('error', `Only ${available} in stock. You already have ${existingQty} in your cart.`);
                return res.redirect('/shopping');
            }

            const pricing = calculatePricing(product);
            Cart.addOrIncrement(userId, productId, quantity, (saveErr) => {
                if (saveErr) {
                    console.error('Error saving cart:', saveErr);
                    req.flash('error', 'Unable to add product to cart at this time.');
                    return res.redirect('/shopping');
                }

                req.flash('success', `${product.productName} added to cart at $${pricing.finalPrice.toFixed(2)}${pricing.hasDiscount ? ' (discounted)' : ''}.`);
                return res.redirect('/cart');
            });
        });
    });
};

const viewCart = (req, res) => {
    if (!ensureShopperRole(req, res)) {
        return;
    }

    Cart.getCart(req.session.user.id, (err, items) => {
        if (err) {
            console.error('Error loading cart:', err);
            req.flash('error', 'Unable to load your cart right now.');
            return res.redirect('/shopping');
        }

        if (!items || items.length === 0) {
            req.session.paymentPending = null;
        }

        res.render('cart', {
            cart: items,
            user: req.session.user,
            checkout: req.session.checkout || null,
            messages: res.locals.messages,
            errors: res.locals.errors
        });
    });
};

const updateCartItem = (req, res) => {
    if (!ensureShopperRole(req, res)) {
        return;
    }

    const userId = req.session.user.id;
    const productId = parseInt(req.params.id, 10);
    const quantity = parseInt(req.body.quantity, 10);

    if (Number.isNaN(productId)) {
        req.flash('error', 'Invalid product.');
        return res.redirect('/cart');
    }

    // Treat non-positive quantities as removal without stock check
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return Cart.updateQuantity(userId, productId, quantity, (err) => {
            if (err) {
                console.error('Error updating cart item:', err);
                req.flash('error', 'Unable to update cart.');
            } else {
                req.flash('success', 'Item removed from cart.');
            }
            return res.redirect('/cart');
        });
    }

    db.query('SELECT productName, quantity FROM products WHERE id = ? AND is_deleted = 0', [productId], (prodErr, prodRows) => {
        if (prodErr) {
            console.error('Error fetching product for update:', prodErr);
            req.flash('error', 'Unable to update cart right now.');
            return res.redirect('/cart');
        }

        if (!prodRows.length) {
            req.flash('error', 'Product not found.');
            return res.redirect('/cart');
        }

        const product = prodRows[0];
        const available = Number(product.quantity) || 0;

        if (available <= 0) {
            req.flash('error', 'Sorry, this item is out of stock.');
            return res.redirect('/cart');
        }

        if (quantity > available) {
            req.flash('error', `Only ${available} available for ${product.productName}.`);
            return res.redirect('/cart');
        }

        Cart.updateQuantity(userId, productId, quantity, (err) => {
            if (err) {
                console.error('Error updating cart item:', err);
                req.flash('error', 'Unable to update cart.');
            } else {
                req.flash('success', 'Cart updated successfully.');
            }
            return res.redirect('/cart');
        });
    });
};

const removeCartItem = (req, res) => {
    if (!ensureShopperRole(req, res)) {
        return;
    }

    const userId = req.session.user.id;
    const productId = parseInt(req.params.id, 10);

    if (Number.isNaN(productId)) {
        req.flash('error', 'Invalid product.');
        return res.redirect('/cart');
    }

    Cart.removeItem(userId, productId, (err, result) => {
        if (err) {
            console.error('Error removing cart item:', err);
            req.flash('error', 'Unable to remove item right now.');
        } else if (result.affectedRows === 0) {
            req.flash('error', 'Item not found in cart.');
        } else {
            req.flash('success', 'Item removed from cart.');
        }

        return res.redirect('/cart');
    });
};

module.exports = {
    addToCart,
    viewCart,
    updateCartItem,
    removeCartItem
};
