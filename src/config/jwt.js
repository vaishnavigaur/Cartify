const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cartify_fallback_secret_key_change_in_production_2026';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Generate a signed JWT token
 * @param {Object} payload - Data to embed in the token (e.g., { id, role })
 * @param {string} [expiresIn] - Optional custom expiry
 * @returns {string} - Signed JWT string
 */
const generateToken = (payload, expiresIn = JWT_EXPIRE) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - Bearer JWT token
 * @returns {Object} - Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRE,
  generateToken,
  verifyToken
};
