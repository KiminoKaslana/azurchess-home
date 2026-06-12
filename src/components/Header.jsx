// src/components/Header.jsx
import { Link, useLocation } from 'react-router-dom';
import { BookOutlined, HomeOutlined, ProfileOutlined, SettingOutlined, SwapOutlined, TrophyOutlined } from '@ant-design/icons';
import { Button, Menu, Layout, Typography } from 'antd';
import './Header.css'; // 用于自定义样式
import { IS_TEST, OTHER_ENV, toggleEnv } from '../config/envConfig';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader = () => {
  const location = useLocation();

  return (
    <Header className="custom-header">
      <Link className="header-left" to="/">
        <div className="logo-icon">
          <img src="logo.png" alt="Game Logo" />
        </div>
        <Title level={4} className="game-title">
          {IS_TEST ? 'AZUR CHESS BETA' : 'AZUR CHESS'}
        </Title>
      </Link>

      <div className="header-right">
        {/* 导航菜单 */}
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          className="header-menu"
        >
          <Menu.Item key="/" icon={<HomeOutlined />} className="menu-item">
            <Link to="/">Home</Link>
          </Menu.Item>
          <Menu.Item key="/compendium" icon={<ProfileOutlined />} className="menu-item">
            <Link to="/compendium">图鉴</Link>
          </Menu.Item>
          <Menu.Item key="/manual" icon={<BookOutlined />} className="menu-item">
            <Link to="/manual">玩家手册</Link>
          </Menu.Item>
          <Menu.Item key="/leaderboard" icon={<TrophyOutlined />} className="menu-item">
            <Link to="/leaderboard">排行榜</Link>
          </Menu.Item>
          <Menu.Item key="/admin" icon={<SettingOutlined />} className="menu-item">
            <Link to="/admin">管理</Link>
          </Menu.Item>
        </Menu>

        {/* 正式服 / 测试服切换:记忆选择并刷新页面 */}
        <Button
          className="env-toggle"
          icon={<SwapOutlined />}
          onClick={toggleEnv}
        >
          切换到{OTHER_ENV.label}
        </Button>
      </div>
    </Header>
  );
};

export default AppHeader;
