const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const flash = require('connect-flash');
const multer = require('multer');
require('dotenv').config();
const app = express();

const userController = require('./controllers/UserController');
const cartController = require('./controllers/CartController');
const productController = require('./controllers/ProductController');
const orderController = require('./controllers/OrderController');
const reviewController = require('./controllers/ReviewController');
const { checkAuthenticated, checkAdmin, checkRoles } = require('./middleware');
const Product = require('./models/product');
const Order = require('./models/order');

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

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Set up view engine
app.set('view engine', 'ejs');
// Enable static files
app.use(express.static('public'));
// Enable form processing
app.use(express.urlencoded({
    extended: false
}));

// Session Middleware stored in MySQL so sessions persist across browsers/devices
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    createDatabaseTable: true
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Expose session user and flash feedback to all templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.messages = req.flash('success');
    res.locals.errors = req.flash('error');
    res.locals.formData = req.flash('formData')[0] || null;
    next();
});

// Routes
app.get('/', (req, res) => {
    res.render('index', {user: req.session.user});
});

app.get('/inventory', checkAuthenticated, checkAdmin, productController.showInventory);

app.get('/register', userController.showRegister);
app.post('/register', userController.register);

app.get('/login', userController.showLogin);
app.post('/login', userController.login);
app.get('/login/2fa', userController.showLogin2FA);
app.post('/login/2fa', userController.verifyLogin2FA);

app.get('/2fa/setup', checkAuthenticated, userController.show2FASetup);
app.post('/2fa/verify-setup', checkAuthenticated, userController.verify2FASetup);

app.get('/admin/users', checkAuthenticated, checkAdmin, userController.listUsers);
app.get('/admin/users/:id/edit', checkAuthenticated, checkAdmin, userController.editUserForm);
app.post('/admin/users/:id', checkAuthenticated, checkAdmin, userController.updateUserRole);
app.post('/admin/users/:id/delete', checkAuthenticated, checkAdmin, userController.deleteUser);

app.get('/shopping', checkAuthenticated, checkRoles('user'), (req, res) => {
    const activeCategory = req.query.category ? String(req.query.category).trim() : '';
    const searchTerm = req.query.search ? String(req.query.search).trim() : '';
    const productFetcher = (() => {
        if (activeCategory || searchTerm) {
            return (cb) => Product.findByFilter({
                category: activeCategory || undefined,
                search: searchTerm || undefined
            }, cb);
        }
        return (cb) => Product.getAll(cb);
    })();

    productFetcher((error, products) => {
        if (error) {
            console.error('Error loading products:', error);
            req.flash('error', 'Unable to load products right now.');
            return res.redirect('/');
        }

        Product.getCategories((catErr, categoryRows) => {
            if (catErr) {
                console.error('Error loading categories:', catErr);
            }

            const productList = (products || []).map(decorateProduct);
            const categories = (categoryRows || []).map((row) => row.category).filter(Boolean);

            Order.getBestSellers(3, (bestErr, bestSellers) => {
                if (bestErr) {
                    console.error('Error fetching best sellers:', bestErr);
                }

                res.render('shopping', {
                    user: req.session.user,
                    products: productList,
                    categories,
                    activeCategory,
                    searchTerm,
                    bestSellers: (bestSellers && bestSellers.length) ? bestSellers.map(decorateProduct) : [],
                    messages: res.locals.messages,
                    errors: res.locals.errors
                });
            });
        });
    });
});

app.post('/add-to-cart/:id', checkAuthenticated, checkRoles('user'), cartController.addToCart);
app.get('/cart', checkAuthenticated, checkRoles('user'), cartController.viewCart);
app.post('/cart/update/:id', checkAuthenticated, checkRoles('user'), cartController.updateCartItem);
app.post('/cart/remove/:id', checkAuthenticated, checkRoles('user'), cartController.removeCartItem);
app.post('/checkout', checkAuthenticated, checkRoles('user'), orderController.checkout);
app.get('/orders/history', checkAuthenticated, checkRoles('user'), orderController.history);
app.get('/orders/:id/print', checkAuthenticated, orderController.printOrder);
app.post('/orders/:id/delivery', checkAuthenticated, orderController.updateDeliveryDetails);

app.get('/logout', userController.logout);

app.get('/product/:id', checkAuthenticated, productController.showProductDetails);
app.post('/product/:id/reviews', checkAuthenticated, checkRoles('user'), reviewController.upsert);
app.post('/product/:id/reviews/:reviewId/delete', checkAuthenticated, checkRoles('user'), reviewController.remove);

app.get('/addProduct', checkAuthenticated, checkAdmin, productController.showAddProductForm);
app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), productController.addProduct);

app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, productController.showUpdateProductForm);
app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), productController.updateProduct);

app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, productController.deleteProduct);
app.get('/admin/deliveries', checkAuthenticated, checkAdmin, orderController.listAllDeliveries);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
