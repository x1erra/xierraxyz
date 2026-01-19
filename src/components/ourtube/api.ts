const API_BASE_URL = 'https://api.xierra.xyz/api';
const WS_BASE_URL = 'wss://api.xierra.xyz/ws';

export const api = {
    startDownload: async (url: string, format = "any", quality = "best") => {
        const response = await fetch(`${API_BASE_URL}/downloads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, format, quality }),
        });
        return response.json();
    },

    getDownloads: async () => {
        const response = await fetch(`${API_BASE_URL}/downloads`);
        return response.json();
    },

    deleteDownload: async (filename: string) => {
        const response = await fetch(`${API_BASE_URL}/downloads/${encodeURIComponent(filename)}`, {
            method: "DELETE",
        });
        return response.json();
    },

    connectWebSocket: (onMessage: (data: any) => void) => {
        const ws = new WebSocket(WS_BASE_URL);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (e) {
                console.error("Failed to parse WS message", e);
            }
        };
        return ws;
    }
};
