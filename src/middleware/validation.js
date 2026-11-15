const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { sendResponse } = require('../utils/helpers');

/**
 * Handle validation errors from express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  next();
};

/**
 * Common MongoId param validator
 */
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage(`Invalid ${paramName} format`),
  handleValidationErrors
];

/**
 * User Registration Validation
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  body('phone')
    .optional()
    .trim(),
  handleValidationErrors
];

/**
 * User Login Validation
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Profile Update Validation
 */
const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim(),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.postalCode').optional().trim(),
  body('address.country').optional().trim(),
  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('currentPassword')
    .if(body('newPassword').exists())
    .notEmpty()
    .withMessage('Current password is required to set a new password'),
  handleValidationErrors
];

/**
 * Product Creation Validation
 */
const validateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 120 })
    .withMessage('Product name cannot exceed 120 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required'),
  body('price')
    .notEmpty()
    .withMessage('Product price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('stock')
    .notEmpty()
    .withMessage('Stock is required')
    .isInt({ min: 0 })
    .withMessage('Stock must be an integer greater than or equal to 0'),
  body('imageUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('brand')
    .optional()
    .trim(),
  handleValidationErrors
];

/**
 * Product Update Validation
 */
const validateProductUpdate = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid product ID format'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Product name must be between 1 and 120 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product description cannot be empty'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be an integer greater than or equal to 0'),
  body('imageUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  handleValidationErrors
];

/**
 * Add item to cart validation
 */
const validateAddToCart = [
  body('productId')
    .notEmpty()
    .withMessage('productId is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid productId format'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer of at least 1'),
  handleValidationErrors
];

/**
 * Update cart item quantity validation
 */
const validateUpdateCartItem = [
  param('itemId')
    .notEmpty()
    .withMessage('itemId is required'),
  body('quantity')
    .notEmpty()
    .withMessage('quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer of at least 1'),
  handleValidationErrors
];

/**
 * Checkout / Order creation validation
 */
const validateCheckout = [
  body('shippingAddress')
    .notEmpty()
    .withMessage('shippingAddress is required')
    .isObject()
    .withMessage('shippingAddress must be an object'),
  body('shippingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Shipping street is required'),
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('Shipping city is required'),
  body('shippingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('Shipping state is required'),
  body('shippingAddress.postalCode')
    .trim()
    .notEmpty()
    .withMessage('Shipping postalCode is required'),
  body('shippingAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Shipping country is required'),
  body('paymentMethod')
    .optional()
    .trim(),
  body('simulationOutcome')
    .optional()
    .isIn(['SUCCESS', 'DECLINED', 'INSUFFICIENT_FUNDS'])
    .withMessage('simulationOutcome must be SUCCESS, DECLINED, or INSUFFICIENT_FUNDS'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateMongoId,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateProduct,
  validateProductUpdate,
  validateAddToCart,
  validateUpdateCartItem,
  validateCheckout
};
