import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { CourierDashboard } from './pages/CourierDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ShippingCalculator } from './pages/ShippingCalculator';
import './App.css';

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/student/*" element={<StudentDashboard />} />
            <Route path="/courier/*" element={<CourierDashboard />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/shipping" element={<ShippingCalculator />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </FluentProvider>
  );
}

export default App;
