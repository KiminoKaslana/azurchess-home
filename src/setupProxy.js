// src/setupProxy.js
// CRA 开发服务器代理配置，仅在 `npm start` 时生效
// 文档：https://create-react-app.dev/docs/proxying-api-requests-in-development/

const { createProxyMiddleware } = require('http-proxy-middleware');

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

    // 静态文件代理：/api/file/* → https://file.azurchess.top/*
    app.use(
        '/api/file',
        createProxyMiddleware({
            target: 'https://file.azurchess.top',
            changeOrigin: true,
            pathRewrite: { '^/api/file': '' },
            logLevel: 'warn',
        })
    );
};
