import React, { useState, useEffect } from 'react';
import './App.css';
import * as api from './api';

function ItemDetail({ items, initialIndex = 0, onClose, onAddToCart, language = 'EN', translations }) {
  const [index, setIndex] = useState(initialIndex);
  const [inventoryData, setInventoryData] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const item = items[index];
  const t = translations || {
    addToCart: 'Add to Cart',
    prev: 'Prev',
    next: 'Next'
  };

  // Fetch inventory data when item changes
  useEffect(() => {
    const fetchInventoryData = async () => {
      if (item && item._id) {
        try {
          setLoadingInventory(true);
          const inventory = await api.getInventoryItem(item._id);
          setInventoryData(inventory);
        } catch (error) {
          console.error('Failed to fetch inventory data:', error);
          setInventoryData(null);
        } finally {
          setLoadingInventory(false);
        }
      }
    };

    // Set default size when item changes
    if (item && item.sizes && item.sizes.length > 0) {
      const defaultSize = item.sizes.find(size => size.isDefault) || item.sizes[0];
      setSelectedSize(defaultSize);
    } else {
      setSelectedSize(null);
    }

    fetchInventoryData();
  }, [item._id]);

  // Helper function to get stock status
  const getStockStatus = () => {
    if (!inventoryData) return { text: 'No inventory data', color: '#666' };
    
    if (inventoryData.currentStock === 0) {
      return { text: 'Out of Stock', color: '#d32f2f' };
    }
    if (inventoryData.currentStock <= inventoryData.minStock) {
      return { text: 'Low Stock', color: '#f57c00' };
    }
    return { text: 'In Stock', color: '#388e3c' };
  };

  // Helper function to get correct image URL
  const getImageUrl = (image) => {
    if (!image) return null;
    // If it's already a full URL (starts with /), use it as is
    if (image.startsWith('/')) return image;
    // Otherwise, assume it's a filename in the images directory
    return `/images/${image}`;
  };

  const handleSwipe = (direction) => {
    if (direction === 'left' && index < items.length - 1) {
      setIndex(index + 1);
    } else if (direction === 'right' && index > 0) {
      setIndex(index - 1);
    }
  };

  return (
    <div className="modal" style={{display: 'flex'}}>
      <div className="modal-content" style={{maxWidth: 600}}>
        <div className="modal-header">
          <h2>{item.name[language]}</h2>
          <span className="close-modal" onClick={onClose}>&times;</span>
        </div>
        <div style={{textAlign: 'center'}}>
          <div className="item-image" style={{margin: '0 auto'}}>
            {item.image ? (
              <img
                src={getImageUrl(item.image)}
                alt={item.name[language]}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  height: '300px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
                onError={(e) => {
                  e.target.src = `https://placehold.co/400x300/8B4513/FFFFFF?text=${encodeURIComponent(item.name[language])}`;
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                maxWidth: '400px',
                height: '300px',
                backgroundImage: `url('https://placehold.co/400x300/8B4513/FFFFFF?text=${encodeURIComponent(item.name[language])}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px'
              }}></div>
            )}
          </div>
          <p style={{margin: '1rem 0'}}>{item.description[language]}</p>
          
          {/* Size Selection */}
          {item.sizes && item.sizes.length > 0 && (
            <div style={{margin: '1rem 0'}}>
              <h4 style={{marginBottom: '0.5rem', color: 'var(--dark)'}}>Select Size:</h4>
              <div className="size-options" style={{justifyContent: 'center'}}>
                {item.sizes.map((size, sizeIdx) => (
                  <button
                    key={sizeIdx}
                    className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    <span className="size-name">{size.name[language]}</span>
                    <span className="size-price" style={{display: 'flex', alignItems: 'center', gap: '2px'}}>
                      <span className="dirham-symbol" style={{fontSize: '0.8em'}}>&#xea;</span>
                      <span>{typeof size.price === 'object' ? size.price[language] || size.price.EN || '0.00' : size.price}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <h3 style={{color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px'}}>
            <span className="dirham-symbol">&#xea;</span>
            <span>
              {selectedSize && selectedSize.price ?
                (typeof selectedSize.price === 'object' ? selectedSize.price[language] || selectedSize.price.EN || '0.00' : selectedSize.price) :
                (typeof item.price === 'object' ? item.price[language] || item.price.EN || '0.00' : item.price)
              }
            </span>
          </h3>
          
          {/* Stock Information */}
          <div style={{margin: '1rem 0', padding: '0.5rem', borderRadius: '4px', backgroundColor: '#f8f9fa'}}>
            {loadingInventory ? (
              <p style={{margin: 0, color: '#666'}}>Loading stock information...</p>
            ) : inventoryData ? (
              <div>
                <p style={{margin: '0 0 0.5rem 0', fontWeight: 'bold'}}>
                  Stock Status: <span style={{color: getStockStatus().color}}>{getStockStatus().text}</span>
                </p>
                <div style={{display: 'flex', gap: '1rem', fontSize: '0.9rem'}}>
                  <span>Current Stock: <strong>{inventoryData.currentStock} {inventoryData.unit}</strong></span>
                  <span>Min Stock: <strong>{inventoryData.minStock} {inventoryData.unit}</strong></span>
                </div>
                {inventoryData.supplier && (
                  <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666'}}>
                    Supplier: {inventoryData.supplier}
                  </p>
                )}
              </div>
            ) : (
              <p style={{margin: 0, color: '#666'}}>No inventory information available</p>
            )}
          </div>
          
          <button className="add-to-cart" style={{marginTop: '1rem'}} onClick={() => onAddToCart(item._id, selectedSize)}>{t.addToCart}</button>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '2rem'}}>
          <button className="quantity-btn" onClick={() => handleSwipe('right')} disabled={index === 0}>{t.prev} &#8592;</button>
          <button className="quantity-btn" onClick={() => handleSwipe('left')} disabled={index === items.length - 1}>&#8594; {t.next}</button>
        </div>
      </div>
    </div>
  );
}

export default ItemDetail;
