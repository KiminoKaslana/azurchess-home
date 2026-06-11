// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CompendiumPage from './pages/CompendiumPage';
import ManualPage from './pages/ManualPage';
import AdminPage from './pages/AdminPage';
import LeaderboardPage from './pages/LeaderboardPage';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { CURRENT_ENV } from './config/envConfig';
// 暗色主题样式表整体作用于 .theme-dark 容器;正式服(.theme-light)不会命中其规则,
// 故能与 main 分支保持一致。(生产构建会静态提取 CSS,因此不能用条件加载来区分。)
import './theme-dark.css';

const App = () => {
  useEffect(() => {
    document.title = CURRENT_ENV.htmlTitle;
  }, []);

  return (
    <ConfigProvider locale={zhCN} theme={CURRENT_ENV.antdTheme}>
      <AntdApp>
        <div className={`app-shell ${CURRENT_ENV.themeClassName}`}>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/compendium" element={<CompendiumPage />} />
              <Route path="/manual" element={<ManualPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </Router>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
