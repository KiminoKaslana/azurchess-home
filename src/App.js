// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CompendiumPage from './pages/CompendiumPage';
import AdminPage from './pages/AdminPage';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

const App = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/compendium" element={<CompendiumPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;