const crypto = require('crypto');

/**
 * Standard unified response helper for consistent API output
 * @param {import('express').Response} res - Express response object
 * @param {Object} options
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {boolean} [options.success=true] - Success flag
 * @param {string} [options.message] - Descriptive message
 * @param {any} [options.data] - Main payload data
 * @param {Object} [options.pagination] - Pagination metadata
 * @param {Array} [options.errors] - Validation or execution errors
 */
const sendResponse = (res, { statusCode = 200, success = true, message, data, pagination, errors } = {}) => {
  const responseBody = {
    success
  };

  if (message) {
    responseBody.message = message;
  }

  if (data !== undefined) {
    responseBody.data = data;
  }

  if (pagination) {
    responseBody.pagination = pagination;
  }

  if (errors && errors.length > 0) {
    responseBody.errors = errors;
  }

  return res.status(statusCode).json(responseBody);
};

/**
 * Calculate order pricing breakdown
 * @param {Array<{ price: number, quantity: number }>} items
 * @param {number} [taxRate=0.08] - 8% tax rate
 * @param {number} [freeShippingThreshold=100] - Free shipping over $100
 * @param {number} [standardShippingFee=10]
 * @returns {{ itemsPrice: number, taxPrice: number, shippingPrice: number, totalPrice: number }}
 */
const calculatePricing = (items = [], taxRate = 0.08, freeShippingThreshold = 100, standardShippingFee = 10) => {
  const rawItemsPrice = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
  const itemsPrice = Math.round(rawItemsPrice * 100) / 100;

  // Free shipping over threshold, or $0 if no items
  const shippingPrice = itemsPrice === 0 || itemsPrice >= freeShippingThreshold ? 0 : standardShippingFee;

  // Calculate sales tax
  const taxPrice = Math.round(itemsPrice * taxRate * 100) / 100;

  // Total
  const totalPrice = Math.round((itemsPrice + shippingPrice + taxPrice) * 100) / 100;

  return {
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice
  };
};

/**
 * Payment simulation engine
 * Supports realistic card simulations, failure testing, and gateway responses
 * @param {Object} options
 * @param {number} options.amount
 * @param {string} [options.currency='USD']
 * @param {string} [options.paymentMethod='card']
 * @param {Object} [options.cardDetails]
 * @param {boolean|string} [options.simulationOutcome='SUCCESS'] - 'SUCCESS' | 'DECLINED' | 'INSUFFICIENT_FUNDS'
 * @returns {Promise<Object>}
 */
const simulatePayment = async ({
  amount,
  currency = 'USD',
  paymentMethod = 'card',
  cardDetails = {},
  simulationOutcome = 'SUCCESS'
}) => {
  // Simulate network latency (50ms - 150ms)
  await new Promise((resolve) => setTimeout(resolve, 80));

  const transactionId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  // Test triggers for simulation failure:
  // 1. Explicit outcome flag
  // 2. Magic card numbers: "0000 0000 0000 0000" (decline), "4000 0000 0000 0002" (insufficient funds)
  // 3. Negative or zero amount
  const cardNumberClean = (cardDetails.cardNumber || '').replace(/\s+/g, '');

  if (amount <= 0) {
    return {
      success: false,
      transactionId,
      status: 'FAILED',
      failureReason: 'Invalid transaction amount',
      amount,
      currency,
      timestamp: now
    };
  }

  if (
    simulationOutcome === 'DECLINED' ||
    simulationOutcome === 'FAIL' ||
    cardNumberClean === '0000000000000000'
  ) {
    return {
      success: false,
      transactionId,
      status: 'DECLINED',
      failureReason: 'Card declined by simulated issuer',
      amount,
      currency,
      timestamp: now
    };
  }

  if (
    simulationOutcome === 'INSUFFICIENT_FUNDS' ||
    cardNumberClean === '4000000000000002'
  ) {
    return {
      success: false,
      transactionId,
      status: 'FAILED',
      failureReason: 'Insufficient funds on simulated account',
      amount,
      currency,
      timestamp: now
    };
  }

  // Successful payment
  const last4 = cardNumberClean.length >= 4 ? cardNumberClean.slice(-4) : '4242';

  return {
    success: true,
    transactionId,
    status: 'COMPLETED',
    gateway: 'CartifyPaymentGatewaySim',
    amount,
    currency,
    paymentMethod,
    cardDetails: {
      brand: cardDetails.brand || 'Visa',
      last4
    },
    timestamp: now
  };
};

module.exports = {
  sendResponse,
  calculatePricing,
  simulatePayment
};
