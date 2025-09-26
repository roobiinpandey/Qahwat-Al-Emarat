import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from './api';

const AdminPanel = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [salesAnalytics, setSalesAnalytics] = useState({
    totalSales: 0,
    bestSellingItem: null,
    worstSellingItem: null
  });
  const [form, setForm] = useState({
    nameEN: '',
    nameAR: '',
    descriptionEN: '',
    descriptionAR: '',
    priceEN: '',
    priceAR: '',
    category: 'coffee',
    image: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication on component mount - only required for admin operations
    checkAuthentication();

    // Set up periodic token validation check (every 5 minutes)
    const tokenCheckInterval = setInterval(async () => {
      if (isLoggedIn) {
        const isAuthenticated = await api.checkAuthAndHandleExpiration();
        if (!isAuthenticated) {
          setIsLoggedIn(false);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(tokenCheckInterval);
  }, []);

  const checkAuthentication = async () => {
    const isAuthenticated = await api.checkAuthAndHandleExpiration();
    setIsLoggedIn(isAuthenticated);

    if (isAuthenticated) {
      loadData();
    }
  };

  const loadData = async () => {
    console.log('Loading data for tab:', activeTab);
    try {
      // Check authentication before loading data
      const isAuthenticated = await api.checkAuthAndHandleExpiration();
      if (!isAuthenticated) {
        setIsLoggedIn(false);
        return;
      }

      if (activeTab === 'menu') {
        const items = await api.fetchMenu();
        console.log('Fetched menu items:', items.length, items);
        setMenuItems(items);
      } else if (activeTab === 'orders') {
        const ordersData = await api.getOrders();
        setOrders(ordersData);
      } else if (activeTab === 'dashboard') {
        const statsData = await api.getAdminStats();
        setStats(statsData);

        // Load additional data for sales analytics
        const ordersData = await api.getOrders();
        const items = await api.fetchMenu();

        // Calculate sales analytics
        calculateSalesAnalytics(ordersData, items);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // If it's an authentication error, logout
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('token')) {
        setIsLoggedIn(false);
        api.logoutAdmin();
      } else {
        alert('Failed to load data: ' + error.message);
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [activeTab, isLoggedIn]);

  const calculateSalesAnalytics = (ordersData, items) => {
    // Calculate total sales
    const totalSales = ordersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Calculate item sales
    const itemSales = {};

    ordersData.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(orderItem => {
          const itemId = orderItem.menuItem;
          const quantity = orderItem.quantity || 0;

          if (itemId) {
            if (!itemSales[itemId]) {
              itemSales[itemId] = { quantity: 0, revenue: 0 };
            }
            itemSales[itemId].quantity += quantity;

            // Find the item to get price
            const menuItem = items.find(item => item._id === itemId);
            if (menuItem && menuItem.price && menuItem.price.EN) {
              itemSales[itemId].revenue += quantity * menuItem.price.EN;
            }
          }
        });
      }
    });

    // Find best and worst selling items
    let bestSellingItem = null;
    let worstSellingItem = null;
    let maxQuantity = -1;
    let minQuantity = Infinity;

    Object.entries(itemSales).forEach(([itemId, sales]) => {
      if (sales.quantity > maxQuantity) {
        maxQuantity = sales.quantity;
        const menuItem = items.find(item => item._id === itemId);
        bestSellingItem = menuItem ? {
          ...menuItem,
          totalSold: sales.quantity,
          totalRevenue: sales.revenue
        } : null;
      }

      if (sales.quantity < minQuantity) {
        minQuantity = sales.quantity;
        const menuItem = items.find(item => item._id === itemId);
        worstSellingItem = menuItem ? {
          ...menuItem,
          totalSold: sales.quantity,
          totalRevenue: sales.revenue
        } : null;
      }
    });

    setSalesAnalytics({
      totalSales,
      bestSellingItem,
      worstSellingItem
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const uploadFile = async (file) => {
    console.log('uploadFile called with file:', file);

    // Check if user is logged in and token is valid
    const isAuthenticated = await api.checkAuthAndHandleExpiration();
    if (!isAuthenticated) {
      setIsLoggedIn(false);
      throw new Error('Your session has expired. Please log in again to upload images.');
    }

    const formData = new FormData();
    formData.append('image', file);

    const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5050/api';
    const token = localStorage.getItem('adminToken');
    console.log('API_BASE:', API_BASE);
    console.log('Token exists:', !!token);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData - browser sets it automatically
      },
      body: formData
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error(`Failed to upload image: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Upload success data:', data);
    return data.fileUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check authentication before proceeding
      const isAuthenticated = await api.checkAuthAndHandleExpiration();
      if (!isAuthenticated) {
        setIsLoggedIn(false);
        alert('Your session has expired. Please log in again.');
        return;
      }

      let imageUrl = form.image;

      // Upload file if selected
      if (selectedFile) {
        imageUrl = await uploadFile(selectedFile);
      }

      const itemData = {
        name: { EN: form.nameEN, AR: form.nameAR },
        description: { EN: form.descriptionEN, AR: form.descriptionAR },
        price: { EN: parseFloat(form.priceEN), AR: form.priceAR },
        category: form.category,
        image: imageUrl
      };

      if (editingId) {
        await api.updateMenuItem(editingId, itemData);
        alert('Menu item updated successfully');
      } else {
        await api.createMenuItem(itemData);
        alert('Menu item created successfully');
      }
      loadData();
      resetForm();
    } catch (error) {
      alert('Failed to save menu item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      nameEN: item.name.EN,
      nameAR: item.name.AR,
      descriptionEN: item.description.EN,
      descriptionAR: item.description.AR,
      priceEN: item.price.EN.toString(),
      priceAR: item.price.AR,
      category: item.category,
      image: item.image
    });
    setEditingId(item._id);
  };

  const handleDelete = async (id) => {
    console.log('Attempting to delete item with id:', id);
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      // Check authentication before deleting
      const isAuthenticated = await api.checkAuthAndHandleExpiration();
      if (!isAuthenticated) {
        setIsLoggedIn(false);
        alert('Your session has expired. Please log in again.');
        return;
      }

      console.log('Authentication check passed, calling delete API...');
      const result = await api.deleteMenuItem(id);
      console.log('Delete API result:', result);
      alert('Menu item deleted successfully');
      console.log('Reloading data after delete...');
      loadData();
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('token')) {
        setIsLoggedIn(false);
        api.logoutAdmin();
        alert('Your session has expired. Please log in again.');
      } else {
        alert('Failed to delete menu item: ' + error.message);
      }
    }
  };

  const handleOrderStatusUpdate = async (orderId, status) => {
    try {
      // Check authentication before updating
      const isAuthenticated = await api.checkAuthAndHandleExpiration();
      if (!isAuthenticated) {
        setIsLoggedIn(false);
        alert('Your session has expired. Please log in again.');
        return;
      }

      await api.updateOrderStatus(orderId, status);
      alert('Order status updated successfully');
      loadData();
    } catch (error) {
      console.error('Failed to update order status:', error);
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('token')) {
        setIsLoggedIn(false);
        api.logoutAdmin();
        alert('Your session has expired. Please log in again.');
      } else {
        alert('Failed to update order status: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setForm({
      nameEN: '',
      nameAR: '',
      descriptionEN: '',
      descriptionAR: '',
      priceEN: '',
      priceAR: '',
      category: 'coffee',
      image: ''
    });
    setSelectedFile(null);
    setEditingId(null);
  };

  const handleLogout = () => {
    api.logoutAdmin();
    navigate('/admin/login');
  };

  const categories = [
    { value: 'coffee', label: 'Coffee' },
    { value: 'tea', label: 'Tea' },
    { value: 'pastries', label: 'Pastries' },
    { value: 'special', label: 'Special Drinks' }
  ];

  const orderStatuses = [
    { value: 'new', label: 'New', color: '#007bff' },
    { value: 'pending', label: 'Pending', color: '#ffc107' },
    { value: 'completed', label: 'Completed', color: '#28a745' }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Admin Panel - Qahwatal Emarat</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isLoggedIn ? (
            <button
              onClick={() => navigate('/admin/login')}
              style={{ padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              <i className="fas fa-sign-in-alt"></i> Login for Admin Actions
            </button>
          ) : (
            <button
              onClick={handleLogout}
              style={{ padding: '10px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #e9ecef' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'dashboard' ? '#007bff' : 'transparent',
            color: activeTab === 'dashboard' ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '5px 5px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginRight: '5px'
          }}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'menu' ? '#007bff' : 'transparent',
            color: activeTab === 'menu' ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '5px 5px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginRight: '5px'
          }}
        >
          Menu Management
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'orders' ? '#007bff' : 'transparent',
            color: activeTab === 'orders' ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '5px 5px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Order Management
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          <h2>Dashboard Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Total Orders</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '0' }}>{stats.totalOrders || 0}</p>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>Pending Orders</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '0' }}>{stats.pendingOrders || 0}</p>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>Completed Orders</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '0' }}>{stats.completedOrders || 0}</p>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>Menu Items</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '0' }}>{stats.totalMenuItems || 0}</p>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#fd7e14' }}>Today's Orders</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '0' }}>{stats.todaysOrders || 0}</p>
            </div>
          </div>

          {/* Sales Analytics Section */}
          <h3 style={{ marginTop: '40px', marginBottom: '20px', color: '#333' }}>Sales Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: '#e8f5e8', padding: '20px', borderRadius: '8px', border: '2px solid #28a745' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#28a745' }}>💰 Total Sales Amount</h3>
              <p style={{ fontSize: '2.5em', fontWeight: 'bold', margin: '0', color: '#28a745' }}>
                {salesAnalytics.totalSales.toFixed(2)} AED
              </p>
            </div>

            {salesAnalytics.bestSellingItem && (
              <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', border: '2px solid #ffc107' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#856404' }}>🔥 Best Selling Item</h3>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{salesAnalytics.bestSellingItem.name.EN}</h4>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Sold:</strong> {salesAnalytics.bestSellingItem.totalSold} units
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Revenue:</strong> {salesAnalytics.bestSellingItem.totalRevenue.toFixed(2)} AED
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Price:</strong> {salesAnalytics.bestSellingItem.price.EN} AED
                </p>
              </div>
            )}

            {salesAnalytics.worstSellingItem && (
              <div style={{ background: '#f8d7da', padding: '20px', borderRadius: '8px', border: '2px solid #dc3545' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#721c24' }}>📉 Lowest Selling Item</h3>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{salesAnalytics.worstSellingItem.name.EN}</h4>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Sold:</strong> {salesAnalytics.worstSellingItem.totalSold} units
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Revenue:</strong> {salesAnalytics.worstSellingItem.totalRevenue.toFixed(2)} AED
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Price:</strong> {salesAnalytics.worstSellingItem.price.EN} AED
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Menu Management Tab */}
      {activeTab === 'menu' && (
        <div>
          {!isLoggedIn && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <i className="fas fa-info-circle" style={{ color: '#856404', marginRight: '10px' }}></i>
              <strong>Viewing Mode:</strong> You can view menu items below. To add, edit, or delete items, please{' '}
              <button
                onClick={() => navigate('/admin/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 'inherit'
                }}
              >
                login as admin
              </button>.
            </div>
          )}

          {isLoggedIn && (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => loadData()}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-sync-alt" style={{ marginRight: '5px' }}></i>
                Refresh Data
              </button>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Click to reload fresh data from server
              </span>
            </div>
          )}

          {isLoggedIn && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h2>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h3>English</h3>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Name (EN): </label>
                    <input
                      type="text"
                      name="nameEN"
                      value={form.nameEN}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Description (EN): </label>
                    <textarea
                      name="descriptionEN"
                      value={form.descriptionEN}
                      onChange={handleInputChange}
                      required
                      rows="3"
                      style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Price (EN): </label>
                    <input
                      type="number"
                      step="0.01"
                      name="priceEN"
                      value={form.priceEN}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                  </div>
                </div>

                <div>
                  <h3>Arabic</h3>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Name (AR): </label>
                    <input
                      type="text"
                      name="nameAR"
                      value={form.nameAR}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Description (AR): </label>
                    <textarea
                      name="descriptionAR"
                      value={form.descriptionAR}
                      onChange={handleInputChange}
                      required
                      rows="3"
                      style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Price (AR): </label>
                    <input
                      type="text"
                      name="priceAR"
                      value={form.priceAR}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>Category: </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label>Image: </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
                {selectedFile && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Selected: {selectedFile.name}
                  </p>
                )}
                {editingId && form.image && !selectedFile && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Current image will be kept if no new file is selected
                  </p>
                )}
              </div>

              <div style={{ marginTop: '20px' }}>
                <button type="submit" disabled={loading} style={{ padding: '10px 20px', marginRight: '10px' }}>
                  {loading ? 'Saving...' : (editingId ? 'Update Item' : 'Add Item')}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} style={{ padding: '10px 20px' }}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}

          <h2>Menu Items</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {menuItems.map(item => (
              <div key={item._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                <h3>{item.name.EN}</h3>
                <p><strong>AR:</strong> {item.name.AR}</p>
                <p><strong>Description EN:</strong> {item.description.EN}</p>
                <p><strong>Description AR:</strong> {item.description.AR}</p>
                <p><strong>Price:</strong> AED {item.price.EN} / {item.price.AR}</p>
                <p><strong>Category:</strong> {item.category}</p>
                {isLoggedIn && (
                  <div style={{ marginTop: '10px' }}>
                    <button onClick={() => handleEdit(item)} style={{ padding: '5px 10px', marginRight: '5px' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item._id)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white' }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Management Tab */}
      {activeTab === 'orders' && (
        <div>
          <h2>Order Management</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {orders.map(order => (
              <div key={order._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                <h3>Order #{order._id.slice(-6)}</h3>
                <p><strong>Customer:</strong> {order.customerName}</p>
                <p><strong>Phone:</strong> {order.customerPhone}</p>
                <p><strong>Total:</strong> {order.totalAmount} AED</p>
                <p><strong>Payment:</strong> {order.paymentMethod}</p>
                <p><strong>Status:</strong>
                  <span style={{
                    backgroundColor: orderStatuses.find(s => s.value === order.status)?.color || '#6c757d',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    marginLeft: '5px'
                  }}>
                    {orderStatuses.find(s => s.value === order.status)?.label || order.status}
                  </span>
                </p>
                <p><strong>Items:</strong></p>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.menuItem?.name?.EN || 'Unknown Item'} x{item.quantity}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '10px' }}>
                  <select
                    value={order.status}
                    onChange={(e) => handleOrderStatusUpdate(order._id, e.target.value)}
                    style={{ padding: '5px', marginRight: '5px' }}
                  >
                    {orderStatuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
