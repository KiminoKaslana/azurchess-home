// 服务器接口配置
// 开发环境使用 CRA 代理路径（setupProxy.js），生产环境替换为实际服务器地址
const isDev = process.env.NODE_ENV === 'development';

const serverConfig = {
    // 用户服 Base URL
    // 开发：请求经由 CRA dev-server 代理转发至 http://localhost:7000
    // 生产：直接填写实际地址，如 'https://user.azurchess.top'
    userServerBaseUrl: isDev ? '/api/user' : 'http://localhost:7000',

    // 游戏服 Base URL
    // 开发：请求经由 CRA dev-server 代理转发至 http://localhost:7001
    // 生产：直接填写实际地址，如 'https://game.azurchess.top'
    gameServerBaseUrl: isDev ? '/api/game' : 'http://localhost:7001',

    // 当前客户端版本（登录时校验）
    version: '1.26.2.28',
};

export default serverConfig;
