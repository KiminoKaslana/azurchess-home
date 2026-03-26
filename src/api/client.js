import axios from 'axios';
import serverConfig from '../config/serverConfig';

const DEFAULT_TIMEOUT = 15000;

const createClient = (baseURL) => axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT,
});

export const userApiClient = createClient(serverConfig.userServerBaseUrl);
export const gameApiClient = createClient(serverConfig.gameServerBaseUrl);
export const fileApiClient = createClient(serverConfig.fileServerBaseUrl);

// Root client is used for same-origin public assets, e.g. /NameMap.json.
export const rootApiClient = createClient('');
