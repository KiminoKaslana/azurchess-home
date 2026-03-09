import React from 'react';

const Footer = () => {
  return (
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
};

export default Footer;