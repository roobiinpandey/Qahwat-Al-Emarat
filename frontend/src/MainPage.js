import React, { useState, useEffect } from 'react';
import './App.css';
import ItemDetail from './ItemDetail';
import { useNavigate } from 'react-router-dom';
import * as api from './api';

const categories = [
  { key: 'all', label: 'All Items' },
  { key: 'coffee', label: 'Coffee' },
  { key: 'tea', label: 'Tea' },
  { key: 'pastries', label: 'Pastries' },
  { key: 'special', label: 'Special Drinks' }
];

  const isWithinOperatingHours = (settings) => {
    const now = new Date();
    const openMinutes = parseInt(settings.openTime.split(':')[0], 10) * 60 + parseInt(settings.openTime.split(':')[1], 10);
    const closeMinutes = parseInt(settings.closeTime.split(':')[0], 10) * 60 + parseInt(settings.closeTime.split(':')[1], 10);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  };

function MainPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const [language, setLanguage] = useState('EN');
  const [showClosedPopup, setShowClosedPopup] = useState(false);
  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('storeSettings');
    return saved ? JSON.parse(saved) : { openTime: '08:00', closeTime: '22:00', orderingEnabled: true };
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Load menu from backend
    api.fetchMenu().then(items => {
      // Map backend items to frontend format
      const mappedItems = items.map((item, index) => ({
        id: item._id,
        _id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image: item.image
      }));
      setMenuItems(mappedItems);
    }).catch((error) => {
      console.warn('Failed to load menu from API:', error);
      // Show user-friendly error message for rate limiting
      if (error.message.includes('Too many requests') || error.message.includes('429')) {
        alert('The server is temporarily busy. Please wait a moment and refresh the page.');
      }
      // Do not load sample data when connection fails
      setMenuItems([]);
    });

    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      // Ensure all cart items have _id field for consistent key usage
      const normalizedCart = parsedCart.map(item => ({
        ...item,
        _id: item._id || item.id
      }));
      setCart(normalizedCart);
    }

    // Load settings from localStorage
    const loadSettings = () => {
      const saved = localStorage.getItem('storeSettings');
      console.log('Loading settings:', saved);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('Parsed settings:', parsed);
        setStoreSettings(parsed);
      }
    };
    loadSettings();
    
    // Check for settings changes every 1 second
    const interval = setInterval(loadSettings, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for cart changes from localStorage (for cross-page sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cart') {
        const newCart = e.newValue ? JSON.parse(e.newValue) : [];
        setCart(newCart);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper function to get correct image URL
  const getImageUrl = (image) => {
    if (!image) return null;
    // If it's already a full URL (starts with http), use it as is
    if (image.startsWith('http')) return image;
    // If it's a server path (starts with /), construct full backend URL
    if (image.startsWith('/')) {
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5050/api';
      const baseUrl = API_BASE.replace('/api', ''); // Remove /api to get base URL
      return `${baseUrl}${image}`;
    }
    // Otherwise, assume it's a filename in the images directory
    return `/images/${image}`;
  };

  const translations = {
    EN: {
      menuTitle: 'Our Menu',
      yourOrder: 'Your Order',
      total: 'Total:',
      proceed: 'Proceed to Checkout',
      emptyCart: 'Your cart is empty',
      addItems: 'Add items from the menu',
      categories: [
        { key: 'all', label: 'All Items' },
        { key: 'coffee', label: 'Coffee' },
        { key: 'tea', label: 'Tea' },
        { key: 'pastries', label: 'Pastries' },
        { key: 'special', label: 'Special Drinks' }
      ],
      addToCart: 'Add to Cart',
      prev: 'Prev',
      next: 'Next',
      orderForm: {
        fullName: 'Full Name',
        phone: 'Phone Number',
        orderType: 'Order Type',
        select: 'Select',
        dineIn: 'Dine In',
        takeaway: 'Takeaway',
        delivery: 'Delivery',
        tableNumber: 'Table Number',
        deliveryAddress: 'Delivery Address',
        specialInstructions: 'Special Instructions',
        placeOrder: 'Place Order'
      }
    },
    AR: {
      menuTitle: 'قائمة الطعام',
      yourOrder: 'طلبك',
      total: 'المجموع:',
      proceed: 'المتابعة للدفع',
      emptyCart: 'سلة الطلبات فارغة',
      addItems: 'أضف عناصر من القائمة',
      categories: [
        { key: 'all', label: 'كل العناصر' },
        { key: 'coffee', label: 'قهوة' },
        { key: 'tea', label: 'شاي' },
        { key: 'pastries', label: 'معجنات' },
        { key: 'special', label: 'مشروبات خاصة' }
      ],
      addToCart: 'أضف إلى السلة',
      prev: 'السابق',
      next: 'التالي',
      orderForm: {
        fullName: 'الاسم الكامل',
        phone: 'رقم الهاتف',
        orderType: 'نوع الطلب',
        select: 'اختر',
        dineIn: 'تناول في المطعم',
        takeaway: 'سفري',
        delivery: 'توصيل',
        tableNumber: 'رقم الطاولة',
        deliveryAddress: 'عنوان التوصيل',
        specialInstructions: 'ملاحظات خاصة',
        placeOrder: 'إرسال الطلب'
      }
    }
  };
  const t = translations[language];

  // Cart operations
  const addToCart = (itemId) => {
    const item = menuItems.find(menuItem => menuItem._id === itemId);
    setCart(prev => {
      const existing = prev.find(ci => ci._id === itemId);
      let newCart;
      if (existing) {
        newCart = prev.map(ci => ci._id === itemId ? { ...ci, quantity: ci.quantity + 1 } : ci);
      } else {
        newCart = [...prev, { ...item, quantity: 1 }];
      }
      localStorage.setItem('cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const increaseQuantity = (itemId) => {
    setCart(prev => {
      const newCart = prev.map(ci => ci._id === itemId ? { ...ci, quantity: ci.quantity + 1 } : ci);
      localStorage.setItem('cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const decreaseQuantity = (itemId) => {
    setCart(prev => {
      const newCart = prev.flatMap(ci => ci._id === itemId ? (ci.quantity > 1 ? [{ ...ci, quantity: ci.quantity - 1 }] : []) : [ci]);
      localStorage.setItem('cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const removeItem = (itemId) => {
    setCart(prev => {
      const newCart = prev.filter(ci => ci._id !== itemId);
      localStorage.setItem('cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price.EN * item.quantity, 0);

  // Modal form
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    orderType: '',
    tableNumber: '',
    deliveryAddress: '',
    specialInstructions: ''
  });

  const handleFormChange = e => {
    const { id, value } = e.target;
    setForm(f => ({ ...f, [id]: value }));
  };

  const handleOrderTypeChange = e => {
    setForm(f => ({ ...f, orderType: e.target.value }));
  };

  const placeOrder = e => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    if (!storeSettings.orderingEnabled) {
      setShowClosedPopup(true);
      setTimeout(() => setShowClosedPopup(false), 4000);
      return;
    }
    if (!isWithinOperatingHours(storeSettings)) {
      setShowClosedPopup(true);
      setTimeout(() => setShowClosedPopup(false), 4000);
      return;
    }
    // Prepare order data for backend
    const orderData = {
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      orderType: form.orderType,
      tableNumber: form.tableNumber,
      deliveryAddress: form.deliveryAddress,
      specialInstructions: form.specialInstructions,
      paymentMethod: 'cash', // Default payment method, can be extended later
      items: cart.map(item => ({
        menuItem: item._id, // Send ObjectId reference
        quantity: item.quantity
      })),
      totalAmount: cart.reduce((sum, item) => sum + item.price.EN * item.quantity, 0)
    };
    api.placeOrder(orderData).then(res => {
      setShowSuccess(true);
      setCart([]);
      localStorage.setItem('cart', JSON.stringify([]));
      setShowModal(false);
      setForm({
        customerName: '',
        customerPhone: '',
        orderType: '',
        tableNumber: '',
        deliveryAddress: '',
        specialInstructions: ''
      });
      setTimeout(() => setShowSuccess(false), 2000);
    }).catch(() => {
      alert('Failed to place order. Please try again.');
    });
  };

  // Detail view
  const openDetail = (item) => {
    navigate(`/item/${item._id || item.id}`);
  };

  const filteredItems = category === 'all' ? menuItems : menuItems.filter(item => item.category === category);

  return (
    <>
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          color: 'var(--primary)',
          border: '2px solid var(--primary)',
          borderRadius: '12px',
          padding: '2rem 3rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontSize: '1.5rem',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Order Successful
        </div>
      )}
      {showClosedPopup && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}></div>
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            color: '#d32f2f',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            padding: '2rem',
            textAlign: 'center',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '1.15rem',
            maxWidth: 400,
            width: '90%'
          }}>
            {!storeSettings.orderingEnabled 
              ? 'Online ordering is currently disabled. Please try again later.' 
              : `We're Closed, Please Visit During Operation hour (${storeSettings.openTime} - ${storeSettings.closeTime})`
            }
          </div>
        </>
      )}
      <header>
        <div className="logo">
          <img src="/logo.png" alt="Qahwatal Emarat" style={{height: '60px', width: 'auto'}} />
          <h1>QAHWAT AL EMARAT</h1>
        </div>
        <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              background: language === 'EN' ? 'var(--primary)' : 'white',
              color: language === 'EN' ? 'white' : 'var(--primary)',
              marginRight: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onClick={() => setLanguage('EN')}
          >EN</button>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              background: language === 'AR' ? 'var(--primary)' : 'white',
              color: language === 'AR' ? 'white' : 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onClick={() => setLanguage('AR')}
          >AR</button>
        </div>
      </header>
      <div className="container">
        <main className="menu-section">
          <h2><i className="fas fa-coffee"></i> {t.menuTitle}</h2>
          <div className="category-tabs">
            {t.categories.map(cat => (
              <div key={cat.key} className={`category-tab${category === cat.key ? ' active' : ''}`} onClick={() => setCategory(cat.key)}>{cat.label}</div>
            ))}
          </div>
          <div className="menu-items">
            {filteredItems.map((item, idx) => (
              <div className="menu-item" key={item._id || item.id || `item-${idx}`}>
                <div className="item-image" onClick={() => openDetail(item)} style={{cursor: 'pointer'}}>
                  {item.image ? (
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name[language]}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px 8px 0 0'
                      }}
                      onError={(e) => {
                        e.target.src = `https://placehold.co/400x300/8B4513/FFFFFF?text=${encodeURIComponent(item.name[language])}`;
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '200px',
                      backgroundImage: `url('https://placehold.co/400x300/8B4513/FFFFFF?text=${encodeURIComponent(item.name[language])}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '8px 8px 0 0'
                    }}></div>
                  )}
                </div>
                <div className="item-details">
                  <div className="item-title">
                    <h3>{item.name[language]}</h3>
                    <span className="price" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <span className="dirham-symbol">&#xea;</span>
                      <span>{item.price[language]}</span>
                    </span>
                  </div>
                  <p className="item-description">{item.description[language]}</p>
                  <button className="add-to-cart" onClick={() => addToCart(item._id)}>{t.addToCart}</button>
                </div>
              </div>
            ))}
          </div>
        </main>
  <aside className="cart-section">
          <h2><i className="fas fa-shopping-cart"></i> {t.yourOrder}</h2>
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <i className="fas fa-shopping-cart fa-2x"></i>
                <p>{t.emptyCart}</p>
                <p>{t.addItems}</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div className="cart-item" key={item._id || item.id || `cart-${idx}`}>
                  <div className="cart-item-details">
                    <h4>{item.name[language]}</h4>
                    <p style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <span className="dirham-symbol">&#xea;</span>
                      <span>{language === 'EN' ? item.price.EN.toFixed(2) : item.price.AR}</span>
                    </p>
                  </div>
                  <div className="cart-item-controls">
                    <button className="quantity-btn minus" onClick={() => decreaseQuantity(item._id)}>-</button>
                    <span>{item.quantity}</span>
                    <button className="quantity-btn plus" onClick={() => increaseQuantity(item._id)}>+</button>
                    <span className="remove-btn" onClick={() => removeItem(item._id)}><i className="fas fa-trash"></i></span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cart-total">
            <span>{t.total}</span>
            <span className="total-amount" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
              <span className="dirham-symbol">&#xea;</span>
              <span>{total.toFixed(2)}</span>
            </span>
          </div>
          <button className="checkout-btn" disabled={cart.length === 0} onClick={() => setShowModal(true)}>{t.proceed}</button>
        </aside>
      </div>
      {/* Modal */}
      {showModal && (
        <div className="modal" style={{display: 'flex'}}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t.proceed}</h2>
              <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
            </div>
            <form id="orderForm" onSubmit={placeOrder}>
              <div className="form-group">
                <label htmlFor="customerName">{t.orderForm.fullName}</label>
                <input type="text" id="customerName" value={form.customerName} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="customerPhone">{t.orderForm.phone}</label>
                <input type="tel" id="customerPhone" value={form.customerPhone} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="orderType">{t.orderForm.orderType}</label>
                <select id="orderType" value={form.orderType} onChange={handleOrderTypeChange} required>
                  <option value="">{t.orderForm.select}</option>
                  <option value="dine-in">{t.orderForm.dineIn}</option>
                  <option value="takeaway">{t.orderForm.takeaway}</option>
                  <option value="delivery">{t.orderForm.delivery}</option>
                </select>
              </div>
              {form.orderType === 'delivery' && (
                <div className="form-group" id="deliveryAddressGroup">
                  <label htmlFor="deliveryAddress">{t.orderForm.deliveryAddress}</label>
                  <textarea id="deliveryAddress" rows="3" value={form.deliveryAddress} onChange={handleFormChange} required />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="specialInstructions">{t.orderForm.specialInstructions}</label>
                <textarea id="specialInstructions" rows="3" value={form.specialInstructions} onChange={handleFormChange} placeholder={t.orderForm.specialInstructions} />
              </div>
              <button type="submit" className="submit-order">{t.orderForm.placeOrder}</button>
            </form>
          </div>
        </div>
      )}
      {/* Item Detail Modal */}
      {showDetail && (
        <ItemDetail
          items={filteredItems}
          initialIndex={detailIndex}
          onClose={() => setShowDetail(false)}
          onAddToCart={addToCart}
          language={language}
          translations={t}
        />
      )}
    </>
  );
}

export default MainPage;
