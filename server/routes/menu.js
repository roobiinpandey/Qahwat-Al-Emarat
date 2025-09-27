const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const MenuItem = require('../models/MenuItem');

// Get all menu items with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query object
    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { 'name.EN': { $regex: search, $options: 'i' } },
        { 'name.AR': { $regex: search, $options: 'i' } },
        { 'description.EN': { $regex: search, $options: 'i' } },
        { 'description.AR': { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const items = await MenuItem.find(query)
      .select('name description price category image sizes') // Only select needed fields
      .sort({ category: 1, 'name.EN': 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean() for better performance

    // Get total count for pagination
    const total = await MenuItem.countDocuments(query);

    res.json({
      items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Create a new menu item
router.post('/', [
  body('name.EN').trim().isLength({ min: 1 }).withMessage('English name is required'),
  body('name.AR').trim().isLength({ min: 1 }).withMessage('Arabic name is required'),
  body('description.EN').trim().isLength({ min: 1 }).withMessage('English description is required'),
  body('description.AR').trim().isLength({ min: 1 }).withMessage('Arabic description is required'),
  body('price.EN').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const newItem = new MenuItem(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Menu item creation error:', error);
    res.status(400).json({ error: 'Failed to create menu item' });
  }
});

// Update a menu item
router.put('/:id', [
  body('name.EN').optional().trim().isLength({ min: 1 }).withMessage('English name cannot be empty'),
  body('name.AR').optional().trim().isLength({ min: 1 }).withMessage('Arabic name cannot be empty'),
  body('description.EN').optional().trim().isLength({ min: 1 }).withMessage('English description cannot be empty'),
  body('description.AR').optional().trim().isLength({ min: 1 }).withMessage('Arabic description cannot be empty'),
  body('price.EN').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().trim().isLength({ min: 1 }).withMessage('Category cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(updatedItem);
  } catch (error) {
    console.error('Menu item update error:', error);
    res.status(400).json({ error: 'Failed to update menu item' });
  }
});

// Delete a menu item
router.delete('/:id', async (req, res) => {
  try {
    const deletedItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Menu item deletion error:', error);
    res.status(400).json({ error: 'Failed to delete menu item' });
  }
});

// Seed menu items (for initial setup)
router.post('/seed', async (req, res) => {
  try {
    const existingCount = await MenuItem.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ error: 'Menu already has items. Use /reset-seed to force reset.' });
    }
    // Seed functionality removed - use admin panel to add items manually
    res.status(400).json({ error: 'Seeding disabled. Use admin panel to add menu items.' });
  } catch (error) {
    console.error('Menu seeding error:', error);
    res.status(500).json({ error: 'Failed to seed menu' });
  }
});

// Reset and seed menu items (force reset)
router.post('/reset-seed', async (req, res) => {
  try {
    await MenuItem.deleteMany();
    // Seed functionality removed - use admin panel to add items manually
    res.json({ message: 'Menu cleared. Use admin panel to add new items.' });
  } catch (error) {
    console.error('Menu reset seeding error:', error);
    res.status(500).json({ error: 'Failed to reset and seed menu' });
  }
});

module.exports = router;
