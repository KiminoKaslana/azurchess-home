// src/pages/AuctionPage.jsx
import React from 'react';
import { Layout } from 'antd';
import Header from '../components/Header';

const { Content } = Layout;

// 特别竞拍时刻：以同源 iframe 内嵌竞拍应用（nginx 将 /auction/ 反代到竞拍服务）。
// 舞台按容器自适应缩放，这里去掉页脚、让 iframe 铺满视口剩余高度，游戏体验最大化。
const AuctionPage = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Content>
        <iframe
          title="特别竞拍时刻"
          src="/auction/"
          style={{
            width: '100%',
            height: 'calc(100vh - 64px)',
            border: 'none',
            display: 'block',
          }}
        />
      </Content>
    </Layout>
  );
};

export default AuctionPage;
