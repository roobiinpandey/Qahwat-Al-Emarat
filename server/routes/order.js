const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { orderLimiter } = require('../middleware/rateLimiter');

// Place a new order
router.post('/', orderLimiter, [
  body('customerName').trim().isLength({ min: 1 }).withMessage('Customer name is required'),
  body('customerPhone').trim().isLength({ min: 1 }).withMessage('Customer phone is required'),
  body('orderType').isIn(['dine-in', 'takeaway', 'delivery']).withMessage('Valid order type is required'),
  body('tableNumber').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 1 }).withMessage('Table number is required for dine-in orders'),
  body('deliveryAddress').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 1 }).withMessage('Delivery address is required for delivery orders'),
  body('specialInstructions').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Special instructions cannot exceed 500 characters'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be positive'),
  body('paymentMethod').isIn(['cash', 'card', 'wallet']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Additional custom validation for conditional fields
    const { orderType, tableNumber, deliveryAddress } = req.body;
    if (orderType === 'dine-in' && (!tableNumber || tableNumber.trim().length === 0)) {
      return res.status(400).json({ error: 'Table number is required for dine-in orders' });
    }
    if (orderType === 'delivery' && (!deliveryAddress || deliveryAddress.trim().length === 0)) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders' });
    }

    const { items, totalAmount, ...orderData } = req.body;

    // Validate that all menu items exist and get their current prices
    const MenuItem = require('../models/MenuItem');
    const Inventory = require('../models/Inventory');
    const menuItemIds = items.map(item => item.menuItem);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({ error: 'One or more menu items not found' });
    }

    // Check inventory availability for all items
    const inventoryItems = await Inventory.find({ item: { $in: menuItemIds } });
    const inventoryMap = new Map(inventoryItems.map(inv => [inv.item.toString(), inv]));

    for (const item of items) {
      const inventory = inventoryMap.get(item.menuItem);
      if (inventory) {
        const requiredQuantity = item.quantity;
        if (inventory.currentStock < requiredQuantity) {
          const menuItem = menuItems.find(mi => mi._id.toString() === item.menuItem);
          const itemName = menuItem ? menuItem.name.EN : 'Unknown item';
          return res.status(400).json({
            error: `Insufficient stock for ${itemName}. Available: ${inventory.currentStock} ${inventory.unit}, Required: ${requiredQuantity}`
          });
        }
      }
    }

    // Create order items with selected size prices
    const orderItems = items.map(item => {
      const menuItem = menuItems.find(mi => mi._id.toString() === item.menuItem);

      // Use selected size price if available, otherwise use base price
      let priceAtOrder = menuItem.price.EN; // Default to base price
      let selectedSize = null;

      if (item.selectedSize && item.selectedSize.price) {
        // Use the selected size price sent by frontend
        priceAtOrder = typeof item.selectedSize.price === 'object' ?
          item.selectedSize.price.EN || menuItem.price.EN :
          item.selectedSize.price || menuItem.price.EN;
        selectedSize = item.selectedSize;
      }

      return {
        menuItem: item.menuItem,
        selectedSize: selectedSize,
        quantity: item.quantity,
        priceAtOrder: priceAtOrder
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

    // Deduct inventory after successful order creation
    for (const item of items) {
      const inventory = inventoryMap.get(item.menuItem);
      if (inventory) {
        inventory.currentStock -= item.quantity;
        await inventory.save();
      }
    }

    // Populate menu item details for response
    await order.populate('items.menuItem', 'name price');

    res.json({
      message: 'Order placed successfully!',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
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

// Get all orders (for admin) with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate, date } = req.query;
    const skip = (page - 1) * limit;

    // Build query object
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    // Handle date filtering
    if (date) {
      // Filter for specific date (whole day)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    } else if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Use aggregation pipeline for better performance
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuItemDetails'
        }
      },
      {
        $addFields: {
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                $mergeObjects: [
                  '$$item',
                  {
                    menuItem: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$menuItemDetails',
                            cond: { $eq: ['$$this._id', '$$item.menuItem'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          orderNumber: 1,
          customerName: 1,
          customerPhone: 1,
          orderType: 1,
          tableNumber: 1,
          deliveryAddress: 1,
          specialInstructions: 1,
          items: 1,
          total: 1,
          status: 1,
          paymentMethod: 1,
          createdAt: 1,
          updatedAt: 1
          // menuItemDetails is automatically excluded since it's not listed
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const orders = await Order.aggregate(pipeline);

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
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
