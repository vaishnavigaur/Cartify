const { sendResponse } = require('../utils/helpers');

/**
 * Handle 404 routes
 */
const notFoundHandler = (req, res, next) => {
  return sendResponse(res, {
    statusCode: 404,
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Global application error handler
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}': '${err.value}'`;
  }

  // Mongoose duplicate key (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    message = `Duplicate value '${value}' entered for ${field}. Please use another value.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation failed';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message
    }));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  if (process.env.NODE_ENV !== 'test' && statusCode === 500) {
    console.error('[Global Error]', err);
  }

  const responsePayload = {
    statusCode,
    success: false,
    message,
    errors
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    responsePayload.data = { stack: err.stack };
  }

  return sendResponse(res, responsePayload);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
