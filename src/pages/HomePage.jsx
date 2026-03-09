// src/pages/HomePage.jsx
import React from 'react';
import { Layout } from 'antd';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Banner from '../components/Banner';
import About from '../components/About';

const { Content } = Layout;

const HomePage = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Content>
        <Banner />
        <About  />
      </Content>
      <Footer />
    </Layout>
  );
};

export default HomePage;