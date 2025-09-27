import React, { useState, useEffect } from 'react';
import * as api from './api';

function InventoryPanel() {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], outOfStock: [], totalAlerts: 0 });
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    item: '',
    currentStock: 0,
    minStock: 10,
    unit: 'pieces',
    autoReorder: false,
    supplier: '',
    costPerUnit: 0
  });
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    loadInventory();
    loadMenuItems();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const [inventoryData, alertsData, statsData] = await Promise.all([
        api.getInventory(),
        api.getInventoryAlerts(),
        api.getInventoryStats()
      ]);
      setInventory(inventoryData);
      setAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    try {
      const items = await api.fetchMenu();
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.createInventoryItem(formData);
      } else {
        await api.createInventoryItem(formData);
      }
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      loadInventory();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleStockAdjustment = async (id, adjustment, reason) => {
    try {
      await api.updateInventoryStock(id, adjustment, reason);
      loadInventory();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await api.deleteInventoryItem(id);
        loadInventory();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      item: '',
      currentStock: 0,
      minStock: 10,
      unit: 'pieces',
      autoReorder: false,
      supplier: '',
      costPerUnit: 0
    });
  };

  const getStockStatusColor = (item) => {
    if (item.currentStock === 0) return '#d32f2f';
    if (item.currentStock <= item.minStock) return '#f57c00';
    return '#388e3c';
  };

  const getStockStatusText = (item) => {
    if (item.currentStock === 0) return 'Out of Stock';
    if (item.currentStock <= item.minStock) return 'Low Stock';
    return 'In Stock';
  };

  if (loading) {
    return <div className="loading">Loading inventory...</div>;
  }

  return (
    <div className="inventory-panel">
      <div className="panel-header">
        <h2>Inventory Management</h2>
        <button
          className="action-button primary"
          onClick={() => setShowForm(true)}
        >
          <i className="fas fa-plus"></i> Add Inventory Item
        </button>
      </div>

      {/* Inventory Stats */}
      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-boxes"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalItems}</span>
            <span className="stat-label">Total Items</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">د.إ {stats.totalValue.toFixed(2)}</span>
            <span className="stat-label">Total Value</span>
          </div>
        </div>
        <div className="stat-card alert">
          <div className="stat-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">{alerts.totalAlerts}</span>
            <span className="stat-label">Stock Alerts</span>
          </div>
        </div>
      </div>

      {/* Stock Alerts */}
      {alerts.totalAlerts > 0 && (
        <div className="stock-alerts">
          <h3>Stock Alerts</h3>
          {alerts.lowStock.length > 0 && (
            <div className="alert-section">
              <h4>Low Stock Items</h4>
              <ul>
                {alerts.lowStock.map(item => (
                  <li key={item._id}>
                    {item.item.name.EN} - {item.currentStock} {item.unit} remaining
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alerts.outOfStock.length > 0 && (
            <div className="alert-section">
              <h4>Out of Stock Items</h4>
              <ul>
                {alerts.outOfStock.map(item => (
                  <li key={item._id}>
                    {item.item.name.EN} - Out of stock
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Inventory Table */}
      <div className="inventory-table">
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Current Stock</th>
              <th>Min Stock</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => (
              <tr key={item._id}>
                <td>{item.item.name.EN}</td>
                <td>{item.currentStock}</td>
                <td>{item.minStock}</td>
                <td>{item.unit}</td>
                <td>
                  <span
                    className="stock-status"
                    style={{ color: getStockStatusColor(item) }}
                  >
                    {getStockStatusText(item)}
                  </span>
                </td>
                <td>{item.supplier || 'N/A'}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-button small success"
                      onClick={() => handleStockAdjustment(item._id, 1, 'Manual restock')}
                      title="Add 1 unit"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                    <button
                      className="action-button small danger"
                      onClick={() => handleStockAdjustment(item._id, -1, 'Manual adjustment')}
                      disabled={item.currentStock <= 0}
                      title="Remove 1 unit"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <button
                      className="action-button small danger"
                      onClick={() => handleDelete(item._id)}
                      title="Delete item"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => {
                setShowForm(false);
                setEditingItem(null);
                resetForm();
              }}
              aria-label="Close"
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 className="modal-title">
              {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h2>
            <form onSubmit={handleFormSubmit} className="inventory-form">
              <div className="form-group">
                <label className="form-label">Menu Item:</label>
                <select
                  value={formData.item}
                  onChange={(e) => setFormData({...formData, item: e.target.value})}
                  required
                  className="form-input"
                >
                  <option value="">Select a menu item</option>
                  {menuItems.map(item => (
                    <option key={item._id} value={item._id}>
                      {item.name.EN}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Current Stock:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({...formData, currentStock: parseFloat(e.target.value)})}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Minimum Stock:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: parseFloat(e.target.value)})}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Unit:</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    required
                    className="form-input"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="liters">Liters</option>
                    <option value="cups">Cups</option>
                    <option value="packs">Packs</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cost per Unit (د.إ):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({...formData, costPerUnit: parseFloat(e.target.value)})}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Supplier:</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  className="form-input"
                  placeholder="Optional supplier name"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    checked={formData.autoReorder}
                    onChange={(e) => setFormData({...formData, autoReorder: e.target.checked})}
                  />
                  Enable auto-reorder when stock is low
                </label>
              </div>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="submit" className="save-button">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryPanel;
