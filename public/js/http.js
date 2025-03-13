// HTTP 请求状态码
const HTTP_STATUS = {
    OK: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
};

// 基础 API URL
const BASE_URL = '';

// 统一错误处理
function handleError(error, defaultMessage = '请求失败') {
    console.error('API Error:', error);
    const consoleElement = document.getElementById('console');
    if (consoleElement) {
        consoleElement.innerHTML += `<div class="console-line error">${error.message || defaultMessage}</div>`;
        consoleElement.scrollTop = consoleElement.scrollHeight;
    }
    throw error;
}

// 检查响应状态
async function checkResponse(response) {
    if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        // TODO: 显示验证弹窗，处理key验证绑定
        // handleAuthenticationRequired();
        throw new Error('需要验证');
    }

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
}

// 统一请求处理
async function request(url, options = {}) {
    try {
        const response = await fetch(BASE_URL + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        await checkResponse(response);
        return await response.json();
    } catch (error) {
        handleError(error);
    }
}

// API 请求方法
window.http = {
    // GET 请求
    get: async (url) => {
        return request(url, { method: 'GET' });
    },

    // POST 请求
    post: async (url, data) => {
        return request(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // DELETE 请求
    delete: async (url) => {
        return request(url, { method: 'DELETE' });
    },

    // PUT 请求
    put: async (url, data) => {
        return request(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // PATCH 请求
    patch: async (url, data) => {
        return request(url, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
};

// API 端点
window.API = {
    accounts: {
        list: () => http.get('/api/accounts'),
        create: (data) => http.post('/api/accounts', data),
        delete: (email) => http.delete(`/api/accounts/${email}`),
    },
    register: {
        complete: () => http.post('/api/register/complete'),
        login: (data) => http.post('/api/register/login', data),
        register: (data) => http.post('/api/register/register', data),
        keepalive:(data) => http.post('/api/register/keepalive', data),

    },
    debug: {
        resetMachineCode: () => http.post('/api/debug/machine-code'),
        disableAutoUpdate: () => http.post('/api/debug/disable-auto-update'),
        openDebugBrowser: () => http.post('/api/debug/open-debug-browser'),
        updateAccountStatus: (data) => http.post('/api/debug/update-account-status', data),
    },
    config: {
        get: () => http.get('/api/config'),
        update: (data) => http.post('/api/config', data),
        getVersion: () => http.get('/api/config/info'),
    },
    license: {
        status: () => http.get('/api/license/status'),
        validate: (licenseKey) => http.post('/api/license/validate', { licenseKey }),
        clear: () => http.post('/api/license/clear'),
        current: () => http.get('/api/license/current'),
        getMachineCode: () => http.get('/api/license/machine-code')
    },
    users: {
        info: () => http.get('/api/users/info')
    }
}; 