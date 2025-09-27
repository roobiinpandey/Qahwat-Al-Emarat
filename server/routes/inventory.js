const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');

// Get all inventory items with menu item details
router.get('/', async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate('item', 'name category')
      .sort({ 'currentStock': 1, 'item.name.EN': 1 });

    res.json(inventory);
  } catch (error) {
    console.error('Inventory fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Get inventory for specific menu item
router.get('/item/:itemId', async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ item: req.params.itemId })
      .populate('item', 'name category');

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json(inventory);
  } catch (error) {
    console.error('Inventory item fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minStock'] },
      currentStock: { $gt: 0 }
    })
      .populate('item', 'name category')
      .sort({ currentStock: 1 });

    const outOfStockItems = await Inventory.find({ currentStock: 0 })
      .populate('item', 'name category')
      .sort({ 'item.name.EN': 1 });

    res.json({
      lowStock: lowStockItems,
      outOfStock: outOfStockItems,
      totalAlerts: lowStockItems.length + outOfStockItems.length
    });
  } catch (error) {
    console.error('Low stock alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch stock alerts' });
  }
});

// Create or update inventory item
router.post('/', [
  body('item').isMongoId().withMessage('Valid menu item ID is required'),
  body('currentStock').isFloat({ min: 0 }).withMessage('Current stock must be a positive number'),
  body('minStock').isFloat({ min: 0 }).withMessage('Minimum stock must be a positive number'),
  body('unit').isIn(['pieces', 'kg', 'liters', 'cups', 'packs']).withMessage('Invalid unit'),
  body('autoReorder').optional().isBoolean().withMessage('Auto reorder must be boolean'),
  body('supplier').optional().trim().isLength({ max: 100 }).withMessage('Supplier name too long'),
  body('costPerUnit').optional().isFloat({ min: 0 }).withMessage('Cost per unit must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { item, currentStock, minStock, unit, autoReorder, supplier, costPerUnit } = req.body;

    // Check if menu item exists
    const menuItem = await MenuItem.findById(item);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Check if inventory already exists for this item
    let inventory = await Inventory.findOne({ item });

    if (inventory) {
      // Update existing inventory
      inventory.currentStock = currentStock;
      inventory.minStock = minStock;
      inventory.unit = unit;
      if (autoReorder !== undefined) inventory.autoReorder = autoReorder;
      if (supplier !== undefined) inventory.supplier = supplier;
      if (costPerUnit !== undefined) inventory.costPerUnit = costPerUnit;
      inventory.lastRestocked = new Date();

      await inventory.save();
      await inventory.populate('item', 'name category');
    } else {
      // Create new inventory item
      inventory = new Inventory({
        item,
        currentStock,
        minStock,
        unit,
        autoReorder: autoReorder || false,
        supplier,
        costPerUnit
      });

      await inventory.save();
      await inventory.populate('item', 'name category');
    }

    res.json(inventory);
  } catch (error) {
    console.error('Inventory creation/update error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Inventory already exists for this menu item' });
    }
    res.status(400).json({ error: 'Failed to create/update inventory' });
  }
});

// Update inventory stock (add/subtract)
router.patch('/:id/stock', [
  body('adjustment').isFloat().withMessage('Stock adjustment is required'),
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Reason too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { adjustment, reason } = req.body;

    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const newStock = inventory.currentStock + adjustment;
    if (newStock < 0) {
      return res.status(400).json({ error: 'Stock cannot go below zero' });
    }

    inventory.currentStock = newStock;
    if (adjustment > 0) {
      inventory.lastRestocked = new Date();
    }

    await inventory.save();
    await inventory.populate('item', 'name category');

    res.json({
      inventory,
      adjustment,
      newStock,
      reason: reason || 'Manual adjustment'
    });
  } catch (error) {
    console.error('Stock adjustment error:', error);
    res.status(400).json({ error: 'Failed to adjust stock' });
  }
});

// Bulk update inventory
router.post('/bulk-update', [
  body('updates').isArray().withMessage('Updates array is required'),
  body('updates.*.item').isMongoId().withMessage('Valid menu item ID required'),
  body('updates.*.currentStock').optional().isFloat({ min: 0 }).withMessage('Stock must be positive'),
  body('updates.*.minStock').optional().isFloat({ min: 0 }).withMessage('Min stock must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { updates } = req.body;
    const results = [];

    for (const update of updates) {
      try {
        let inventory = await Inventory.findOne({ item: update.item });

        if (!inventory) {
          // Create new inventory if it doesn't exist
          inventory = new Inventory({
            item: update.item,
            currentStock: update.currentStock || 0,
            minStock: update.minStock || 10,
            unit: update.unit || 'pieces'
          });
        } else {
          // Update existing inventory
          if (update.currentStock !== undefined) inventory.currentStock = update.currentStock;
          if (update.minStock !== undefined) inventory.minStock = update.minStock;
          if (update.unit) inventory.unit = update.unit;
          if (update.autoReorder !== undefined) inventory.autoReorder = update.autoReorder;
          if (update.supplier !== undefined) inventory.supplier = update.supplier;
          if (update.costPerUnit !== undefined) inventory.costPerUnit = update.costPerUnit;
        }

        await inventory.save();
        results.push({ success: true, item: update.item, inventory });
      } catch (error) {
        results.push({ success: false, item: update.item, error: error.message });
      }
    }

    res.json({
      message: 'Bulk update completed',
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id);
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Inventory deletion error:', error);
    res.status(400).json({ error: 'Failed to delete inventory item' });
  }
});

// Get inventory statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$currentStock', { $ifNull: ['$costPerUnit', 0] }] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$currentStock', '$minStock'] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$currentStock', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalItems: 0,
      totalValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Inventory stats error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory statistics' });
  }
});

module.exports = router;
