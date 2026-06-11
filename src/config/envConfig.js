// 服务器环境配置(正式服 / 测试服)
// ────────────────────────────────────────────────
// 切换环境会把选择写入 localStorage 并刷新页面,使所有 API 客户端、
// 校验版本号、主题与页面文案按所选环境重新初始化。
// 因 reload 后本次会话内环境固定,各组件可直接读取 CURRENT_ENV / IS_TEST,
// 无需通过 props 层层传递。
import { darkTheme, lightTheme } from '../theme';

const isDev = process.env.NODE_ENV === 'development';

export const ENV_NAMES = {
  PROD: 'prod',
  TEST: 'test',
};

export const ENV_STORAGE_KEY = 'azurchess-server-env';

let testVersion = '0.0.0.0';

export const setTestVersion = (v) => {
  testVersion = v;
};

const fetchTestVersion = async () => {
  try {
    const res = await fetch('https://version.azurchess.2d-gate.cc', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        testVersion = data.version;
      }
    }
  } catch (e) {
    console.error('获取测试服动态版本号失败:', e);
  }
};

if (typeof window !== 'undefined') {
  fetchTestVersion();
}

export const envProfiles = {
  [ENV_NAMES.PROD]: {
    name: ENV_NAMES.PROD,
    label: '正式服',
    // 正式服使用亮色(= main 分支原生样式),app-shell 标记为 theme-light,
    // 且不加载 theme-dark.css,从而与改动前完全一致。
    themeClassName: 'theme-light',
    antdTheme: lightTheme,
    htmlTitle: 'Azur Chess - 碧蓝战棋',
    version: '1.26.2.28',
    servers: {
      user: isDev ? '/api/user' : 'https://user.azurchess.top',
      game: isDev ? '/api/game' : 'https://game.azurchess.top',
      file: isDev ? '/api/file' : 'https://file.azurchess.top',
    },
  },
  [ENV_NAMES.TEST]: {
    name: ENV_NAMES.TEST,
    label: '测试服',
    themeClassName: 'theme-dark',
    antdTheme: darkTheme,
    htmlTitle: 'Azur Chess Beta - 碧蓝战棋 测试服',
    get version() {
      return testVersion;
    },
    servers: {
      user: isDev ? '/api/user' : 'https://user.azurchess.2d-gate.cc',
      game: isDev ? '/api/game' : 'https://game.azurchess.2d-gate.cc',
      file: isDev ? '/api/file' : 'https://file.azurchess.2d-gate.cc',
    },
  },
};

export const getInitialEnvName = () => {
  if (typeof window === 'undefined') return ENV_NAMES.PROD;
  const saved = window.localStorage.getItem(ENV_STORAGE_KEY);
  return envProfiles[saved] ? saved : ENV_NAMES.PROD;
};

// 本次页面加载所处的环境(reload 切换,故整段会话内保持不变)
export const CURRENT_ENV_NAME = getInitialEnvName();
export const CURRENT_ENV = envProfiles[CURRENT_ENV_NAME];
export const IS_TEST = CURRENT_ENV_NAME === ENV_NAMES.TEST;

// 切换到指定环境:记忆选择并刷新页面
export const switchEnv = (envName) => {
  if (!envProfiles[envName] || typeof window === 'undefined') return;
  window.localStorage.setItem(ENV_STORAGE_KEY, envName);
  window.location.reload();
};

// 在正式服 / 测试服之间切换
export const toggleEnv = () => {
  switchEnv(CURRENT_ENV_NAME === ENV_NAMES.TEST ? ENV_NAMES.PROD : ENV_NAMES.TEST);
};

// 另一环境的档案(用于「切换到 XXX」按钮文案)
export const OTHER_ENV =
  envProfiles[CURRENT_ENV_NAME === ENV_NAMES.TEST ? ENV_NAMES.PROD : ENV_NAMES.TEST];
