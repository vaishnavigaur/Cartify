const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [120, 'Product name cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
      type: Number,
      required: [true, 'Please provide a product price'],
      min: [0, 'Price cannot be negative']
    },
    category: {
      type: String,
      required: [true, 'Please provide a product category'],
      trim: true,
      lowercase: true
    },
    stock: {
      type: Number,
      required: [true, 'Please provide product stock count'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
    },
    brand: {
      type: String,
      trim: true,
      default: 'Generic'
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true
    },
    rating: {
      average: {
        type: Number,
        default: 4.5,
        min: [0, 'Rating cannot be less than 0'],
        max: [5, 'Rating cannot be greater than 5']
      },
      count: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound text index for search
productSchema.index({
  name: 'text',
  description: 'text',
  category: 'text',
  brand: 'text'
});

// Indexes for fast filtering & sorting
productSchema.index({ category: 1, price: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
