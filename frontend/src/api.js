// API utility for frontend
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5050/api';

// Authentication functions
export async function loginAdmin(username, password) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await res.json();
  // Store token in localStorage
  localStorage.setItem('adminToken', data.token);
  localStorage.setItem('adminUser', JSON.stringify(data.user));
  return data;
}

export function logoutAdmin() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
}

export function getAdminToken() {
  return localStorage.getItem('adminToken');
}

export function getAdminUser() {
  const user = localStorage.getItem('adminUser');
  return user ? JSON.parse(user) : null;
}

export function isAdminLoggedIn() {
  const token = getAdminToken();
  const user = getAdminUser();
  return token && user && user.role === 'admin';
}

// Check if token is valid (not expired)
export async function isTokenValid() {
  const token = getAdminToken();
  if (!token) return false;

  try {
    // Try to make a request to a protected endpoint to check if token is valid
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}

// Check authentication and handle token expiration
export async function checkAuthAndHandleExpiration() {
  if (!isAdminLoggedIn()) {
    return false;
  }

  const isValid = await isTokenValid();
  if (!isValid) {
    // Token is expired or invalid, logout
    logoutAdmin();
    return false;
  }

  return true;
}

// Helper function to get auth headers
function getAuthHeaders() {
  const token = getAdminToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Menu functions
export async function fetchMenu() {
  const timestamp = Date.now();
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const res = await fetch(`${API_BASE}/menu?t=${timestamp}`);

      if (!res.ok) {
        if (res.status === 429 && retryCount < maxRetries - 1) {
          // Rate limited, wait with exponential backoff
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch menu');
      }

      return res.json();
    } catch (error) {
      if (retryCount === maxRetries - 1) {
        throw error;
      }
      retryCount++;
    }
  }
}

export async function createMenuItem(itemData) {
  const res = await fetch(`${API_BASE}/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(itemData)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create menu item');
  }

  return res.json();
}

export async function updateMenuItem(id, itemData) {
  const res = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(itemData)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update menu item');
  }

  return res.json();
}

export async function deleteMenuItem(id) {
  const res = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error('Failed to delete menu item');
  }

  return res.json();
}

// Order functions
export async function placeOrder(orderData) {
  const res = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });

  if (!res.ok) {
    let errorMessage = 'Failed to place order';
    try {
      const errorData = await res.json();
      if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.map(err => err.msg).join(', ');
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // If we can't parse the error response, use the default message
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function getOrders() {
  const timestamp = Date.now();
  const res = await fetch(`${API_BASE}/order?t=${timestamp}`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch orders');
  }

  return res.json();
}

export async function updateOrderStatus(orderId, status) {
  const res = await fetch(`${API_BASE}/order/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error('Failed to update order status');
  }

  return res.json();
}

// Admin functions
export async function getAdminStats() {
  const timestamp = Date.now();
  const res = await fetch(`${API_BASE}/admin/stats?t=${timestamp}`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch admin stats');
  }

  return res.json();
}

export async function updateAdminSettings(settings) {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(settings)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update settings');
  }

  return res.json();
}

export async function getAdminHealth() {
  const res = await fetch(`${API_BASE}/admin/health`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error('Failed to fetch health status');
  }

  return res.json();
}

// Inventory functions
export async function getInventory() {
  const res = await fetch(`${API_BASE}/inventory`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch inventory');
  }

  return res.json();
}

export async function getInventoryItem(itemId) {
  const res = await fetch(`${API_BASE}/inventory/item/${itemId}`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch inventory item');
  }

  return res.json();
}

export async function createInventoryItem(inventoryData) {
  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(inventoryData)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create inventory item');
  }

  return res.json();
}

export async function updateInventoryStock(id, adjustment, reason = '') {
  const res = await fetch(`${API_BASE}/inventory/${id}/stock`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ adjustment, reason })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update inventory stock');
  }

  return res.json();
}

export async function bulkUpdateInventory(updates) {
  const res = await fetch(`${API_BASE}/inventory/bulk-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ updates })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to bulk update inventory');
  }

  return res.json();
}

export async function deleteInventoryItem(id) {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error('Failed to delete inventory item');
  }

  return res.json();
}

export async function getInventoryAlerts() {
  const res = await fetch(`${API_BASE}/inventory/alerts/low-stock`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch inventory alerts');
  }

  return res.json();
}

export async function getInventoryStats() {
  const res = await fetch(`${API_BASE}/inventory/stats/summary`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch inventory stats');
  }

  return res.json();
}
