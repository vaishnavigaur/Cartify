const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} = require('../controllers/productController');

const {
  validateProduct,
  validateProductUpdate,
  validateMongoId
} = require('../middleware/validation');

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', validateMongoId('id'), getProductById);

// Admin-only routes
router.post('/', protect, authorize('admin'), validateProduct, createProduct);
router.put('/:id', protect, authorize('admin'), validateProductUpdate, updateProduct);
router.delete('/:id', protect, authorize('admin'), validateMongoId('id'), deleteProduct);

module.exports = router;
