const db = require('../db');

/**
 * Create a user record in the database.
 * @param {Object} userData - User fields to insert.
 * @param {Function} callback - Node-style callback (err, results).
 */
const create = (userData, callback) => {
    const { username, email, password, address, contact, role, freeDelivery = 0 } = userData;
    const sql = `
        INSERT INTO users (username, email, password, address, contact, role, free_delivery, is_disabled)
        VALUES (?, ?, SHA1(?), ?, ?, ?, ?, 0)
    `;
    db.query(sql, [username, email, password, address, contact, role, freeDelivery ? 1 : 0], callback);
};

/**
 * Retrieve a user by email.
 * @param {string} email - The email to search for.
 * @param {Function} callback - Node-style callback (err, results).
 */
const findByEmail = (email, callback) => {
    const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    db.query(sql, [email], callback);
};

/**
 * Retrieve a user by email and plain-text password.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's plain-text password.
 * @param {Function} callback - Node-style callback (err, results).
 */
const findByEmailAndPassword = (email, password, callback) => {
    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?) AND is_disabled = 0';
    db.query(sql, [email, password], callback);
};

/**
 * Retrieve all users.
 * @param {Function} callback - Node-style callback (err, results).
 */
const findAll = (callback) => {
    const sql = 'SELECT id, username, email, role, contact, address, free_delivery, is_disabled FROM users';
    db.query(sql, callback);
};

/**
 * Retrieve a user by id.
 * @param {number} id - User id.
 * @param {Function} callback - Node-style callback (err, results).
 */
const findById = (id, callback) => {
    const sql = 'SELECT id, username, email, role, contact, address, free_delivery, is_disabled FROM users WHERE id = ?';
    db.query(sql, [id], callback);
};

/**
 * Permanently delete a user.
 * @param {number} id - User id.
 * @param {Function} callback - Node-style callback (err, results).
 */
const remove = (id, callback) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [id], callback);
};

/**
 * Update a user's role.
 * @param {number} id - User id.
 * @param {string} role - New role.
 * @param {Function} callback - Node-style callback (err, results).
 */
const updateRole = (id, role, freeDelivery, callback) => {
    const sql = 'UPDATE users SET role = ?, free_delivery = ? WHERE id = ?';
    db.query(sql, [role, freeDelivery ? 1 : 0, id], callback);
};

/**
 * Count the number of admin users.
 * @param {Function} callback - Node-style callback (err, results).
 */
const countAdmins = (callback) => {
    const sql = 'SELECT COUNT(*) AS adminCount FROM users WHERE role = ?';
    db.query(sql, ['admin'], callback);
};

/**
 * Enable or disable a user account without deleting history.
 * @param {number} id
 * @param {boolean} disabled
 * @param {Function} callback
 */
const setDisabled = (id, disabled, callback) => {
    const sql = 'UPDATE users SET is_disabled = ? WHERE id = ?';
    db.query(sql, [disabled ? 1 : 0, id], callback);
};

module.exports = {
    create,
    findByEmail,
    findByEmailAndPassword,
    findAll,
    findById,
    remove,
    updateRole,
    countAdmins,
    setDisabled
};
