const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const { sendResponse } = require('../utils/helpers');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendResponse(res, {
        statusCode: 409,
        success: false,
        message: 'A user with this email address already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      phone: phone || '',
      address: address || {}
    });

    // Generate JWT token
    const token = generateToken({ id: user._id, role: user.role });

    return sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(res, {
        statusCode: 401,
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendResponse(res, {
        statusCode: 401,
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return sendResponse(res, {
        statusCode: 403,
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Generate JWT token
    const token = generateToken({ id: user._id, role: user.role });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Login successful',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'User not found'
      });
    }

    const { name, phone, address, currentPassword, newPassword } = req.body;

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address) {
      user.address = {
        ...user.address,
        ...address
      };
    }

    // Password change
    if (newPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: 'Current password does not match'
        });
      }
      user.password = newPassword;
    }

    await user.save();

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
