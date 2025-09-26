import React, { useState, useEffect } from 'react';
import * as api from './api';
import { Link } from 'react-router-dom';

const AdminPanel = () => {
  const [menuItems, setMenuItems] = useState([]);
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
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const items = await api.fetchMenu();
      setMenuItems(items);
    } catch (error) {
      alert('Failed to load menu items');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const itemData = {
      name: { EN: form.nameEN, AR: form.nameAR },
      description: { EN: form.descriptionEN, AR: form.descriptionAR },
      price: { EN: parseFloat(form.priceEN), AR: form.priceAR },
      category: form.category,
      image: form.image
    };

    try {
      if (editingId) {
        await api.updateMenuItem(editingId, itemData);
        alert('Menu item updated successfully');
      } else {
        await api.createMenuItem(itemData);
        alert('Menu item created successfully');
      }
      loadMenuItems();
      resetForm();
    } catch (error) {
      alert('Failed to save menu item');
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
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      await api.deleteMenuItem(id);
      alert('Menu item deleted successfully');
      loadMenuItems();
    } catch (error) {
      alert('Failed to delete menu item');
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
    setEditingId(null);
  };

  const categories = [
    { value: 'coffee', label: 'Coffee' },
    { value: 'tea', label: 'Tea' },
    { value: 'pastries', label: 'Pastries' },
    { value: 'special', label: 'Special Drinks' }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Admin Panel - Menu Management</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/dashboard">
            <button style={{ padding: '10px 15px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              <i className="fas fa-tachometer-alt"></i> Dashboard
            </button>
          </Link>
        </div>
      </div>

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
          <label>Image URL: </label>
          <input
            type="text"
            name="image"
            value={form.image}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
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

      <h2>Menu Items</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {menuItems.map(item => (
          <div key={item._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
            <h3>{item.name.EN}</h3>
            <p><strong>AR:</strong> {item.name.AR}</p>
            <p><strong>Description EN:</strong> {item.description.EN}</p>
            <p><strong>Description AR:</strong> {item.description.AR}</p>
            <p><strong>Price:</strong> {item.price.EN} AED / {item.price.AR}</p>
            <p><strong>Category:</strong> {item.category}</p>
            <div style={{ marginTop: '10px' }}>
              <button onClick={() => handleEdit(item)} style={{ padding: '5px 10px', marginRight: '5px' }}>
                Edit
              </button>
              <button onClick={() => handleDelete(item._id)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
