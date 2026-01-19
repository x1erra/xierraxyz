const API_BASE_URL = 'https://api.xierra.xyz/api';
const WS_BASE_URL = 'wss://api.xierra.xyz/ws';

export const api = {
    startDownload: async (url: string, format = "any", quality = "best", taskId?: string, strictMode = false, splitChapters = false) => {
        const response = await fetch(`${API_BASE_URL}/downloads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, format, quality, task_id: taskId, strict_mode: strictMode, split_chapters: splitChapters }),
        });
        return response.json();
    },
    getDownloadUrl: (filename: string) => {
        return `${API_BASE_URL.replace('/api', '')}/api/download/${encodeURIComponent(filename)}`;
    },


    deleteDownload: async (filename: string) => {
        const response = await fetch(`${API_BASE_URL}/downloads/${encodeURIComponent(filename)}`, {
            method: "DELETE",
        });
        return response.json();
    },

    connectWebSocket: (onMessage: (data: any) => void, onOpen?: () => void, onClose?: () => void) => {
        const ws = new WebSocket(WS_BASE_URL);

        ws.onopen = () => {
            if (onOpen) onOpen();
        };

        ws.onclose = () => {
            if (onClose) onClose();
        };

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
