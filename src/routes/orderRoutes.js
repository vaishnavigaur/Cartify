const express = require('express');
const router = express.Router();

const {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  simulateOrderPayment
} = require('../controllers/orderController');

const {
  validateCheckout,
  validateMongoId
} = require('../middleware/validation');

const { protect, authorize } = require('../middleware/auth');

// All order operations require authentication
router.use(protect);

router.post('/', validateCheckout, createOrder);
router.get('/', getUserOrders);
router.get('/:id', validateMongoId('id'), getOrderById);
router.put('/:id/status', authorize('admin'), validateMongoId('id'), updateOrderStatus);
router.post('/:id/pay', validateMongoId('id'), simulateOrderPayment);

module.exports = router;
