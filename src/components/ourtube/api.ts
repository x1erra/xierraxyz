const API_BASE_URL = process.env.NEXT_PUBLIC_OURTUBE_API_URL || 'https://api.xierra.xyz/api';
const WS_BASE_URL = process.env.NEXT_PUBLIC_OURTUBE_WS_URL || 'wss://api.xierra.xyz/ws';

const parseResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
        ? await response.json().catch(() => ({}))
        : { detail: await response.text().catch(() => "") };

    if (!response.ok) {
        throw new Error(payload.detail || payload.error || `Request failed with status ${response.status}`);
    }

    return payload;
};

export const api = {
    startDownload: async (url: string, format = "any", quality = "best", taskId?: string, strictMode = false, splitChapters = false) => {
        const response = await fetch(`${API_BASE_URL}/downloads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, format, quality, task_id: taskId, strict_mode: strictMode, split_chapters: splitChapters }),
        });
        return parseResponse(response);
    },
    getDownloadUrl(filename: string) {
        return `${API_BASE_URL}/v3/download?filename=${encodeURIComponent(filename)}`;
    },


    deleteDownload: async (filename: string) => {
        const response = await fetch(`${API_BASE_URL}/downloads/${encodeURIComponent(filename)}`, {
            method: "DELETE",
        });
        return parseResponse(response);
    },

    getServerStatus: async () => {
        const response = await fetch(`${API_BASE_URL}/v2/status`);
        return parseResponse(response);
    },

    connectWebSocket: (onMessage: (data: any) => void, onOpen?: () => void, onClose?: () => void, onError?: () => void) => {
        const ws = new WebSocket(WS_BASE_URL);
        let heartbeatId: number | null = null;

        const clearHeartbeat = () => {
            if (heartbeatId !== null) {
                window.clearInterval(heartbeatId);
                heartbeatId = null;
            }
        };

        ws.onopen = () => {
            heartbeatId = window.setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("ping");
                }
            }, 30000);
            if (onOpen) onOpen();
        };

        ws.onclose = () => {
            clearHeartbeat();
            if (onClose) onClose();
        };

        ws.onerror = () => {
            clearHeartbeat();
            if (onError) onError();
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
