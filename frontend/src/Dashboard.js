import React, { useState, useEffect } from 'react';
import { getOrders, updateOrderStatus } from './api';

function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [storeSettings, setStoreSettings] = useState({
    openTime: '08:00',
    closeTime: '22:00',
    orderingEnabled: true
  });
  const [filterType, setFilterType] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
    // Refresh orders every 30 seconds for admin dashboard
    const orderInterval = setInterval(fetchOrders, 30000);
    
    // Load settings from localStorage
    const saved = localStorage.getItem('storeSettings');
    if (saved) {
      setStoreSettings(JSON.parse(saved));
    }
    
    return () => clearInterval(orderInterval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await getOrders();
      setOrders(response);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const isWithinOperatingHours = () => {
    const now = new Date();
    const openMinutes = parseInt(storeSettings.openTime.split(':')[0], 10) * 60 + parseInt(storeSettings.openTime.split(':')[1], 10);
    const closeMinutes = parseInt(storeSettings.closeTime.split(':')[0], 10) * 60 + parseInt(storeSettings.closeTime.split(':')[1], 10);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  };

  const handleSettingsChange = (field, value) => {
    setStoreSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveSettings = () => {
    console.log('Saving settings:', storeSettings);
    localStorage.setItem('storeSettings', JSON.stringify(storeSettings));
    setShowSettingsModal(false);
  };

  const getFilteredOrders = () => {
    const now = new Date();
    let startDate, endDate;
    
    switch (filterType) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'thisWeek':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        startDate = startOfWeek;
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'custom':
        if (!customDate) return orders;
        const selectedDate = new Date(customDate);
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
        break;
      default:
        return orders;
    }
    
    let timeFilteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate < endDate;
    });

    // Apply status filter
    if (statusFilter === 'all') return timeFilteredOrders;
    if (statusFilter === 'pending') return timeFilteredOrders.filter(order => order.status !== 'completed');
    if (statusFilter === 'completed') return timeFilteredOrders.filter(order => order.status === 'completed');
    
    return timeFilteredOrders;
  };

  const filteredOrders = getFilteredOrders();

  const storeStatus = storeSettings.orderingEnabled && isWithinOperatingHours() ? 'Open' : 'Closed';
  const statusColor = storeSettings.orderingEnabled && isWithinOperatingHours() ? 'var(--success)' : '#d32f2f';

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          Qahwatal Emarat Dashboard
        </div>
      </div>
      
      <div className="store-info-box">
        <div className="store-status-display">
          <div className="status-indicator">
            <div className={`status-dot ${!storeSettings.orderingEnabled || !isWithinOperatingHours() ? 'closed' : ''}`}></div>
            <span>Store {storeStatus}</span>
          </div>
          <div className="store-hours">
            Operating Hours: {storeSettings.openTime} - {storeSettings.closeTime}
          </div>
        </div>
        <div className="settings-access">
          <button
            className="action-button primary"
            onClick={() => setShowSettingsModal(true)}
            style={{padding: '8px 16px', fontSize: '0.9rem'}}
          >
            <i className="fas fa-cog"></i>
            Settings
          </button>
        </div>
      </div>
      
      <div className="order-filters">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filterType === 'today' ? 'active' : ''}`}
            onClick={() => setFilterType('today')}
            title="View today's orders"
          >
            <i className="fas fa-sun"></i> Today
          </button>
          <button 
            className={`filter-btn ${filterType === 'yesterday' ? 'active' : ''}`}
            onClick={() => setFilterType('yesterday')}
            title="View yesterday's orders"
          >
            <i className="fas fa-calendar-day"></i> Yesterday
          </button>
          <button 
            className={`filter-btn ${filterType === 'thisWeek' ? 'active' : ''}`}
            onClick={() => setFilterType('thisWeek')}
            title="View this week's orders"
          >
            <i className="fas fa-calendar-week"></i> This Week
          </button>
          <button 
            className={`filter-btn ${filterType === 'thisMonth' ? 'active' : ''}`}
            onClick={() => setFilterType('thisMonth')}
            title="View this month's orders"
          >
            <i className="fas fa-calendar-alt"></i> This Month
          </button>
        </div>
        <div className="date-filter">
          <input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setFilterType('custom');
            }}
            className="date-input"
            title="Select a specific date"
            placeholder="Custom date"
          />
        </div>
      </div>
      
      <div className="status-filters">
        <div className="status-filter-boxes">
          <button 
            className={`status-box ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            title="View all orders"
          >
            <i className="fas fa-list"></i>
            <span>All Orders</span>
          </button>
          <button 
            className={`status-box ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
            title="View pending orders"
          >
            <i className="fas fa-clock"></i>
            <span>Pending Orders</span>
          </button>
          <button 
            className={`status-box ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
            title="View completed orders"
          >
            <i className="fas fa-check-circle"></i>
            <span>Completed Orders</span>
          </button>
        </div>
      </div>
      
      <div className="orders-summary">
        <div className="orders-count">
          {filterType === 'today' ? 'Today\'s Orders' :
           filterType === 'yesterday' ? 'Yesterday\'s Orders' :
           filterType === 'thisWeek' ? 'This Week\'s Orders' :
           filterType === 'thisMonth' ? 'This Month\'s Orders' :
           'Orders for Selected Date'}: {filteredOrders.length}
        </div>
      </div>
      
      <div className="orders-grid">
        {filteredOrders.map(order => (
          <div key={order._id} className={`order-card ${order.status === 'completed' ? 'completed' : ''}`}>
            <div className="order-header">
              <div className="customer-info">
                <span className="customer-name">{order.customerName}</span>
                <span className={`status-badge ${order.status || 'pending'}`}>
                  {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'New'}
                </span>
              </div>
              <span className="order-type-info">
                {order.orderType === 'dine-in' ? 'Table' : 'Address'}: {order.orderType === 'dine-in' ? order.tableNumber : order.deliveryAddress}
              </span>
            </div>
            
            <div className="order-items">
              <div className="order-items-title">Items:</div>
              <ul className="items-list">
                {order.items.map(item => (
                  <li key={item.id}>
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">x{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="order-total">Total: {order.total.toFixed(2)} AED</div>
            <div className="order-timestamp">{new Date(order.createdAt).toLocaleString()}</div>
            
            <div className="order-actions">
              <button
                className="action-button primary"
                onClick={() => setSelectedOrder(order)}
              >
                <i className="fas fa-eye"></i>
                View Details
              </button>
              {order.status !== 'completed' && (
                <button
                  className="action-button success"
                  onClick={() => handleUpdateOrderStatus(order._id, 'completed')}
                >
                  <i className="fas fa-check-circle"></i>
                  Complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Store Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setShowSettingsModal(false)}
              aria-label="Close"
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 className="modal-title">Store Settings</h2>
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">
                  Opening Time:
                  <input
                    type="time"
                    value={storeSettings.openTime}
                    onChange={(e) => handleSettingsChange('openTime', e.target.value)}
                    className="form-input"
                  />
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Closing Time:
                  <input
                    type="time"
                    value={storeSettings.closeTime}
                    onChange={(e) => handleSettingsChange('closeTime', e.target.value)}
                    className="form-input"
                  />
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    checked={storeSettings.orderingEnabled}
                    onChange={(e) => handleSettingsChange('orderingEnabled', e.target.checked)}
                  />
                  Enable Online Ordering
                </label>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                className="save-button"
                onClick={saveSettings}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setSelectedOrder(null)}
              aria-label="Close"
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 className="modal-title">Order Details</h2>
            <div className="order-details">
              <div className="detail-row">
                <span className="detail-label">Customer:</span>
                <span className="detail-value">{selectedOrder.customerName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{selectedOrder.customerPhone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{selectedOrder.orderType}</span>
              </div>
              {selectedOrder.orderType === 'dine-in' ? (
                <div className="detail-row">
                  <span className="detail-label">Table:</span>
                  <span className="detail-value">{selectedOrder.tableNumber}</span>
                </div>
              ) : (
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{selectedOrder.deliveryAddress}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{selectedOrder.status}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Placed:</span>
                <span className="detail-value">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              {selectedOrder.specialInstructions && (
                <div className="detail-row">
                  <span className="detail-label">Instructions:</span>
                  <span className="detail-value">{selectedOrder.specialInstructions}</span>
                </div>
              )}
            </div>
            <div className="order-items">
              <div className="order-items-title">Items:</div>
              <ul className="items-list">
                {selectedOrder.items.map(item => (
                  <li key={item.id}>
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">x{item.quantity} - {item.price.toFixed(2)} AED</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-total">Total: {selectedOrder.total.toFixed(2)} AED</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
