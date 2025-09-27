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
  sizes: [{
    name: {
      EN: {
        type: String,
        required: true,
        enum: ['250g', '500g', '1kg']
      },
      AR: {
        type: String,
        required: true,
        enum: ['250 جرام', '500 جرام', '1 كيلو']
      }
    },
    price: {
      EN: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
      },
      AR: {
        type: String,
        required: true,
        trim: true
      }
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
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

// Pre-save middleware to handle size defaults and backward compatibility
MenuItemSchema.pre('save', function(next) {
  // If no sizes are defined, create default sizes based on the main price
  if (!this.sizes || this.sizes.length === 0) {
    this.sizes = [
      {
        name: { EN: '250g', AR: '250 جرام' },
        price: { EN: this.price.EN * 0.8, AR: this.price.AR }, // 20% discount for smallest size
        isDefault: false
      },
      {
        name: { EN: '500g', AR: '500 جرام' },
        price: { EN: this.price.EN, AR: this.price.AR }, // Base price for medium size
        isDefault: true
      },
      {
        name: { EN: '1kg', AR: '1 كيلو' },
        price: { EN: this.price.EN * 1.8, AR: this.price.AR }, // 80% more for largest size
        isDefault: false
      }
    ];
  } else {
    // Ensure at least one size is marked as default
    const hasDefault = this.sizes.some(size => size.isDefault);
    if (!hasDefault && this.sizes.length > 0) {
      this.sizes[0].isDefault = true;
    }
  }
  
  next();
});

// Virtual for getting default size
MenuItemSchema.virtual('defaultSize').get(function() {
  return this.sizes.find(size => size.isDefault) || this.sizes[0];
});

// Virtual for getting default price (for backward compatibility)
MenuItemSchema.virtual('defaultPrice').get(function() {
  const defaultSize = this.defaultSize;
  return defaultSize ? defaultSize.price : this.price;
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);
