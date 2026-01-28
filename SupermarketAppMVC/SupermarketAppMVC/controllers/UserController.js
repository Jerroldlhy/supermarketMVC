const speakeasy = require('speakeasy');  // Importing the speakeasy library for 2FA generation and verification
const qrcode = require('qrcode');        // Importing the qrcode library to generate QR codes for 2FA setup
const User = require('../models/user');  // Importing the User model to interact with user data in the database

// Renders the registration page with any form data, errors, or messages passed from the session
function showRegister(req, res) {
    res.render('register', {
        formData: res.locals.formData || {},  // Form data passed to the view (if any)
        user: req.session.user,              // User info from the session (if logged in)
        errors: res.locals.errors,           // Validation errors passed from the session
        messages: res.locals.messages        // Messages (success/error) passed from the session
    });
}

// Handles user registration: validates input, creates a new user, and redirects to login
function register(req, res) {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const address = req.body.address;
    const contact = req.body.contact;

    const formData = { username, email, address, contact };  // Save form data to send back in case of error
    const role = 'user';  // Default user role
    User.create({ username, email, password, address, contact, role, freeDelivery: false }, function (err) {
        if (err) {
            console.error('Error registering user:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Email already exists.');
            } else {
                req.flash('error', 'Unable to complete registration. Please try again.');
            }
            req.flash('formData', formData);  // Re-send form data back to the registration page
            return res.redirect('/register');  // Redirect back to the registration page on error
        }

        req.flash('success', 'Registration successful! Please log in.');
        return res.redirect('/login');  // Redirect to login page upon successful registration
    });
}

// Renders the login page, passing any messages or errors to the view
function showLogin(req, res) {
    res.render('login', {
        user: req.session.user,       // User info from session (if logged in)
        messages: res.locals.messages, // Success or error messages from session
        errors: res.locals.errors     // Validation errors from session
    });
}

// Handles user login: validates input, finds the user, and starts a session if login is successful
function login(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    User.findByEmailAndPassword(email, password, function (err, results) {
        if (err) {
            console.error('Error logging in:', err);
            req.flash('error', 'Unable to log in. Please try again.');
            return res.redirect('/login');
        }

        if (!results || results.length === 0) {
            return User.findByEmail(email, function (lookupErr, lookupResults) {
                if (lookupErr) {
                    console.error('Error checking account status on login:', lookupErr);
                    req.flash('error', 'Invalid email or password.');
                    return res.redirect('/login');
                }

                // Check if the account is disabled
                if (lookupResults && lookupResults.length && lookupResults[0].is_disabled) {
                    req.flash('error', 'This account has been disabled. Please contact support.');
                } else {
                    req.flash('error', 'Invalid email or password.');
                }
                return res.redirect('/login');
            });
        }

        const user = results[0];
        delete user.password; // Remove password before saving to session

        const hasTwoFactor = user.is_2fa_enabled && user.twofactor_secret; // Check if 2FA is enabled for the user

        return req.session.regenerate(function (regenErr) {
            if (regenErr) {
                console.error('Error regenerating session on login:', regenErr);
                req.flash('error', 'Unable to log in right now. Please try again.');
                return res.redirect('/login');
            }

            if (hasTwoFactor) {
                req.session.pending2FAUserId = user.id;
                req.session.pending2FAUserEmail = user.email;
                req.flash('success', 'Enter your 2FA code to finish signing in.');
                return req.session.save(function (saveErr) {
                    if (saveErr) {
                        console.error('Error saving 2FA session state:', saveErr);
                        req.flash('error', 'Unable to log in right now. Please try again.');
                        return res.redirect('/login');
                    }
                    return res.redirect('/login/2fa');  // Redirect to 2FA page if 2FA is enabled
                });
            }

            req.session.user = user; // Save the user session
            req.flash('success', 'Login successful!');

            req.session.save(function (saveErr) {
                if (saveErr) {
                    console.error('Error saving session on login:', saveErr);
                    req.flash('error', 'Unable to log in right now. Please try again.');
                    return res.redirect('/login');
                }

                if (user.role === 'admin') {
                    return res.redirect('/inventory');  // Redirect to admin inventory page if admin
                }
                return res.redirect('/shopping');  // Redirect to shopping page if regular user
            });
        });
    });
}

// Renders the 2FA login page if the user is pending 2FA verification
function showLogin2FA(req, res) {
    if (!req.session.pending2FAUserId) {
        req.flash('error', 'Please log in to continue.');
        return res.redirect('/login');
    }

    res.render('login-2fa', {
        user: null,                    // No user info, just the 2FA process
        email: req.session.pending2FAUserEmail || '', // Display email for 2FA verification
        messages: res.locals.messages,  // Display messages
        errors: res.locals.errors       // Display errors
    });
}

// Verifies the 2FA code entered by the user
function verifyLogin2FA(req, res) {
    const pendingUserId = req.session.pending2FAUserId;

    if (!pendingUserId) {
        req.flash('error', 'Please log in to continue.');
        return res.redirect('/login');
    }

    const token = req.body && req.body.token ? String(req.body.token).trim() : ''; // Get the entered token

    if (!token) {
        req.flash('error', 'Please enter the 6-digit code.');
        return res.redirect('/login/2fa');
    }

    User.findWithSecretById(pendingUserId, function (err, results) {
        if (err) {
            console.error('Error loading user for 2FA:', err);
            req.flash('error', 'Unable to verify 2FA right now. Please try again.');
            return res.redirect('/login/2fa');
        }

        if (!results || results.length === 0) {
            req.flash('error', 'Account not found. Please log in again.');
            req.session.pending2FAUserId = null;
            req.session.pending2FAUserEmail = null;
            return res.redirect('/login');
        }

        const user = results[0];

        if (!user.is_2fa_enabled || !user.twofactor_secret) {
            req.flash('error', 'Two-factor authentication is not enabled for this account.');
            req.session.pending2FAUserId = null;
            req.session.pending2FAUserEmail = null;
            return res.redirect('/login');
        }

        const isValid = speakeasy.totp.verify({
            secret: user.twofactor_secret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!isValid) {
            req.flash('error', 'Invalid 2FA code.');
            return res.redirect('/login/2fa');
        }

        delete user.password;  // Remove password after successful authentication
        delete user.twofactor_secret; // Remove 2FA secret after successful authentication

        req.session.user = user;  // Save user session
        req.session.pending2FAUserId = null;  // Clear pending 2FA state
        req.session.pending2FAUserEmail = null;

        req.flash('success', 'Login successful!');

        req.session.save(function (saveErr) {
            if (saveErr) {
                console.error('Error saving session after 2FA login:', saveErr);
                req.flash('error', 'Unable to complete login right now. Please try again.');
                return res.redirect('/login');
            }

            if (user.role === 'admin') {
                return res.redirect('/inventory');  // Redirect to admin inventory if admin
            }
            return res.redirect('/shopping');  // Redirect to shopping if regular user
        });
    });
}

// Renders the 2FA setup page where the user can scan the QR code to enable 2FA
function show2FASetup(req, res) {
    if (!req.session.user) {
        req.flash('error', 'Please log in to set up 2FA.');
        return res.redirect('/login');
    }

    const emailLabel = req.session.user.email || 'Supermarket App User';
    const secret = speakeasy.generateSecret({
        length: 20,
        name: 'Supermarket App (' + emailLabel + ')'
    });

    req.session.temp2FASecret = secret.base32;  // Store the secret temporarily

    qrcode.toDataURL(secret.otpauth_url, function (err, dataUrl) {
        if (err) {
            console.error('Error generating QR code:', err);
            req.flash('error', 'Unable to generate QR code right now. Please try again.');
            return res.redirect('/');
        }

        res.render('2fa-setup', {
            user: req.session.user,
            qrCodeDataURL: dataUrl,  // Display the QR code for 2FA setup
            manualKey: secret.base32, // Display the manual 2FA key for backup
            isEnabled: req.session.user && req.session.user.is_2fa_enabled,  // Check if 2FA is already enabled
            messages: res.locals.messages,
            errors: res.locals.errors
        });
    });
}

// Verifies the 2FA code entered during the setup process
function verify2FASetup(req, res) {
    if (!req.session.user) {
        req.flash('error', 'Please log in to set up 2FA.');
        return res.redirect('/login');
    }

    const submittedToken = req.body && req.body.token ? String(req.body.token).trim() : '';
    const tempSecret = req.session.temp2FASecret;

    if (!tempSecret) {
        req.flash('error', 'Please start the 2FA setup again to get a fresh code.');
        return res.redirect('/2fa/setup');
    }

    if (!submittedToken) {
        req.flash('error', 'Please enter the 6-digit code from your authenticator app.');
        return res.redirect('/2fa/setup');
    }

    const verified = speakeasy.totp.verify({
        secret: tempSecret,
        encoding: 'base32',
        token: submittedToken,
        window: 1
    });

    if (!verified) {
        req.flash('error', 'Invalid 2FA code. Please try again.');
        return res.redirect('/2fa/setup');
    }

    User.enableTwoFactor(req.session.user.id, tempSecret, function (err) {
        if (err) {
            console.error('Error saving 2FA secret:', err);
            req.flash('error', 'Unable to enable 2FA right now. Please try again.');
            return res.redirect('/2fa/setup');
        }

        req.session.user.is_2fa_enabled = 1;  // Mark 2FA as enabled for the user
        req.session.temp2FASecret = null;  // Clear temporary 2FA secret
        req.flash('success', 'Two-factor authentication has been enabled on your account.');

        if (req.session.user.role === 'admin') {
            return res.redirect('/inventory');  // Redirect to admin inventory if admin
        }
        return res.redirect('/shopping');  // Redirect to shopping if regular user
    });
}

// Logs out the user by destroying their session
function logout(req, res) {
    req.session.destroy(function () {
        res.redirect('/');  // Redirect to home page after logging out
    });
}

// Lists all users for admin management
function listUsers(req, res) {
    User.findAll(function (err, results) {
        if (err) {
            console.error('Error fetching users:', err);
            req.flash('error', 'Unable to load users.');
            return res.redirect('/inventory');
        }

        res.render('manageUsers', {
            users: results,        // List of users to display
            user: req.session.user, // User info from session
            messages: res.locals.messages, // Messages to display
            errors: res.locals.errors  // Errors to display
        });
    });
}

// Displays the edit user form for admins to modify user details
function editUserForm(req, res) {
    const userId = parseInt(req.params.id, 10);

    User.findById(userId, function (err, results) {
        if (err) {
            console.error('Error fetching user:', err);
            req.flash('error', 'Unable to load user.');
            return res.redirect('/admin/users');
        }

        if (!results || results.length === 0) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        res.render('edituser', {
            managedUser: results[0], // User to edit
            user: req.session.user,  // Logged-in admin info
            errors: res.locals.errors,
            messages: res.locals.messages
        });
    });
}

// Updates user role (admin or user) and free delivery status
function updateUserRole(req, res) {
    const userId = parseInt(req.params.id, 10);
    const role = req.body.role;
    const freeDelivery = req.body.freeDelivery;

    const allowedRoles = ['user', 'admin'];

    if (!role || allowedRoles.indexOf(role) === -1) {
        req.flash('error', 'Role is invalid.');
        return res.redirect('/admin/users/' + userId + '/edit');
    }

    const wantsFreeDelivery = freeDelivery === 'on' || freeDelivery === 'true' || freeDelivery === '1';

    function performUpdate() {
        User.updateRole(userId, role, wantsFreeDelivery, function (err, result) {
            if (err) {
                console.error('Error updating user role:', err);
                req.flash('error', 'Unable to update role.');
                return res.redirect('/admin/users/' + userId + '/edit');
            }

            if (result.affectedRows === 0) {
                req.flash('error', 'User not found.');
                return res.redirect('/admin/users');
            }

            req.flash('success', 'User permissions updated successfully.');

            if (req.session.user && req.session.user.id === userId) {
                req.session.user.role = role;
                req.session.user.free_delivery = wantsFreeDelivery ? 1 : 0;
            }
            return res.redirect('/admin/users');
        });
    }

    User.findById(userId, function (findErr, results) {
        if (findErr) {
            console.error('Error loading user before role update:', findErr);
            req.flash('error', 'Unable to update role.');
            return res.redirect('/admin/users');
        }

        if (!results || results.length === 0) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        const managedUser = results[0];
        const isRemovingAdminRights = managedUser.role === 'admin' && role !== 'admin';

        if (!isRemovingAdminRights) {
            return performUpdate();
        }

        return User.countAdmins(function (countErr, countResults) {
            if (countErr) {
                console.error('Error checking admin count before role update:', countErr);
                req.flash('error', 'Unable to update role.');
                return res.redirect('/admin/users');
            }

            const adminCount = countResults && countResults[0] ? countResults[0].adminCount : 0;

            if (adminCount <= 1) {
                req.flash('error', 'Cannot remove admin rights from the last remaining admin.');
                return res.redirect('/admin/users');
            }

            return performUpdate();
        });
    });
}

// Disables two-factor authentication for the user
function disableTwoFactor(req, res) {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
        req.flash('error', 'Invalid user selected.');
        return res.redirect('/admin/users');
    }

    User.findById(userId, function (findErr, results) {
        if (findErr) {
            console.error('Error fetching user before disabling 2FA:', findErr);
            req.flash('error', 'Unable to update user at this time.');
            return res.redirect('/admin/users');
        }

        if (!results || results.length === 0) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        const managedUser = results[0];

        return User.disableTwoFactor(userId, function (disableErr, disableResult) {
            if (disableErr) {
                console.error('Error disabling 2FA:', disableErr);
                req.flash('error', 'Unable to disable two-factor authentication right now.');
                return res.redirect('/admin/users');
            }

            if (!disableResult || disableResult.affectedRows === 0) {
                req.flash('error', 'User could not be updated.');
                return res.redirect('/admin/users');
            }

            if (req.session.user && req.session.user.id === userId) {
                req.session.user.is_2fa_enabled = 0;
                if ('twofactor_secret' in req.session.user) {
                    req.session.user.twofactor_secret = null;
                }
            }

            req.flash('success', 'Two-factor authentication has been disabled for "' + managedUser.username + '".');
            return res.redirect('/admin/users');
        });
    });
}

// Deletes the user from the system
function deleteUser(req, res) {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
        req.flash('error', 'Invalid user selected.');
        return res.redirect('/admin/users');
    }

    if (req.session.user && req.session.user.id === userId) {
        req.flash('error', 'You cannot disable your own account while signed in.');
        return res.redirect('/admin/users');
    }

    User.findById(userId, function (err, results) {
        if (err) {
            console.error('Error fetching user before disable:', err);
            req.flash('error', 'Unable to update user at this time.');
            return res.redirect('/admin/users');
        }

        if (!results || results.length === 0) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        const userToDisable = results[0];
        const willDisable = !userToDisable.is_disabled;

        function proceedWithToggle() {
            User.setDisabled(userId, willDisable, function (updateErr, updateResult) {
                if (updateErr) {
                    console.error('Error updating user status:', updateErr);
                    req.flash('error', 'Unable to update user at this time.');
                    return res.redirect('/admin/users');
                }

                if (updateResult.affectedRows === 0) {
                    req.flash('error', 'User could not be updated.');
                    return res.redirect('/admin/users');
                }

                req.flash('success', 'User "' + userToDisable.username + '" has been ' + (willDisable ? 'disabled' : 'enabled') + '.');
                return res.redirect('/admin/users');
            });
        }

        if (userToDisable.role === 'admin' && willDisable) {
            return User.countAdmins(function (countErr, countResults) {
                if (countErr) {
                    console.error('Error checking admin count before disable:', countErr);
                    req.flash('error', 'Unable to update user at this time.');
                    return res.redirect('/admin/users');
                }

                const adminCount = countResults && countResults[0] ? countResults[0].adminCount : 0;

                if (adminCount <= 1) {
                    req.flash('error', 'Cannot disable the last remaining admin account.');
                    return res.redirect('/admin/users');
                }

                return proceedWithToggle();
            });
        }

        return proceedWithToggle();
    });
}

module.exports = {
    showRegister: showRegister,
    register: register,
    showLogin: showLogin,
    login: login,
    showLogin2FA: showLogin2FA,
    verifyLogin2FA: verifyLogin2FA,
    show2FASetup: show2FASetup,
    verify2FASetup: verify2FASetup,
    logout: logout,
    listUsers: listUsers,
    editUserForm: editUserForm,
    updateUserRole: updateUserRole,
    disableTwoFactor: disableTwoFactor,
    deleteUser: deleteUser
};
