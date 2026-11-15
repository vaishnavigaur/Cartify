const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Item price cannot be negative']
    }
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    items: [cartItemSchema]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for total amount of cart
cartSchema.virtual('totalAmount').get(function () {
  if (!this.items || this.items.length === 0) return 0;
  const total = this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  return Math.round(total * 100) / 100;
});

// Virtual for total number of items
cartSchema.virtual('totalItems').get(function () {
  if (!this.items || this.items.length === 0) return 0;
  return this.items.reduce((acc, item) => acc + item.quantity, 0);
});

module.exports = mongoose.model('Cart', cartSchema);
