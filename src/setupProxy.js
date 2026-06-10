// src/setupProxy.js
// CRA 开发服务器代理配置，仅在 `npm start` 时生效
// 文档：https://create-react-app.dev/docs/proxying-api-requests-in-development/

const { createProxyMiddleware } = require('http-proxy-middleware');

// 文件服代理目标:默认指向正式服;本地联调测试服后端时用 `SERVER_ENV=test npm start`。
// 注意:dev-server 运行在 Node 端,读不到浏览器 localStorage,故由环境变量决定。
const FILE_TARGET = process.env.SERVER_ENV === 'test'
    ? 'https://file.azurchess.2d-gate.cc'
    : 'https://file.azurchess.top';

module.exports = function (app) {
    // 用户服代理：/api/user/* → http://localhost:7000/*
    app.use(
        '/api/user',
        createProxyMiddleware({
            target: 'http://localhost:7000',
            changeOrigin: true,
            pathRewrite: { '^/api/user': '' },
            logLevel: 'warn',
        })
    );

    // 游戏服代理：/api/game/* → http://localhost:7001/*
    app.use(
        '/api/game',
        createProxyMiddleware({
            target: 'http://localhost:7001',
            changeOrigin: true,
            pathRewrite: { '^/api/game': '' },
            logLevel: 'warn',
        })
    );

    // 静态文件代理：/api/file/* → FILE_TARGET（默认正式服，可经 SERVER_ENV 切换）
    app.use(
        '/api/file',
        createProxyMiddleware({
            target: FILE_TARGET,
            changeOrigin: true,
            pathRewrite: { '^/api/file': '' },
            logLevel: 'warn',
        })
    );
};
