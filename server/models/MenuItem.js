const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  name: {
    EN: {
      type: String,
      required: [true, 'English name is required'],
      trim: true,
      maxlength: [100, 'English name cannot exceed 100 characters']
    },
    AR: {
      type: String,
      required: [true, 'Arabic name is required'],
      trim: true,
      maxlength: [100, 'Arabic name cannot exceed 100 characters']
    }
  },
  description: {
    EN: {
      type: String,
      required: [true, 'English description is required'],
      trim: true,
      maxlength: [500, 'English description cannot exceed 500 characters']
    },
    AR: {
      type: String,
      required: [true, 'Arabic description is required'],
      trim: true,
      maxlength: [500, 'Arabic description cannot exceed 500 characters']
    }
  },
  price: {
    EN: {
      type: Number,
      required: [true, 'English price is required'],
      min: [0, 'Price cannot be negative']
    },
    AR: {
      type: String,
      required: [true, 'Arabic price is required'],
      trim: true
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['coffee', 'tea', 'pastries', 'special'],
    index: true
  },
  image: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
MenuItemSchema.index({ 'name.EN': 1, category: 1 });
MenuItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MenuItem', MenuItemSchema);
