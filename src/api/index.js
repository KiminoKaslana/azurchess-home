import axios from 'axios';
import serverConfig from '../config/serverConfig';
import { fileApiClient, gameApiClient, rootApiClient, userApiClient } from './client';

export const gameServerBaseUrl = serverConfig.gameServerBaseUrl;

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

const encodeHeaderValue = (value = '') => encodeURIComponent(value);

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
        const config = buildOptionalHeaders({ OS: platform });
        return gameApiClient.post('/GetResourceInfo', null, config);
    },

    getResourceInfoMetadata(platform, token) {
        return gameApiClient.post(
            '/GetResourceInfoMetadata',
            null,
            withToken(token, {
                ...(platform ? { OS: platform } : {}),
            })
        );
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

    uploadResourceFile(file, metadata, token, onUploadProgress) {
        const resourceName = metadata.resourceName || file.name;
        const ossPrefix = metadata.ossPrefix || 'Common';

        return gameApiClient.post('/UploadResourceFile', file, {
            headers: {
                Token: token,
                'Content-Type': 'application/octet-stream',
                'Resource-Name': encodeHeaderValue(resourceName),
                'Resource-Hash': metadata.hash,
                'OSS-Prefix': encodeHeaderValue(ossPrefix),
                ...(metadata.platform ? { 'Resource-Platform': metadata.platform } : {}),
            },
            timeout: 10 * 60 * 1000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            onUploadProgress,
        });
    },

    regenerateResourceInfo(token) {
        return gameApiClient.post('/RegenerateResourceInfo', null, withToken(token));
    },

    // 排行榜：任意有效账号可访问，游戏服按 Token 校验登录态。
    // query: { SortBy: 'winRate'|'wins'|'games'|'avgDamage', MinGames: number, Limit: number }
    getLeaderboard(query, token) {
        return gameApiClient.post('/GetLeaderboard', query, withToken(token));
    },

    getReplayList(query = {}, auth = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(auth.token ? { Token: auth.token } : {}),
            ...(auth.playerID ? { PlayerID: auth.playerID } : {}),
        };
        return gameApiClient.post('/GetReplayList', query, { headers });
    },

    getMatchLog(replayId, token) {
        return gameApiClient.post(
            '/GetMatchLog',
            { ReplayId: replayId },
            withToken(token, { 'Content-Type': 'application/json' })
        );
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

const normalizeShipsData = (data) => (Array.isArray(data) ? data : Object.values(data));

/** 拉取 Ships.json：优先用资源清单完整 URL，再回退同域 pathname 与 /Common/Ships.json */
export async function fetchShipsData() {
    const resInfoRes = await gameApi.getResourceInfo();
    const resourceList = Array.isArray(resInfoRes.data) ? resInfoRes.data : [];
    const shipResource = resourceList.find((r) => r.Name === 'Ships.json');

    if (shipResource?.URL) {
        try {
            const res = await axios.get(shipResource.URL);
            return normalizeShipsData(res.data);
        } catch {
            try {
                const pathname = new URL(shipResource.URL).pathname;
                const res = await fileApiClient.get(pathname);
                return normalizeShipsData(res.data);
            } catch {
                // fall through to static path
            }
        }
    }

    const res = await staticApi.getShips();
    return normalizeShipsData(res.data);
}
