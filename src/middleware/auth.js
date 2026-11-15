const User = require('../models/User');
const { verifyToken } = require('../config/jwt');
const { sendResponse } = require('../utils/helpers');

/**
 * Protect routes - require valid JWT token
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendResponse(res, {
      statusCode: 401,
      success: false,
      message: 'Not authorized, access token is missing'
    });
  }

  try {
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendResponse(res, {
        statusCode: 401,
        success: false,
        message: 'The user belonging to this token no longer exists'
      });
    }

    if (!user.isActive) {
      return sendResponse(res, {
        statusCode: 403,
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return sendResponse(res, {
      statusCode: 401,
      success: false,
      message: 'Not authorized, token is invalid or expired'
    });
  }
};

/**
 * Grant access to specific roles (e.g. 'admin')
 * @param  {...string} roles 
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendResponse(res, {
        statusCode: 403,
        success: false,
        message: `Forbidden: User role '${req.user ? req.user.role : 'guest'}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
