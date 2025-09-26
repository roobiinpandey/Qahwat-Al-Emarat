const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { orderLimiter } = require('../middleware/rateLimiter');

// Place a new order
router.post('/', orderLimiter, [
  body('customerName').trim().isLength({ min: 1 }).withMessage('Customer name is required'),
  body('customerPhone').trim().isLength({ min: 1 }).withMessage('Customer phone is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be positive'),
  body('paymentMethod').isIn(['cash', 'card', 'wallet']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, totalAmount, ...orderData } = req.body;

    // Validate that all menu items exist and get their current prices
    const MenuItem = require('../models/MenuItem');
    const menuItemIds = items.map(item => item.menuItem);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({ error: 'One or more menu items not found' });
    }

    // Create order items with current prices
    const orderItems = items.map(item => {
      const menuItem = menuItems.find(mi => mi._id.toString() === item.menuItem);
      return {
        menuItem: item.menuItem,
        quantity: item.quantity,
        priceAtOrder: menuItem.price.EN
      };
    });

    // Recalculate total to ensure accuracy
    const calculatedTotal = orderItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);

    const order = new Order({
      ...orderData,
      items: orderItems,
      total: calculatedTotal,
      paymentMethod: req.body.paymentMethod
    });

    await order.save();

    // Populate menu item details for response
    await order.populate('items.menuItem', 'name price');

    res.json({
      message: 'Order placed successfully!',
      order: {
        _id: order._id,
        customerName: order.customerName,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(400).json({ error: 'Failed to place order' });
  }
});

// Get all orders (for admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
router.patch('/:id/status', [
  body('status').isIn(['new', 'pending', 'completed']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(400).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
