const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Protected admin routes - authentication is handled by middleware in index.js

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const { date } = req.query;
    const Order = require('../models/Order');
    const MenuItem = require('../models/MenuItem');
    const Inventory = require('../models/Inventory');

    // Set up date filter
    let dateFilter = {};
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    }

    const totalOrders = await Order.countDocuments(dateFilter);
    const pendingOrders = await Order.countDocuments({ ...dateFilter, status: { $ne: 'completed' } });
    const completedOrders = await Order.countDocuments({ ...dateFilter, status: 'completed' });
    const totalMenuItems = await MenuItem.countDocuments();

    // Get today's orders (or selected date's orders)
    const todaysOrders = await Order.countDocuments(dateFilter);

    // Get inventory stats
    const inventoryStats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalInventoryItems: { $sum: 1 },
          totalInventoryValue: { $sum: { $multiply: ['$currentStock', { $ifNull: ['$costPerUnit', 0] }] } },
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

    const inventoryData = inventoryStats[0] || {
      totalInventoryItems: 0,
      totalInventoryValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };

    res.json({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalMenuItems,
      todaysOrders,
      inventory: inventoryData,
      selectedDate: date || new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Update store settings (protected route)
router.put('/settings', [
  body('openTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
  body('closeTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
  body('orderingEnabled').isBoolean().withMessage('orderingEnabled must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // In a real app, you'd store this in a database
    // For now, we'll just validate and return success
    const { openTime, closeTime, orderingEnabled } = req.body;

    res.json({
      message: 'Settings updated successfully',
      settings: { openTime, closeTime, orderingEnabled }
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get system health (protected route)
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;

    const health = {
      database: dbState === 1 ? 'connected' : 'disconnected',
      server: 'running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router;
