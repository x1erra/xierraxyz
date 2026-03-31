const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const getDefaultApiOrigin = () => {
    if (typeof window === "undefined") {
        return "https://api.xierra.xyz";
    }

    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8000";
    }

    if (hostname === "xierra.xyz" || hostname.endsWith(".xierra.xyz")) {
        return "https://api.xierra.xyz";
    }

    return window.location.origin;
};

const API_ORIGIN = trimTrailingSlash(import.meta.env.VITE_API_ORIGIN || getDefaultApiOrigin());
const API_BASE_URL = `${API_ORIGIN}/api`;
const WS_BASE_URL = trimTrailingSlash(
    import.meta.env.VITE_WS_BASE_URL || `${API_ORIGIN.replace(/^http/, "ws")}/ws`
);

const parseResponse = async (response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || data.error || `Request failed with status ${response.status}`);
    }

    return data;
};

export const api = {
    startDownload: async (url, format = "any", quality = "best") => {
        const response = await fetch(`${API_BASE_URL}/downloads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, format, quality }),
        });
        return parseResponse(response);
    },

    getDownloads: async () => {
        const response = await fetch(`${API_BASE_URL}/downloads`);
        return parseResponse(response);
    },

    deleteDownload: async (filename) => {
        const response = await fetch(`${API_BASE_URL}/downloads/${encodeURIComponent(filename)}`, {
            method: "DELETE",
        });
        return parseResponse(response);
    },

    connectWebSocket: (onMessage) => {
        const ws = new WebSocket(WS_BASE_URL);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };

        let heartbeatId = null;
        const clearHeartbeat = () => {
            if (heartbeatId) {
                window.clearInterval(heartbeatId);
                heartbeatId = null;
            }
        };

        ws.addEventListener("open", () => {
            heartbeatId = window.setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("ping");
                }
            }, 30000);
        });
        ws.addEventListener("close", clearHeartbeat);
        ws.addEventListener("error", clearHeartbeat);

        return ws;
    },

    getDownloadUrl: (filename) => `${API_BASE_URL}/v3/download?filename=${encodeURIComponent(filename)}`,

    resolveUrl: (path) => {
        if (!path) {
            return "#";
        }

        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }

        return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
    },
};
