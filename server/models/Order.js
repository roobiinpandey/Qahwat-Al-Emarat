const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  orderType: {
    type: String,
    required: [true, 'Order type is required'],
    enum: ['dine-in', 'takeaway', 'delivery'],
    index: true
  },
  tableNumber: {
    type: String,
    trim: true,
    required: function() { return this.orderType === 'dine-in'; }
  },
  deliveryAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'Delivery address cannot exceed 500 characters'],
    required: function() { return this.orderType === 'delivery'; }
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Special instructions cannot exceed 500 characters'],
    default: ''
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Menu item reference is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [50, 'Quantity cannot exceed 50']
    },
    priceAtOrder: {
      type: Number,
      required: [true, 'Price at order time is required'],
      min: [0, 'Price cannot be negative']
    }
  }],
  total: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total cannot be negative']
  },
  status: {
    type: String,
    enum: ['new', 'pending', 'completed'],
    default: 'new',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    required: [true, 'Payment method is required']
  }
}, {
  timestamps: true
});

// Indexes for performance
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'customerPhone': 1 });
OrderSchema.index({ createdAt: -1 });

// Virtual for formatted total
OrderSchema.virtual('formattedTotal').get(function() {
  return `AED ${this.total.toFixed(2)}`;
});

// Ensure virtual fields are serialized
OrderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Order', OrderSchema);
