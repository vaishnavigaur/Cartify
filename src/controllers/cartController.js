const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendResponse } = require('../utils/helpers');

/**
 * Helper to fetch or create a cart for a user with populated products
 * @param {string} userId
 */
const getOrCreatePopulatedCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    select: 'name price imageUrl stock category isActive'
  });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

/**
 * @desc    Get user's shopping cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreatePopulatedCart(req.user._id);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Cart retrieved successfully',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/cart
 * @access  Private
 */
const addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const addQty = parseInt(quantity, 10);

    // Validate product existence and availability
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Product not found or currently unavailable'
      });
    }

    if (product.stock < addQty) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: `Insufficient stock. Only ${product.stock} units available.`
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + addQty;
      if (newQuantity > product.stock) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: `Cannot add more. You have ${cart.items[existingItemIndex].quantity} in cart, and available stock is ${product.stock}.`
        });
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].price = product.price; // Update with latest price
    } else {
      cart.items.push({
        product: product._id,
        quantity: addQty,
        price: product.price
      });
    }

    await cart.save();

    // Populate for response
    await cart.populate({
      path: 'items.product',
      select: 'name price imageUrl stock category isActive'
    });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update quantity of an item in cart
 * @route   PUT /api/cart/:itemId
 * @access  Private
 */
const updateItemQuantity = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const newQty = parseInt(quantity, 10);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Cart not found'
      });
    }

    // Match by item _id or product _id
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId || item.product.toString() === itemId
    );

    if (itemIndex === -1) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Check product stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Product no longer exists'
      });
    }

    if (newQty > product.stock) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock} available)`
      });
    }

    cart.items[itemIndex].quantity = newQty;
    cart.items[itemIndex].price = product.price;

    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name price imageUrl stock category isActive'
    });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Cart item updated successfully',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove an item from cart
 * @route   DELETE /api/cart/:itemId
 * @access  Private
 */
const removeItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Cart not found'
      });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item._id.toString() !== itemId && item.product.toString() !== itemId
    );

    if (cart.items.length === initialLength) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Item not found in cart'
      });
    }

    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name price imageUrl stock category isActive'
    });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Cart cleared successfully',
      data: {
        items: [],
        totalAmount: 0,
        totalItems: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart
};
