const Product = require('../models/Product');
const { sendResponse } = require('../utils/helpers');

/**
 * @desc    Get all products with pagination, search, filter & sorting
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      sort,
      search,
      q,
      minPrice,
      maxPrice,
      inStock
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    // Build query object
    const query = { isActive: true };

    // Category filter
    if (category) {
      query.category = category.toLowerCase().trim();
    }

    // Keyword search (via text index or regex)
    const searchTerm = search || q;
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Price range filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined && !isNaN(minPrice)) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(maxPrice)) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // In stock filter
    if (inStock === 'true' || inStock === true) {
      query.stock = { $gt: 0 };
    }

    // Build sort options
    const sortOptions = {};
    if (sort === 'price_asc') {
      sortOptions.price = 1;
    } else if (sort === 'price_desc') {
      sortOptions.price = -1;
    } else if (sort === 'rating') {
      sortOptions['rating.average'] = -1;
    } else if (sort === 'name_asc') {
      sortOptions.name = 1;
    } else {
      sortOptions.createdAt = -1; // Newest first
    }

    // Execute query with pagination
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .limit(limitNumber)
        .skip((pageNumber - 1) * limitNumber),
      Product.countDocuments(query)
    ]);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Products retrieved successfully',
      data: products,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber) || 1,
        totalProducts: total,
        limit: limitNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || !product.isActive) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Product not found'
      });
    }

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product retrieved successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      imageUrl,
      brand,
      sku,
      rating
    } = req.body;

    const generatedSku =
      sku ||
      `${(category || 'GEN').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const product = await Product.create({
      name,
      description,
      price,
      category: category.toLowerCase().trim(),
      stock,
      imageUrl: imageUrl || undefined,
      brand: brand || 'Generic',
      sku: generatedSku,
      rating: rating || { average: 4.5, count: 0 }
    });

    return sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Product not found'
      });
    }

    if (req.body.category) {
      req.body.category = req.body.category.toLowerCase().trim();
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product (or soft delete)
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Product deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all distinct product categories
 * @route   GET /api/products/categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Categories retrieved successfully',
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
};
