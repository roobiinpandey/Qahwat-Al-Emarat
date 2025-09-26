// API utility for frontend
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5050/api';

export async function fetchMenu() {
  const res = await fetch(`${API_BASE}/menu`);
  return res.json();
}

export async function createMenuItem(itemData) {
  const res = await fetch(`${API_BASE}/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });
  return res.json();
}

export async function updateMenuItem(id, itemData) {
  const res = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });
  return res.json();
}

export async function deleteMenuItem(id) {
  const res = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function placeOrder(orderData) {
  const res = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  return res.json();
}

export async function getOrders() {
  const res = await fetch(`${API_BASE}/order`);
  return res.json();
}

export async function updateOrderStatus(orderId, status) {
  const res = await fetch(`${API_BASE}/order/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
}
