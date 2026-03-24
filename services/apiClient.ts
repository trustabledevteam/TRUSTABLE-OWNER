const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:3001';

const getToken = (): string | null => {
    return localStorage.getItem('access_token');
};

const authHeaders = (token?: string | null): Record<string, string> => {
    const t = token || getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (t) headers['Authorization'] = `Bearer ${t}`;
    return headers;
};

const handleResponse = async (res: globalThis.Response) => {
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || error.message || `HTTP ${res.status}`);
    }
    return res.json();
};

export const apiClient = {
    get: async (path: string, token?: string | null) => {
        const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(token) });
        return handleResponse(res);
    },

    post: async (path: string, body?: any, token?: string | null) => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: authHeaders(token),
            body: body ? JSON.stringify(body) : undefined
        });
        return handleResponse(res);
    },

    put: async (path: string, body?: any, token?: string | null) => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT',
            headers: authHeaders(token),
            body: body ? JSON.stringify(body) : undefined
        });
        return handleResponse(res);
    },

    delete: async (path: string, token?: string | null) => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'DELETE',
            headers: authHeaders(token)
        });
        return handleResponse(res);
    },

    upload: async (path: string, formData: FormData, token?: string | null) => {
        const t = token || getToken();
        const headers: Record<string, string> = {};
        if (t) headers['Authorization'] = `Bearer ${t}`;
        // Don't set Content-Type for FormData, let browser set it with boundary
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers,
            body: formData
        });
        return handleResponse(res);
    },

    getFileUrl: (filePath: string) => {
        return `${API_BASE}/uploads/${filePath}`;
    }
};

export { API_BASE };
