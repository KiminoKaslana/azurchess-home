import React from 'react';
import { IS_TEST } from '../config/envConfig';

// 测试服页脚（acb 简版）—— 当前工作区现状
const TestFooter = () => (
  <footer className="acb-footer">
    <div className="container">
      <p className="acb-footer__text">
        © {new Date().getFullYear()} AzurChess - 碧蓝战棋 同人游戏 | 本游戏仅作交流学习使用
      </p>
    </div>
  </footer>
);

// 正式服页脚（含备案号）—— 还原 main 分支
const ProdFooter = () => (
  <footer style={{ background: '#f5f5f5', padding: '30px 0', marginTop: '60px' }}>
    <div className="container">
      <div style={{ textAlign: 'center' }}>
        <div className="footer-copyright">
          <p style={{ color: '#666', margin: 0 }}>
            © {new Date().getFullYear()} AzurChess - 碧蓝战棋 同人游戏 | 本游戏仅作交流学习使用
          </p>
        </div>
      </div>
    </div>
  </footer>
);

const Footer = () => (IS_TEST ? <TestFooter /> : <ProdFooter />);

export default Footer;
