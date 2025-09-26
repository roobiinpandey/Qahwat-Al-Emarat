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
          <div className="item-image" style={{backgroundImage: `url('https://placehold.co/400x300/8B4513/FFFFFF?text=${encodeURIComponent(item.name[language])}')`, margin: '0 auto'}}></div>
          <p style={{margin: '1rem 0'}}>{item.description[language]}</p>
          <h3 style={{color: 'var(--primary)'}}>{item.price[language]}{language === 'EN' ? ' AED' : ''}</h3>
          <button className="add-to-cart" style={{marginTop: '1rem'}} onClick={() => onAddToCart(item.id)}>{t.addToCart}</button>
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
