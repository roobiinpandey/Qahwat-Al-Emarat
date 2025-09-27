import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Lazy load components for code splitting
const MainPage = React.lazy(() => import('./MainPage'));
const Dashboard = React.lazy(() => import('./Dashboard'));
const AdminPanel = React.lazy(() => import('./AdminPanel'));
const AdminLogin = React.lazy(() => import('./AdminLogin'));
const ItemDetailPage = React.lazy(() => import('./ItemDetailPage'));
const ProtectedRoute = React.lazy(() => import('./ProtectedRoute'));

// Loading component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: 'var(--text-secondary)'
  }}>
    <div>Loading...</div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/menu" element={<MainPage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/adminpanel" element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          } />
          <Route path="*" element={<MainPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
