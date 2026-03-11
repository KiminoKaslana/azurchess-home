// src/components/Header.jsx
import { Link, useLocation } from 'react-router-dom';
import { HomeOutlined, ProfileOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu, Layout, Typography } from 'antd';
import './Header.css'; // 用于自定义样式

const { Header } = Layout;
const { Title } = Typography;

const AppHeader = () => {
  const location = useLocation();

  return (
    <Header className="custom-header">
      <a className="header-left" href='#home'>
        <div className="logo-icon">
          <img src="logo.png" alt="Game Logo" />
        </div>
        <Title level={4} className="game-title">
          AZUR CHESS
        </Title>
      </a>

      {/* 右侧导航菜单 */}
      <Menu 
        mode="horizontal" 
        theme="light" 
        selectedKeys={[location.pathname]}
        className="header-menu"
      >
        <Menu.Item key="/" icon={<HomeOutlined />} className="menu-item">
          <Link to="/">Home</Link>
        </Menu.Item>
        <Menu.Item key="/compendium" icon={<ProfileOutlined />} className="menu-item">
          <Link to="/compendium">图鉴</Link>
        </Menu.Item>
        <Menu.Item key="/admin" icon={<SettingOutlined />} className="menu-item">
          <Link to="/admin">管理</Link>
        </Menu.Item>
      </Menu>
    </Header>
  );
};

export default AppHeader;