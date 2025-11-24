const User = require('../models/user');

const showRegister = (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0],
        user: req.session.user
    });
};

const register = (req, res) => {
    const { username, email, password, address, contact } = req.body;

    const formData = { username, email, address, contact };
    const role = 'user';
    User.create({ username, email, password, address, contact, role, freeDelivery: false }, (err) => {
        if (err) {
            console.error('Error registering user:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'Email already exists.');
            } else {
                req.flash('error', 'Unable to complete registration. Please try again.');
            }
            req.flash('formData', formData);
            return res.redirect('/register');
        }

        req.flash('success', 'Registration successful! Please log in.');
        return res.redirect('/login');
    });
};

const showLogin = (req, res) => {
    res.render('login', {
        user: req.session.user,
        messages: req.flash('success'),
        errors: req.flash('error')
    });
};

const login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    User.findByEmailAndPassword(email, password, (err, results) => {
        if (err) {
            console.error('Error logging in:', err);
            req.flash('error', 'Unable to log in. Please try again.');
            return res.redirect('/login');
        }

        if (results.length === 0) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const user = results[0];
        // Remove hashed password before storing user in session
        delete user.password;

        // Regenerate session to avoid fixation and ensure it is persisted before redirect
        return req.session.regenerate((regenErr) => {
            if (regenErr) {
                console.error('Error regenerating session on login:', regenErr);
                req.flash('error', 'Unable to log in right now. Please try again.');
                return res.redirect('/login');
            }

            req.session.user = user;
            req.flash('success', 'Login successful!');

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('Error saving session on login:', saveErr);
                    req.flash('error', 'Unable to log in right now. Please try again.');
                    return res.redirect('/login');
                }

                if (user.role === 'admin') {
                    return res.redirect('/inventory');
                }
                return res.redirect('/shopping');
            });
        });
    });
};

const logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

const listUsers = (req, res) => {
    User.findAll((err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            req.flash('error', 'Unable to load users.');
            return res.redirect('/inventory');
        }

        res.render('manageUsers', {
            users: results,
            user: req.session.user,
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
};

const editUserForm = (req, res) => {
    const userId = parseInt(req.params.id, 10);

    User.findById(userId, (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            req.flash('error', 'Unable to load user.');
            return res.redirect('/admin/users');
        }

        if (results.length === 0) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        res.render('edituser', {
            managedUser: results[0],
            user: req.session.user,
            errors: req.flash('error'),
            messages: req.flash('success')
        });
    });
};

const updateUserRole = (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { role, freeDelivery } = req.body;

    const allowedRoles = ['user', 'admin'];

    if (!role || !allowedRoles.includes(role)) {
        req.flash('error', 'Role is invalid.');
        return res.redirect(`/admin/users/${userId}/edit`);
    }

    const wantsFreeDelivery = freeDelivery === 'on' || freeDelivery === 'true' || freeDelivery === '1';

    const performUpdate = () => {
        User.updateRole(userId, role, wantsFreeDelivery, (err, result) => {
            if (err) {
                console.error('Error updating user role:', err);
                req.flash('error', 'Unable to update role.');
                return res.redirect(`/admin/users/${userId}/edit`);
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
    };

    User.findById(userId, (findErr, results) => {
        if (findErr) {
            console.error('Error loading user before role update:', findErr);
            req.flash('error', 'Unable to update role.');
            return res.redirect('/admin/users');
        }

        if (results.length === 0) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        const managedUser = results[0];
        const isRemovingAdminRights = managedUser.role === 'admin' && role !== 'admin';

        if (!isRemovingAdminRights) {
            return performUpdate();
        }

        return User.countAdmins((countErr, countResults) => {
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
};

const deleteUser = (req, res) => {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
        req.flash('error', 'Invalid user selected.');
        return res.redirect('/admin/users');
    }

    if (req.session.user && req.session.user.id === userId) {
        req.flash('error', 'You cannot delete your own account while signed in.');
        return res.redirect('/admin/users');
    }

    User.findById(userId, (err, results) => {
        if (err) {
            console.error('Error fetching user before delete:', err);
            req.flash('error', 'Unable to delete user at this time.');
            return res.redirect('/admin/users');
        }

        if (results.length === 0) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        const userToDelete = results[0];

        const proceedWithDelete = () => {
            User.remove(userId, (deleteErr, deleteResult) => {
                if (deleteErr) {
                    console.error('Error deleting user:', deleteErr);
                    req.flash('error', 'Unable to delete user at this time.');
                    return res.redirect('/admin/users');
                }

                if (deleteResult.affectedRows === 0) {
                    req.flash('error', 'User could not be deleted.');
                    return res.redirect('/admin/users');
                }

                req.flash('success', `User "${userToDelete.username}" deleted successfully.`);
                return res.redirect('/admin/users');
            });
        };

        if (userToDelete.role === 'admin') {
            return User.countAdmins((countErr, countResults) => {
                if (countErr) {
                    console.error('Error checking admin count before delete:', countErr);
                    req.flash('error', 'Unable to delete user at this time.');
                    return res.redirect('/admin/users');
                }

                const adminCount = countResults && countResults[0] ? countResults[0].adminCount : 0;

                if (adminCount <= 1) {
                    req.flash('error', 'Cannot delete the last remaining admin account.');
                    return res.redirect('/admin/users');
                }

                return proceedWithDelete();
            });
        }

        return proceedWithDelete();
    });
};

module.exports = {
    showRegister,
    register,
    showLogin,
    login,
    logout,
    listUsers,
    editUserForm,
    updateUserRole,
    deleteUser
};

