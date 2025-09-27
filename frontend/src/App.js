import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import MainPage from './MainPage';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import AdminLogin from './AdminLogin';
import ItemDetailPage from './ItemDetailPage';
import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/menu" element={<MainPage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/adminpanel" element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="*" element={<MainPage />} />
      </Routes>
    </Router>
  );
}

export default App;
