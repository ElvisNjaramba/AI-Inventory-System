'use client';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// ✅ Pages
import Home from './pages/Home';
// import Login from './auth/Login';
import Register from './pages/authentication/Register';


function App() {
  return (
    <Router>
      <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route path="/login" element={<Login />} /> */}
          <Route path="/register" element={<Register />} />
        </Routes>
    </Router>
  );
}

export default App