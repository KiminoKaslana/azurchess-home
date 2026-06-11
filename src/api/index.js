import serverConfig from '../config/serverConfig';
import { fileApiClient, gameApiClient, rootApiClient, userApiClient } from './client';

const withToken = (token, extraHeaders = {}) => ({
    headers: {
        Token: token,
        ...extraHeaders,
    },
});

const buildOptionalHeaders = (headers = {}) => {
    const sanitized = Object.entries(headers).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});

    return Object.keys(sanitized).length > 0 ? { headers: sanitized } : undefined;
};

export const authApi = {
    login(username, password) {
        return userApiClient.post('/Login', {
            UserName: username,
            Password: password,
            Version: serverConfig.version,
        });
    },

    /** 检查登录态是否有效，返回Role */
    me(token) {
        return userApiClient.post('/Me', null, withToken(token));
    },
};

export const userApi = {
    adminSetUserRole(payload, token) {
        return userApiClient.post('/AdminSetUserRole', payload, withToken(token));
    },
};

export const gameApi = {
    getDamageCoefficient() {
        return gameApiClient.post('/GetDamageCoefficient');
    },

    getManual() {
        return gameApiClient.post('/GetManual', null, {
            responseType: 'text',
        });
    },

    updateManual(content, token) {
        return gameApiClient.post('/UpdateManual', content, withToken(token, { 'Content-Type': 'text/plain; charset=utf-8' }));
    },

    updateDamageCoefficient(matrix, token) {
        return gameApiClient.post('/UpdateDamageCoefficient', matrix, withToken(token, { 'Content-Type': 'application/json' }));
    },

    getResourceInfo(platform) {
        const config = buildOptionalHeaders({ Platform: platform });
        return gameApiClient.post('/GetResourceInfo', null, config);
    },

    updateResourceInfo(resources, token, platform) {
        return gameApiClient.post(
            '/UpdateResourceInfo',
            resources,
            withToken(token, {
                'Content-Type': 'application/json',
                ...(platform ? { Platform: platform } : {}),
            })
        );
    },

    regenerateResourceInfo(token) {
        return gameApiClient.post('/RegenerateResourceInfo', null, withToken(token));
    },

    // 排行榜：Player 级登录接口，游戏服按 PlayerID 头校验登录态（非 Token）。
    // query: { SortBy: 'winRate'|'wins'|'games'|'avgDamage', MinGames: number, Limit: number }
    getLeaderboard(query, playerID) {
        return gameApiClient.post('/GetLeaderboard', query, {
            headers: { PlayerID: playerID },
        });
    },
};

export const staticApi = {
    getShips() {
        return fileApiClient.get('/Common/Ships.json');
    },

    getNameMap() {
        return rootApiClient.get('/NameMap.json');
    },

    getDownloadConfig() {
        return rootApiClient.get('/downloadConfig.json');
    },
};
