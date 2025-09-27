const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: [true, 'Menu item reference is required'],
    unique: true
  },
  currentStock: {
    type: Number,
    required: [true, 'Current stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  minStock: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock cannot be negative'],
    default: 10
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['pieces', 'kg', 'liters', 'cups', 'packs'],
    default: 'pieces'
  },
  autoReorder: {
    type: Boolean,
    default: false
  },
  supplier: {
    type: String,
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters']
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  costPerUnit: {
    type: Number,
    min: [0, 'Cost cannot be negative']
  }
}, {
  timestamps: true
});

// Indexes for performance
InventorySchema.index({ item: 1 });
InventorySchema.index({ currentStock: 1 });
InventorySchema.index({ 'currentStock': 1, 'minStock': 1 });

// Virtual for stock status
InventorySchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.minStock) return 'low_stock';
  return 'in_stock';
});

// Virtual for stock value
InventorySchema.virtual('stockValue').get(function() {
  return this.currentStock * (this.costPerUnit || 0);
});

// Ensure virtual fields are serialized
InventorySchema.set('toJSON', { virtuals: true });

// Pre-save middleware to check for low stock alerts
InventorySchema.pre('save', function(next) {
  if (this.isModified('currentStock') && this.currentStock <= this.minStock && this.currentStock > 0) {
    // Could emit an event or log low stock warning
    console.log(`Low stock alert: ${this.item} has ${this.currentStock} ${this.unit} remaining`);
  }
  next();
});

module.exports = mongoose.model('Inventory', InventorySchema);
