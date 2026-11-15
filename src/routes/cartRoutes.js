const express = require('express');
const router = express.Router();

const {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart
} = require('../controllers/cartController');

const {
  validateAddToCart,
  validateUpdateCartItem
} = require('../middleware/validation');

const { protect } = require('../middleware/auth');

// All cart operations require user authentication
router.use(protect);

router.get('/', getCart);
router.post('/', validateAddToCart, addItem);
router.put('/:itemId', validateUpdateCartItem, updateItemQuantity);
router.delete('/:itemId', removeItem);
router.delete('/', clearCart);

module.exports = router;
