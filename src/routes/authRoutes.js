const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const {
  validateRegister,
  validateLogin,
  validateUpdateProfile
} = require('../middleware/validation');

const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validateUpdateProfile, updateProfile);

module.exports = router;
