import { clearSessionStorage } from "../utils/auth";


// export const API_BASE = "https://qs233r41-8000.inc1.devtunnels.ms/api/v1";
// export const API_BASE = "http://127.0.0.1:8000/api/v1";
export const API_BASE = "http://192.168.20.28:8000/api/v1";
 
export const SOCKET_BASE = API_BASE.replace(/^http/, "ws");
 
export function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("crm_auth_token") ?? "";
}
 
export function authHeaders(isFormData = false, skipAuth = false) {
    const token = getToken();
    return {
        ...(!isFormData && {
            "Content-Type": "application/json",
            Accept: "application/json",
        }),
        ...(!skipAuth && token && { Authorization: `Bearer ${token}` }),
    };
}
 
const REQUEST_TIMEOUT_MS = 60000;

async function readBodyWithIdleTimeout(res, idleMs = 1500, maxMs = 20000) {
    if (!res.body || !res.body.getReader) {
        return res.text();
    }
 
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let lastChunkTime = Date.now();
    const start = Date.now();
 
    try {
        while (true) {
            const idleRemaining = idleMs - (Date.now() - lastChunkTime);
            const maxRemaining = maxMs - (Date.now() - start);
            const waitMs = Math.max(0, Math.min(idleRemaining, maxRemaining));
 
            if (waitMs <= 0) break; 
 
            const result = await Promise.race([
                reader.read(),
                new Promise((resolve) => setTimeout(() => resolve({ __idle: true }), waitMs)),
            ]);
 
            if (result.__idle) break; 
 
            const { done, value } = result;
            if (value) {
                text += decoder.decode(value, { stream: true });
                lastChunkTime = Date.now();
            }
            if (done) break;
        }
    } finally {
        try { reader.cancel(); } catch (e) { /* ignore */ }
    }
 
    return text;
}
 
export async function apiFetch(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const { skipAuth = false, ...fetchOptions } = options;
 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
 
    try {
        let res;
        try {
            res = await fetch(`${API_BASE}${path}`, {
                ...fetchOptions,
                headers: {
                    ...authHeaders(isFormData, skipAuth),
                    ...options.headers,
                },
                signal: controller.signal,
            });
        } catch (fetchErr) {
            if (fetchErr.name === "AbortError") {
                throw new Error("Request timed out. Please check your connection and try again.");
            }
            throw new Error("Network error. Please check your connection and try again.");
        }
 
if (res.status === 401) {
    localStorage.removeItem("crm_auth_token");
    localStorage.removeItem("crm_user");
    document.cookie = "crm_auth_token=; Max-Age=0; path=/; SameSite=Lax";
    if (typeof window !== "undefined") window.location.href = "/";
    throw new Error("Unauthorized");
}
 
        let responseText = "";
        try {

            responseText = await readBodyWithIdleTimeout(res.clone());
        } catch (readErr) {
            throw new Error("Failed to read the server's response. Please try again.");
        }
 
        let json = {};
        try {
            json = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error("Invalid JSON response:", responseText);
        }
 
        if (!res.ok) {
            const firstFieldError = json?.errors ? Object.values(json.errors).flat()[0] : null;
            const message = json?.message || firstFieldError || `Request failed (${res.status})`;
            const err = new Error(message);
            err.status = res.status;
            err.errors = json.errors || {};
            throw err;
        }
 
        return json;
    } finally {
        clearTimeout(timeoutId);
    }
}