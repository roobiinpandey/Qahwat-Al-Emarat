import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './App.css';
import * as api from './api';

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('EN');
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [cart, setCart] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);

  useEffect(() => {
    // Load item details
    const loadItem = async () => {
      try {
        const menuItems = await api.fetchMenu();
        const foundItem = menuItems.find(menuItem => menuItem._id === id);
        if (foundItem) {
          setItem(foundItem);
          // Set default size if item has sizes
          if (foundItem.sizes && foundItem.sizes.length > 0) {
            const defaultSize = foundItem.sizes.find(size => size.isDefault) || foundItem.sizes[0];
            setSelectedSize(defaultSize);
          }
        } else {
          navigate('/menu');
        }
      } catch (error) {
        console.error('Error loading item:', error);
        navigate('/menu');
      } finally {
        setLoading(false);
      }
    };

    loadItem();

    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, [id, navigate]);

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

  const addToCart = (itemId, selectedSizeParam = null) => {
    const itemToAdd = item;
    const sizeToUse = selectedSizeParam || selectedSize;
    
    // Create cart item key that includes size for uniqueness
    const cartItemKey = sizeToUse ? `${itemId}_${sizeToUse.name.EN}` : itemId;

    setCart(prev => {
      const existing = prev.find(ci => ci.cartKey === cartItemKey);
      let newCart;
      if (existing) {
        newCart = prev.map(ci => ci.cartKey === cartItemKey ? { ...ci, quantity: ci.quantity + 1 } : ci);
      } else {
        const cartItem = {
          ...itemToAdd,
          cartKey: cartItemKey,
          selectedSize: sizeToUse,
          quantity: 1
        };
        newCart = [...prev, cartItem];
      }
      localStorage.setItem('cart', JSON.stringify(newCart));
      return newCart;
    });

    // Show success popup
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 2000);
  };

  const translations = {
    EN: {
      backToMenu: '← Back to Menu',
      addToCart: 'Add to Cart',
      description: 'Description',
      price: 'Price',
      loading: 'Loading...',
      itemNotFound: 'Item not found'
    },
    AR: {
      backToMenu: '← العودة إلى القائمة',
      addToCart: 'أضف إلى السلة',
      description: 'الوصف',
      price: 'السعر',
      loading: 'جارٍ التحميل...',
      itemNotFound: 'العنصر غير موجود'
    }
  };

  const t = translations[language];

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--light)' }}>
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
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          fontSize: '1.2rem',
          color: 'var(--text)'
        }}>
          {t.loading}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--light)' }}>
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
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          fontSize: '1.2rem',
          color: 'var(--text)'
        }}>
          {t.itemNotFound}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--light)'
    }}>
      {/* Success Popup */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          color: 'var(--primary)',
          border: '2px solid var(--primary)',
          borderRadius: '12px',
          padding: '2rem 3rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          fontSize: '1.5rem',
          fontWeight: 'bold',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease'
        }}>
          Item added to cart!
        </div>
      )}

      {/* Header identical to Menu page */}
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

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '3rem 2rem',
        backgroundColor: 'white',
        minHeight: 'calc(100vh - 120px)'
      }}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/menu')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: 'transparent',
            border: '2px solid var(--primary)',
            borderRadius: '8px',
            color: 'var(--primary)',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '2rem',
            transition: 'all 0.2s ease',
            textDecoration: 'none'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'var(--primary)';
            e.target.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = 'var(--primary)';
          }}
        >
          {t.backToMenu}
        </button>

        {/* Content Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4rem',
          alignItems: 'start'
        }}>
          {/* Image Section */}
          <div style={{
            position: 'relative'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0'
            }}>
              {item.image ? (
                <img
                  src={getImageUrl(item.image)}
                  alt={item.name[language]}
                  style={{
                    width: '100%',
                    height: '500px',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.target.src = `https://placehold.co/600x400/8B4513/FFFFFF?text=${encodeURIComponent(item.name[language])}`;
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '500px',
                  backgroundImage: `url('https://placehold.co/600x400/8B4513/FFFFFF?text=${encodeURIComponent(item.name[language])}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}></div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            {/* Title */}
            <div>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '400',
                color: 'var(--dark)',
                marginBottom: '0.5rem',
                lineHeight: '1.2'
              }}>
                {item.name[language]}
              </h1>
              <div style={{
                width: '80px',
                height: '2px',
                backgroundColor: 'var(--primary)',
                marginBottom: '1.5rem'
              }}></div>

              {/* Price */}
              <div style={{
                fontSize: '2rem',
                fontWeight: '600',
                color: 'var(--primary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="dirham-symbol">&#xea;</span>
                <span>
                  {selectedSize && selectedSize.price ?
                    (typeof selectedSize.price === 'object' ? selectedSize.price[language] || selectedSize.price.EN || '0.00' : selectedSize.price) :
                    (typeof item.price === 'object' ? item.price[language] || item.price.EN || '0.00' : item.price)
                  }
                </span>
              </div>

              {/* Size Selection */}
              {item.sizes && item.sizes.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: '500',
                    color: 'var(--dark)',
                    marginBottom: '1rem'
                  }}>
                    {language === 'EN' ? 'Select Size:' : 'اختر الحجم:'}
                  </h3>
                  <div className="size-options" style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    {item.sizes.map((size, sizeIdx) => (
                      <button
                        key={sizeIdx}
                        className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
                        onClick={() => setSelectedSize(size)}
                        style={{
                          padding: '12px 16px',
                          border: selectedSize === size ? '2px solid var(--primary)' : '2px solid #ddd',
                          borderRadius: '8px',
                          backgroundColor: selectedSize === size ? 'var(--primary)' : 'white',
                          color: selectedSize === size ? 'white' : 'var(--dark)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          minWidth: '80px'
                        }}
                      >
                        <span className="size-name" style={{ fontWeight: 'bold' }}>
                          {size.name[language]}
                        </span>
                        <span className="size-price" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.8rem'
                        }}>
                          <span className="dirham-symbol" style={{fontSize: '0.7em'}}>&#xea;</span>
                          <span>{typeof size.price === 'object' ? size.price[language] || size.price.EN || '0.00' : size.price}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '500',
                color: 'var(--dark)',
                marginBottom: '1rem'
              }}>
                {t.description}
              </h2>
              <div style={{
                backgroundColor: '#fafafa',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid #f0f0f0',
                lineHeight: '1.6',
                color: '#555',
                fontSize: '1rem',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {item.description[language]}
              </div>
            </div>

            {/* Add to Cart Button */}
            <div style={{
              marginTop: '2rem'
            }}>
              <button
                onClick={() => addToCart(item._id, selectedSize)}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = 'var(--secondary)';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'var(--primary)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <span style={{fontSize: '1.2rem'}}>🛒</span>
                {t.addToCart}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemDetailPage;
