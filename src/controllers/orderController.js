const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendResponse, calculatePricing, simulatePayment } = require('../utils/helpers');

/**
 * @desc    Create new order / checkout with payment simulation
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = async (req, res, next) => {
  try {
    const {
      shippingAddress,
      paymentMethod = 'simulation',
      cardDetails,
      simulationOutcome = 'SUCCESS',
      items: directItems
    } = req.body;

    let orderItems = [];

    // 1. Determine items: either from direct payload or from user's active Cart
    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
      orderItems = directItems;
    } else {
      const cart = await Cart.findOne({ user: req.user._id });
      if (!cart || !cart.items || cart.items.length === 0) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: 'Your cart is empty. Add items before checking out.'
        });
      }
      orderItems = cart.items.map((item) => ({
        product: item.product,
        quantity: item.quantity
      }));
    }

    // 2. Validate product availability and pull current details & prices
    const validatedItems = [];
    for (const item of orderItems) {
      const productId = item.product._id || item.product;
      const product = await Product.findById(productId);

      if (!product || !product.isActive) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: `Product ${productId} is not available`
        });
      }

      if (product.stock < item.quantity) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: `Insufficient stock for product '${product.name}'. Available: ${product.stock}, requested: ${item.quantity}`
        });
      }

      validatedItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        image: product.imageUrl
      });
    }

    // 3. Calculate pricing breakdown
    const { itemsPrice, shippingPrice, taxPrice, totalPrice } = calculatePricing(validatedItems);

    // 4. Simulate payment gateway processing
    const paymentResult = await simulatePayment({
      amount: totalPrice,
      currency: 'USD',
      paymentMethod,
      cardDetails: cardDetails || {},
      simulationOutcome
    });

    const isPaid = paymentResult.status === 'COMPLETED';

    // 5. If payment succeeds, decrement inventory stock
    if (isPaid) {
      for (const item of validatedItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // 6. Create order in database
    const order = await Order.create({
      user: req.user._id,
      items: validatedItems,
      shippingAddress,
      paymentMethod,
      paymentResult: {
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
        gateway: paymentResult.gateway || 'CartifyPaymentGatewaySim',
        failureReason: paymentResult.failureReason,
        timestamp: paymentResult.timestamp
      },
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      isPaid,
      paidAt: isPaid ? new Date() : undefined,
      orderStatus: isPaid ? 'Processing' : 'Pending'
    });

    // 7. Clear user's cart if payment was successful and order was from cart
    if (isPaid) {
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { items: [] } }
      );
    }

    return sendResponse(res, {
      statusCode: 201,
      success: true,
      message: isPaid
        ? 'Order placed successfully and payment completed'
        : `Order created but payment failed: ${paymentResult.failureReason || 'Declined'}`,
      data: {
        order,
        paymentSimulation: paymentResult
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged in user's orders
 * @route   GET /api/orders
 * @access  Private
 */
const getUserOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const query = { user: req.user._id };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('items.product', 'name price imageUrl category'),
      Order.countDocuments(query)
    ]);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Orders retrieved successfully',
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalOrders: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name price imageUrl category');

    if (!order) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Order not found'
      });
    }

    // Ensure order belongs to logged-in user OR user is admin
    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendResponse(res, {
        statusCode: 403,
        success: false,
        message: 'Forbidden: You do not have permission to view this order'
      });
    }

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Order retrieved successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (!orderStatus || !validStatuses.includes(orderStatus)) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: `Invalid orderStatus. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Order not found'
      });
    }

    order.orderStatus = orderStatus;
    if (orderStatus === 'Delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Order status updated to '${orderStatus}'`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retry payment simulation for an existing pending order
 * @route   POST /api/orders/:id/pay
 * @access  Private
 */
const simulateOrderPayment = async (req, res, next) => {
  try {
    const { simulationOutcome = 'SUCCESS', cardDetails, paymentMethod = 'simulation' } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendResponse(res, {
        statusCode: 403,
        success: false,
        message: 'Forbidden: Not authorized to pay for this order'
      });
    }

    if (order.isPaid) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: 'Order is already marked as paid'
      });
    }

    const paymentResult = await simulatePayment({
      amount: order.totalPrice,
      currency: 'USD',
      paymentMethod,
      cardDetails: cardDetails || {},
      simulationOutcome
    });

    if (paymentResult.status === 'COMPLETED') {
      order.isPaid = true;
      order.paidAt = new Date();
      order.orderStatus = 'Processing';
      order.paymentResult = {
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
        gateway: paymentResult.gateway,
        timestamp: paymentResult.timestamp
      };

      // Decrement inventory stock now
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }

      await order.save();

      // Clear user's cart
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { items: [] } }
      );
    } else {
      order.paymentResult = {
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
        failureReason: paymentResult.failureReason,
        timestamp: paymentResult.timestamp
      };
      await order.save();
    }

    return sendResponse(res, {
      statusCode: 200,
      success: paymentResult.status === 'COMPLETED',
      message: paymentResult.status === 'COMPLETED'
        ? 'Payment simulation succeeded'
        : `Payment simulation declined: ${paymentResult.failureReason}`,
      data: {
        order,
        paymentSimulation: paymentResult
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  simulateOrderPayment
};
