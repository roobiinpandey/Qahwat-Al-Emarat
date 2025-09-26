import React, { useState } from 'react';
import './App.css';

function ItemDetail({ items, initialIndex = 0, onClose, onAddToCart, language = 'EN', translations }) {
  const [index, setIndex] = useState(initialIndex);
  const item = items[index];
  const t = translations || {
    addToCart: 'Add to Cart',
    prev: 'Prev',
    next: 'Next'
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
          <h3 style={{color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px'}}>
            <span className="dirham-symbol">&#xea;</span>
            <span>{item.price[language]}</span>
          </h3>
          <button className="add-to-cart" style={{marginTop: '1rem'}} onClick={() => onAddToCart(item._id)}>{t.addToCart}</button>
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
