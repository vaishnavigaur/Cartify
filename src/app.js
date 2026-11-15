require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Route handlers
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors());

// Request logging (skip during test execution)
if (!isTestEnv) {
  app.use(morgan('dev'));
}

// Body parsing with size restrictions
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Global rate limiting to prevent abuse (disabled during testing)
if (!isTestEnv) {
  const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP address. Please try again after 15 minutes.'
    }
  });
  app.use('/api', globalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Cartify E-commerce Backend API is healthy and operational',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`
  });
});

// Welcome / overview endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Cartify E-Commerce RESTful API',
    version: '1.0.0',
    documentation: '/docs/api-documentation.md',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      health: '/api/health'
    }
  });
});

// Mount application API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// If app.js executed directly (e.g. node src/app.js), delegate to server.js
if (require.main === module && !isTestEnv) {
  require('./server');
}

module.exports = app;
