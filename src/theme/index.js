import { theme } from 'antd';

// 正式服:沿用 main 分支的 Ant Design 默认主题(不覆盖任何 token),
// 配合「不加载 theme-dark.css」即可与改动前的样式、配色完全一致。
export const lightTheme = undefined;

// 测试服:暗色主题,颜色取自 web-theme-dark 皮肤的 theme.json。
export const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#297AA0',        // button.background
    colorInfo: '#3994BC',           // activityBarBadge.background
    colorLink: '#48A0C7',           // textLink.foreground
    colorLinkHover: '#53A5CA',      // textLink.activeForeground
    colorLinkActive: '#53A5CA',     // textLink.activeForeground
    colorBgBase: '#121314',         // editor.background
    colorTextBase: '#bfbfbf',       // foreground
    colorBorder: '#2A2B2CFF',       // panel.border
    colorBorderSecondary: '#2A2B2CFF',
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  },
  components: {
    Layout: {
      headerBg: 'transparent',
      bodyBg: '#121314',            // editor.background
      footerBg: '#191A1B',          // sideBar.background
    },
    Menu: {
      colorBgContainer: 'transparent',
      itemColor: '#bfbfbf',         // foreground
      itemHoverColor: '#48A0C7',    // textLink.foreground
      itemSelectedColor: '#48A0C7', // textLink.foreground
      horizontalItemSelectedColor: '#48A0C7',
    },
    Card: {
      colorBgContainer: '#191A1B',  // sideBar.background
      colorBorderSecondary: '#2A2B2CFF', // panel.border
    },
    Button: {
      primaryColor: '#FFFFFF',      // button.foreground
      colorPrimaryHover: '#2B7DA3', // button.hoverBackground
    },
  },
};
