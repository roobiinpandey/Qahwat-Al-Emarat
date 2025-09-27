import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from './api';
import InventoryPanel from './InventoryPanel';

// Static data definitions
const categories = [
  { value: 'coffee', label: 'Coffee Beans' },
  { value: 'tea', label: 'Tea' },
  { value: 'pastries', label: 'Pastries' },
  { value: 'special', label: 'Special Drinks' }
];

const orderStatuses = [
  { value: 'new', label: 'New', color: '#007bff' },
  { value: 'pending', label: 'Pending', color: '#ffc107' },
  { value: 'completed', label: 'Completed', color: '#28a745' }
];

// Error Boundary Component
class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Admin Panel Error:', error, errorInfo);
    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // Implement error reporting (e.g., Sentry, LogRocket)
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Send to error reporting service
    console.error('Error Report:', errorReport);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h2>Something went wrong</h2>
          <p>Please refresh the page or contact support if the problem persists.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AdminPanel = () => {
  // Consolidated state management
  const [state, setState] = useState({
    // Data states
    menuItems: [],
    orders: [],
    stats: {},
    salesAnalytics: {
      totalSales: 0,
      highestOrder: null,
      lowestOrder: null,
      bestSellingItem: null,
      worstSellingItem: null
    },

    // UI states
    activeTab: 'dashboard',
    selectedDate: new Date().toISOString().split('T')[0],
    loading: false,
    error: null,

    // Auth states
    isLoggedIn: false,
    authChecked: false,

    // Form states
    form: {
      nameEN: '',
      nameAR: '',
      descriptionEN: '',
      descriptionAR: '',
      priceEN: '',
      priceAR: '',
      category: 'coffee',
      image: '',
      sizes: [
        { name: { EN: '250g', AR: '250 جرام' }, price: { EN: '', AR: '' }, isDefault: false },
        { name: { EN: '500g', AR: '500 جرام' }, price: { EN: '', AR: '' }, isDefault: true },
        { name: { EN: '1kg', AR: '1 كيلو' }, price: { EN: '', AR: '' }, isDefault: false }
      ]
    },
    selectedFile: null,
    editingId: null
  });

  // Destructure state variables for easier access
  const {
    menuItems,
    orders,
    stats,
    salesAnalytics,
    activeTab,
    selectedDate,
    loading,
    error,
    isLoggedIn,
    authChecked,
    form,
    selectedFile,
    editingId
  } = state;

  // Sales analytics calculation function
  const calculateSalesAnalytics = (ordersData, items) => {
    // Calculate total sales
    const totalSales = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);

    // Find highest and lowest single orders
    let highestOrder = null;
    let lowestOrder = null;
    let maxOrderTotal = -1;
    let minOrderTotal = Infinity;

    ordersData.forEach(order => {
      const orderTotal = order.total || 0;
      if (orderTotal > maxOrderTotal) {
        maxOrderTotal = orderTotal;
        highestOrder = order;
      }
      if (orderTotal < minOrderTotal && orderTotal > 0) { // Only consider orders with positive totals
        minOrderTotal = orderTotal;
        lowestOrder = order;
      }
    });

    // Calculate item sales
    const itemSales = {};

    ordersData.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(orderItem => {
          const itemId = orderItem.menuItem;
          const quantity = orderItem.quantity || 0;
          const priceAtOrder = orderItem.priceAtOrder || 0;

          if (itemId) {
            if (!itemSales[itemId]) {
              itemSales[itemId] = { quantity: 0, revenue: 0 };
            }
            itemSales[itemId].quantity += quantity;
            itemSales[itemId].revenue += priceAtOrder * quantity;
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

    return {
      totalSales,
      highestOrder,
      lowestOrder,
      bestSellingItem,
      worstSellingItem
    };
  };

  // Memoized calculations for performance
  const memoizedSalesAnalytics = useMemo(() => {
    if (!orders.length || !menuItems.length) return salesAnalytics;

    return calculateSalesAnalytics(orders, menuItems);
  }, [orders, menuItems, salesAnalytics]);

  // Memoized categories for performance
  const memoizedCategories = useMemo(() => categories, []);

  // Memoized order statuses for performance
  const memoizedOrderStatuses = useMemo(() => orderStatuses, []);

  // Utility functions for production robustness
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback((error, context = 'Unknown error') => {
    console.error(`AdminPanel Error [${context}]:`, error);

    // Categorize errors for better handling
    let errorMessage = 'An unexpected error occurred';
    let shouldLogout = false;

    if (error.message?.includes('401') || error.message?.includes('403')) {
      errorMessage = 'Your session has expired. Please log in again.';
      shouldLogout = true;
    } else if (error.message?.includes('500')) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    updateState({
      error: errorMessage,
      loading: false
    });

    if (shouldLogout) {
      handleLogout();
    }

    // Show user-friendly error notification
    showNotification(errorMessage, 'error');
  }, []);

  const showNotification = (message, type = 'info') => {
    // Implement toast notification system
    // For now, use a simple alert, but in production use a proper notification library
    const colors = {
      success: '#d4edda',
      error: '#f8d7da',
      warning: '#fff3cd',
      info: '#d1ecf1'
    };

    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: #333;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      font-weight: 500;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  };

  // Retry mechanism for API calls
  const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        // Don't retry auth errors
        if (error.message?.includes('401') || error.message?.includes('403')) {
          throw error;
        }

        console.warn(`Attempt ${i + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  };

  useEffect(() => {
    // Check authentication on component mount - only required for admin operations
    checkAuthentication();

    // Set up periodic token validation check (every 5 minutes)
    const tokenCheckInterval = setInterval(async () => {
      if (state.isLoggedIn) {
        const isAuthenticated = await api.checkAuthAndHandleExpiration();
        if (!isAuthenticated) {
          updateState({ isLoggedIn: false });
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(tokenCheckInterval);
  }, []);

  const checkAuthentication = useCallback(async () => {
    try {
      updateState({ authChecked: false });
      const isAuthenticated = await withRetry(() => api.checkAuthAndHandleExpiration());
      updateState({
        isLoggedIn: isAuthenticated,
        authChecked: true,
        error: null
      });
      return isAuthenticated;
    } catch (error) {
      handleError(error, 'Authentication check');
      updateState({
        isLoggedIn: false,
        authChecked: true
      });
      return false;
    }
  }, [handleError, updateState]);

  const loadData = useCallback(async (tab = state.activeTab) => {
    if (!state.isLoggedIn) return;

    try {
      updateState({ loading: true, error: null });

      const data = await withRetry(async () => {
        const results = {};

        if (tab === 'menu') {
          const menuResponse = await api.fetchMenu();
          results.menuItems = menuResponse.items || [];
        } else if (tab === 'orders') {
          const ordersResponse = await api.getOrders();
          results.orders = ordersResponse.orders || [];
        } else if (tab === 'dashboard') {
          const [statsData, ordersData, menuData] = await Promise.allSettled([
            api.getAdminStats(state.selectedDate),
            api.getOrders(state.selectedDate),
            api.fetchMenu()
          ]);

          results.stats = statsData.status === 'fulfilled' ? statsData.value : {};
          results.orders = ordersData.status === 'fulfilled' ? (ordersData.value.orders || []) : [];
          results.menuItems = menuData.status === 'fulfilled' ? menuData.value.items || [] : [];

          // Calculate sales analytics even if some data fails
          if (results.orders.length > 0 && results.menuItems.length > 0) {
            results.salesAnalytics = calculateSalesAnalytics(results.orders, results.menuItems);
          }
        }

        return results;
      });

      updateState({
        ...data,
        loading: false
      });

    } catch (error) {
      handleError(error, `Loading ${tab} data`);
    }
  }, [state.isLoggedIn, state.activeTab, state.selectedDate, handleError, updateState]);

  useEffect(() => {
    if (state.isLoggedIn) {
      loadData();
    }
  }, [state.activeTab, state.isLoggedIn, state.selectedDate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateState({
      form: { ...state.form, [name]: value }
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    updateState({
      selectedFile: file
    });
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
    updateState({ loading: true });

    try {
      // Check authentication before proceeding
      const isAuthenticated = await api.checkAuthAndHandleExpiration();
      if (!isAuthenticated) {
        updateState({ isLoggedIn: false });
        alert('Your session has expired. Please log in again.');
        return;
      }

      let imageUrl = state.form.image;

      // Upload file if selected
      if (state.selectedFile) {
        imageUrl = await uploadFile(state.selectedFile);
      }

      const itemData = {
        name: { EN: state.form.nameEN, AR: state.form.nameAR },
        description: { EN: state.form.descriptionEN, AR: state.form.descriptionAR },
        price: { EN: parseFloat(state.form.priceEN), AR: state.form.priceAR },
        category: state.form.category,
        image: imageUrl,
        sizes: state.form.sizes.map(size => ({
          name: size.name,
          price: {
            EN: parseFloat(size.price.EN),
            AR: size.price.AR
          },
          isDefault: size.isDefault
        }))
      };

      if (state.editingId) {
        await api.updateMenuItem(state.editingId, itemData);
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
      updateState({ loading: false });
    }
  };

  const handleEdit = (item) => {
    updateState({
      form: {
        nameEN: item.name.EN,
        nameAR: item.name.AR,
        descriptionEN: item.description.EN,
        descriptionAR: item.description.AR,
        priceEN: item.price.EN.toString(),
        priceAR: item.price.AR,
        category: item.category,
        image: item.image,
        sizes: item.sizes && item.sizes.length > 0 ? item.sizes.map(size => ({
          name: size.name,
          price: {
            EN: size.price.EN.toString(),
            AR: size.price.AR
          },
          isDefault: size.isDefault || false
        })) : [
          { name: { EN: '250g', AR: '250 جرام' }, price: { EN: (item.price.EN * 0.8).toString(), AR: item.price.AR }, isDefault: false },
          { name: { EN: '500g', AR: '500 جرام' }, price: { EN: item.price.EN.toString(), AR: item.price.AR }, isDefault: true },
          { name: { EN: '1kg', AR: '1 كيلو' }, price: { EN: (item.price.EN * 1.8).toString(), AR: item.price.AR }, isDefault: false }
        ]
      },
      editingId: item._id
    });
  };

  const handleDelete = async (id) => {
    console.log('Attempting to delete item with id:', id);
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      // Check authentication before deleting
      const isAuthenticated = await api.checkAuthAndHandleExpiration();
      if (!isAuthenticated) {
        updateState({ isLoggedIn: false });
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
        updateState({ isLoggedIn: false });
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
        updateState({ isLoggedIn: false });
        alert('Your session has expired. Please log in again.');
        return;
      }

      await api.updateOrderStatus(orderId, status);
      alert('Order status updated successfully');
      loadData();
    } catch (error) {
      console.error('Failed to update order status:', error);
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('token')) {
        updateState({ isLoggedIn: false });
        api.logoutAdmin();
        alert('Your session has expired. Please log in again.');
      } else {
        alert('Failed to update order status: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    updateState({
      form: {
        nameEN: '',
        nameAR: '',
        descriptionEN: '',
        descriptionAR: '',
        priceEN: '',
        priceAR: '',
        category: 'coffee',
        image: '',
        sizes: [
          { name: { EN: '250g', AR: '250 جرام' }, price: { EN: '', AR: '' }, isDefault: false },
          { name: { EN: '500g', AR: '500 جرام' }, price: { EN: '', AR: '' }, isDefault: true },
          { name: { EN: '1kg', AR: '1 كيلو' }, price: { EN: '', AR: '' }, isDefault: false }
        ]
      },
      selectedFile: null,
      editingId: null
    });
  };

  const handleLogout = () => {
    api.logoutAdmin();
    navigate('/admin/login');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Admin Panel - QAHWAT AL EMARAT</h1>
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
          onClick={() => updateState({ activeTab: 'dashboard' })}
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
          onClick={() => updateState({ activeTab: 'menu' })}
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
          onClick={() => updateState({ activeTab: 'orders' })}
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
        <button
          onClick={() => updateState({ activeTab: 'inventory' })}
          style={{
            padding: '12px 24px',
            background: activeTab === 'inventory' ? '#007bff' : 'transparent',
            color: activeTab === 'inventory' ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '5px 5px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Inventory
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Dashboard Overview</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="dateSelector" style={{ fontWeight: 'bold', color: '#333' }}>
                Select Date:
              </label>
              <input
                id="dateSelector"
                type="date"
                value={selectedDate}
                onChange={(e) => updateState({ selectedDate: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #007bff',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>
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
              <h3 style={{ margin: '0 0 10px 0', color: '#fd7e14' }}>Selected Date Orders</h3>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '0' }}>{stats.todaysOrders || 0}</p>
              <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0 0 0' }}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Sales Analytics Section */}
          <h3 style={{ marginTop: '40px', marginBottom: '20px', color: '#333' }}>
            Sales Analytics - {new Date(selectedDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: '#e8f5e8', padding: '20px', borderRadius: '8px', border: '2px solid #28a745' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#28a745' }}>💰 Total Sales Amount</h3>
              <p style={{ fontSize: '2.5em', fontWeight: 'bold', margin: '0', color: '#28a745' }}>
                {memoizedSalesAnalytics.totalSales.toFixed(2)} AED
              </p>
            </div>

            {memoizedSalesAnalytics.highestOrder && (
              <div style={{ background: '#d4edda', padding: '20px', borderRadius: '8px', border: '2px solid #28a745' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#155724' }}>🏆 Highest Single Order</h3>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Order #{memoizedSalesAnalytics.highestOrder._id.slice(-6)}</h4>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Customer:</strong> {memoizedSalesAnalytics.highestOrder.customerName}
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Amount:</strong> {memoizedSalesAnalytics.highestOrder.total.toFixed(2)} AED
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Items:</strong> {memoizedSalesAnalytics.highestOrder.items?.length || 0} items
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Time:</strong> {new Date(memoizedSalesAnalytics.highestOrder.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            {memoizedSalesAnalytics.lowestOrder && (
              <div style={{ background: '#f8d7da', padding: '20px', borderRadius: '8px', border: '2px solid #dc3545' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#721c24' }}>📊 Lowest Single Order</h3>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Order #{memoizedSalesAnalytics.lowestOrder._id.slice(-6)}</h4>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Customer:</strong> {memoizedSalesAnalytics.lowestOrder.customerName}
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Amount:</strong> {memoizedSalesAnalytics.lowestOrder.total.toFixed(2)} AED
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Items:</strong> {memoizedSalesAnalytics.lowestOrder.items?.length || 0} items
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Time:</strong> {new Date(memoizedSalesAnalytics.lowestOrder.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            {memoizedSalesAnalytics.bestSellingItem && (
              <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', border: '2px solid #ffc107' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#856404' }}>🔥 Best Selling Item</h3>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{memoizedSalesAnalytics.bestSellingItem.name.EN}</h4>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Sold:</strong> {memoizedSalesAnalytics.bestSellingItem.totalSold} units
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Revenue:</strong> {memoizedSalesAnalytics.bestSellingItem.totalRevenue.toFixed(2)} AED
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Price:</strong> {(() => {
                    const defaultSize = memoizedSalesAnalytics.bestSellingItem.sizes?.find(size => size.isDefault);
                    return defaultSize ? defaultSize.price.EN : memoizedSalesAnalytics.bestSellingItem.price?.EN || 'N/A';
                  })()} AED
                </p>
              </div>
            )}

            {memoizedSalesAnalytics.worstSellingItem && (
              <div style={{ background: '#f8d7da', padding: '20px', borderRadius: '8px', border: '2px solid #dc3545' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#721c24' }}>📉 Lowest Selling Item</h3>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{memoizedSalesAnalytics.worstSellingItem.name.EN}</h4>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Sold:</strong> {memoizedSalesAnalytics.worstSellingItem.totalSold} units
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Revenue:</strong> {memoizedSalesAnalytics.worstSellingItem.totalRevenue.toFixed(2)} AED
                </p>
                <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                  <strong>Price:</strong> {(() => {
                    const defaultSize = memoizedSalesAnalytics.worstSellingItem.sizes?.find(size => size.isDefault);
                    return defaultSize ? defaultSize.price.EN : memoizedSalesAnalytics.worstSellingItem.price?.EN || 'N/A';
                  })()} AED
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
                  {memoizedCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Size Management */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>Size Options & Pricing</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {form.sizes.map((size, index) => (
                    <div key={index} style={{ 
                      border: '1px solid #ddd', 
                      borderRadius: '8px', 
                      padding: '15px',
                      backgroundColor: size.isDefault ? '#f8f9fa' : 'white'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: '0', flex: 1 }}>{size.name.EN} / {size.name.AR}</h4>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                          <input
                            type="radio"
                            name="defaultSize"
                            checked={size.isDefault}
                            onChange={() => {
                              updateState({
                                form: {
                                  ...form,
                                  sizes: form.sizes.map((s, i) => ({
                                    ...s,
                                    isDefault: i === index
                                  }))
                                }
                              });
                            }}
                            style={{ marginRight: '5px' }}
                          />
                          Default Size
                        </label>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '14px' }}>Price (EN) - AED:</label>
                          <input
                            type="number"
                            step="0.01"
                            value={size.price.EN}
                            onChange={(e) => {
                              const newSizes = [...form.sizes];
                              newSizes[index].price.EN = e.target.value;
                              updateState({
                                form: { ...form, sizes: newSizes }
                              });
                            }}
                            style={{ width: '100%', padding: '6px', marginTop: '3px' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '14px' }}>Price (AR):</label>
                          <input
                            type="text"
                            value={size.price.AR}
                            onChange={(e) => {
                              const newSizes = [...form.sizes];
                              newSizes[index].price.AR = e.target.value;
                              updateState({
                                form: { ...form, sizes: newSizes }
                              });
                            }}
                            style={{ width: '100%', padding: '6px', marginTop: '3px' }}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  <strong>Note:</strong> The default size will be used as the base price for backward compatibility and inventory calculations.
                </p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {menuItems.map(item => (
              <div key={item._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                <h3>{item.name.EN}</h3>
                <p><strong>AR:</strong> {item.name.AR}</p>
                <p><strong>Description EN:</strong> {item.description.EN}</p>
                <p><strong>Description AR:</strong> {item.description.AR}</p>
                <p><strong>Base Price:</strong> AED {item.price.EN} / {item.price.AR}</p>
                <p><strong>Category:</strong> {item.category}</p>
                
                {/* Size Information */}
                {item.sizes && item.sizes.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Available Sizes:</p>
                    {item.sizes.map((size, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '4px 0',
                        fontSize: '14px'
                      }}>
                        <span>
                          {size.name.EN} / {size.name.AR}
                          {size.isDefault && <span style={{ color: '#007bff', marginLeft: '5px' }}>(Default)</span>}
                        </span>
                        <span style={{ fontWeight: 'bold' }}>
                          AED {size.price.EN} / {size.price.AR}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {isLoggedIn && (
                  <div style={{ marginTop: '15px', display: 'flex', gap: '5px' }}>
                    <button onClick={() => handleEdit(item)} style={{ padding: '6px 12px', fontSize: '14px' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item._id)} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', fontSize: '14px' }}>
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
                    backgroundColor: memoizedOrderStatuses.find(s => s.value === order.status)?.color || '#6c757d',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    marginLeft: '5px'
                  }}>
                    {memoizedOrderStatuses.find(s => s.value === order.status)?.label || order.status}
                  </span>
                </p>
                <p><strong>Items:</strong></p>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {order.items.map((item, index) => (
                    <li key={index} style={{ marginBottom: '5px' }}>
                      <div>
                        <strong>{item.menuItem?.name?.EN || 'Unknown Item'}</strong>
                        {item.selectedSize && (
                          <span style={{ color: '#666', marginLeft: '5px' }}>
                            ({item.selectedSize.name.EN})
                          </span>
                        )}
                        <span style={{ marginLeft: '10px' }}>
                          x{item.quantity} = AED {item.priceAtOrder?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '10px' }}>
                  <select
                    value={order.status}
                    onChange={(e) => handleOrderStatusUpdate(order._id, e.target.value)}
                    style={{ padding: '5px', marginRight: '5px' }}
                  >
                    {memoizedOrderStatuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Management Tab */}
      {activeTab === 'inventory' && (
        <InventoryPanel />
      )}
    </div>
  );
};

export default AdminPanel;
