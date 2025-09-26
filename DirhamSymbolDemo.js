import React from 'react';
import './App.css';

const DirhamSymbolDemo = () => {
  const samplePrices = [
    { amount: 10.00, label: "Basic usage" },
    { amount: 25.50, label: "Decimal price" },
    { amount: 100.00, label: "Large amount" }
  ];

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>UAE Dirham Symbol Demo</h1>
      <p>This component demonstrates different ways to use the Dirham symbol.</p>

      <h2>Basic Usage</h2>
      <div style={{ marginBottom: '2rem' }}>
        {samplePrices.map((price, index) => (
          <div key={index} style={{ margin: '0.5rem 0' }}>
            <strong>{price.label}:</strong>{' '}
            <span className="dirham-symbol">&#xea;</span> {price.amount}
          </div>
        ))}
      </div>

      <h2>Styled Price Display</h2>
      <div style={{ marginBottom: '2rem' }}>
        {samplePrices.map((price, index) => (
          <div key={index} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            margin: '0.5rem',
            padding: '8px 16px',
            border: '2px solid #8B4513',
            borderRadius: '8px',
            backgroundColor: '#F5F5DC'
          }}>
            <span className="dirham-symbol" style={{
              color: '#8B4513',
              fontSize: '1.1em'
            }}>&#xea;</span>
            <span style={{
              fontWeight: 'bold',
              color: '#8B4513'
            }}>{price.amount}</span>
          </div>
        ))}
      </div>

      <h2>Inline Usage Examples</h2>
      <div style={{ marginBottom: '2rem', lineHeight: '2' }}>
        <p>Menu item: <span className="dirham-symbol">&#xea;</span> 15.00 - Arabic Coffee</p>
        <p>Cart total: <span className="dirham-symbol">&#xea;</span> 45.50</p>
        <p>Delivery fee: <span className="dirham-symbol">&#xea;</span> 5.00</p>
      </div>

      <h2>Code Examples</h2>
      <div style={{
        backgroundColor: '#f8f8f8',
        padding: '1rem',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '0.9em'
      }}>
        <pre>{`// Basic usage
<span className="dirham-symbol">&#xea;</span> {price}

// Styled price display
<div className="price">
  <span className="dirham-symbol">&#xea;</span>
  <span>{price}</span>
</div>

// With custom styling
<span className="dirham-symbol" style={{fontSize: "1.2em"}}>&#xea;</span>`}</pre>
      </div>
    </div>
  );
};

export default DirhamSymbolDemo;
