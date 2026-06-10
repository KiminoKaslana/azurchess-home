// 服务器接口配置
// 实际的域名 / 版本号由当前所处环境(正式服 / 测试服)决定,见 envConfig.js。
// 开发环境下 Base URL 仍走 CRA 代理路径(setupProxy.js),与环境无关。
import { CURRENT_ENV } from './envConfig';

const serverConfig = {
    // 用户服 Base URL
    userServerBaseUrl: CURRENT_ENV.servers.user,

    // 游戏服 Base URL
    gameServerBaseUrl: CURRENT_ENV.servers.game,

    // 文件服 Base URL（用于 Ships.json 等静态资源）
    fileServerBaseUrl: CURRENT_ENV.servers.file,

    // 当前客户端版本（登录时校验）
    version: CURRENT_ENV.version,
};

export default serverConfig;
