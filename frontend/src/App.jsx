'use client';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// ✅ Pages
import Login from './pages/authentication/Login';
import Register from './pages/authentication/Register';
import Dashboard from './pages/Dashboard';


function App() {
  return (
    <Router>
      <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
    </Router>
  );
}

export default App