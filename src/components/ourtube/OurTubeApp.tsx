"use client";

import { useState, useEffect, useRef } from 'react';
import { api } from './api';
import { Download, Trash2, Settings2, Clipboard, Info } from 'lucide-react';
import { PullToRefresh } from '../PullToRefresh';


import Starfield from '@/components/Starfield';

const InfoTooltip = ({ text }: { text: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="group relative inline-flex items-center ml-2">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent label click
                    setIsOpen(!isOpen);
                }}
                className="focus:outline-none"
            >
                <Info size={14} className={`transition cursor-help ${isOpen ? 'text-white' : 'text-zinc-500 hover:text-white'}`} />
            </button>

            {/* Tooltip Content */}
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-lg text-xs text-zinc-300 shadow-xl transition-all duration-200 z-50 text-center leading-relaxed ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 pointer-events-none'}`}>
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900/95"></div>
            </div>

            {/* Backdrop for mobile to close on outside tap */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default function OurTubeApp() {
    const [url, setUrl] = useState("");
    const [activeDownloads, setActiveDownloads] = useState<any>({});
    const [completedDownloads, setCompletedDownloads] = useState<any[]>([]);
    const [quality, setQuality] = useState("best");
    const [format, setFormat] = useState("any");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [connected, setConnected] = useState(false);
    const [strictMode, setStrictMode] = useState(false);
    const [splitChapters, setSplitChapters] = useState(false);
    const myIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Load library from local storage
        const savedLibrary = localStorage.getItem("ourtube_library");
        if (savedLibrary) {
            try {
                setCompletedDownloads(JSON.parse(savedLibrary));
            } catch (e) {
                console.error("Failed to parse local library");
            }
        }

        // Load myIds from local storage
        const savedIds = localStorage.getItem("ourtube_my_ids");
        if (savedIds) {
            try {
                const parsed = JSON.parse(savedIds);
                if (Array.isArray(parsed)) {
                    parsed.forEach(id => myIds.current.add(id));
                }
            } catch (e) {
                console.error("Failed to parse my_ids");
            }
        }

        // Connect to WebSocket
        const ws = api.connectWebSocket(
            (event) => {
                const { type, id, data: nestedData, error } = event;
                const downloadId = id || (nestedData && nestedData.id);

                if (type === "progress" && downloadId) {
                    if (!myIds.current.has(downloadId)) return;

                    setActiveDownloads((prev: any) => ({
                        ...prev,
                        [downloadId]: {
                            ...(prev[downloadId] || {}),
                            ...event,
                            ...(nestedData || {})
                        },
                    }));
                } else if (type === "finished" && downloadId) {
                    if (!myIds.current.has(downloadId)) {
                        // Clean up active if it was there (shouldn't be, but good hygiene)
                        setActiveDownloads((prev: any) => {
                            const next = { ...prev };
                            if (next[downloadId]) delete next[downloadId];
                            return next;
                        });
                        return;
                    }

                    // Update Active State
                    setActiveDownloads((prev: any) => {
                        const next = { ...prev };
                        delete next[downloadId];
                        return next;
                    });

                    // Add to Local Library (Private)
                    const filename = event.filename || (nestedData && nestedData.filename);
                    const fileSize = event.file_size || (nestedData && nestedData.file_size) || 0;

                    if (filename) {
                        setCompletedDownloads((prev) => {
                            const newEntry = { filename, size: fileSize, date: Date.now() };
                            const unique = [newEntry, ...prev.filter(p => p.filename !== filename)];
                            localStorage.setItem("ourtube_library", JSON.stringify(unique));
                            return unique;
                        });
                    }

                } else if (type === "error") {
                    console.error("Download error:", error);
                    setActiveDownloads((prev: any) => {
                        const next = { ...prev };
                        if (downloadId) delete next[downloadId];
                        return next;
                    });
                    alert(`Download failed: ${error || 'Unknown error'}`);
                }
            },
            () => setConnected(true), // OnOpen
            () => setConnected(false) // OnClose
        );

        return () => ws.close();
    }, []);

    const handleDownload = async () => {
        if (!url) return;

        // Generate ID locally to ensure we catch all events (privacy filter needs to know about it BEFORE we send request)
        // Simple UUID v4 generator
        const taskId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

        try {
            // 1. Register ID as "mine" IMMEDIATELY
            myIds.current.add(taskId);
            localStorage.setItem("ourtube_my_ids", JSON.stringify(Array.from(myIds.current)));

            // 2. Send request with this ID
            const response = await api.startDownload(url, format, quality, taskId, strictMode, splitChapters);

            // 3. Fallback: If server returned a different ID for some reason (shouldn't happen with updated backend), track that too
            if (response && response.id && response.id !== taskId) {
                myIds.current.add(response.id);
                localStorage.setItem("ourtube_my_ids", JSON.stringify(Array.from(myIds.current)));
            }

            setUrl("");
        } catch (e) {
            console.error(e);
            alert("Failed to start download");
            // Cleanup on explicit failure (optional, but keeps list clean)
            // myIds.current.delete(taskId);
            // localStorage.setItem("ourtube_my_ids", JSON.stringify(Array.from(myIds.current)));
        }
    };

    const handleDelete = async (filename: string) => {
        try {
            await api.deleteDownload(filename);
            setCompletedDownloads((prev) => {
                const updated = prev.filter((d) => d.filename !== filename);
                localStorage.setItem("ourtube_library", JSON.stringify(updated));
                return updated;
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleClearAll = () => {
        if (confirm("Are you sure you want to clear your download library? This will delete all history from this device.")) {
            setCompletedDownloads([]);
            localStorage.removeItem("ourtube_library");
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) setUrl(text);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            // Fallback for non-secure contexts or denied permissions if needed, 
            // but usually just doing nothing or focusing input is enough.
            // For now, let's just focus the input if we can't paste directly?
            // Actually, manual paste is the fallback.
            alert("Could not access clipboard. Please paste manually.");
        }
    };

    return (
        <PullToRefresh>
            <div className="flex flex-col min-h-[100dvh] relative font-sans text-white selection:bg-white selection:text-black overflow-x-hidden">
                <Starfield className="fixed inset-0 z-0 pointer-events-none" />


                {/* Header */}
                <header className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/10">
                    <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3 text-white">
                                <span className="text-xl font-black tracking-widest">XIERRA</span>
                                <span className="text-zinc-600 text-xl font-light">|</span>
                                <span className="text-xl font-mono tracking-widest text-zinc-300">OURTUBE</span>
                                <span className="ml-2 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-400">v2.0</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></span>
                                <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                                    {connected ? 'System Ready' : 'Connecting to Pi...'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-zinc-900/80 border border-white/5 rounded-full px-4 py-2 backdrop-blur-md shadow-sm">
                                <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase border-r border-white/10 pr-3">Library</span>
                                <span className="text-xs font-mono text-white">{completedDownloads.length}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-8 space-y-12 bg-black/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 relative z-10 mt-8 mb-8">
                    {/* Input Section */}
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1 group">
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste link..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pr-12 text-sm text-white focus:outline-none focus:border-white/40 transition placeholder-zinc-600 shadow-inner"
                                />
                                <button
                                    onClick={handlePaste}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-white transition rounded-md hover:bg-white/10"
                                    title="Paste from clipboard"
                                >
                                    <Clipboard size={16} />
                                </button>
                            </div>
                            <button
                                onClick={handleDownload}
                                className="bg-transparent border border-white/30 hover:bg-white/10 hover:border-white text-white px-5 py-3 rounded-lg font-bold tracking-widest transition shadow-[0_0_15px_rgba(255,255,255,0.05)] uppercase text-[10px]"
                            >
                                Download
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="flex-1 md:flex-none">
                                    <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Quality</label>
                                    <div className="relative">
                                        <select
                                            value={quality}
                                            onChange={(e) => setQuality(e.target.value)}
                                            className="w-full md:w-32 appearance-none bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 cursor-pointer"
                                        >
                                            <option value="best">Best</option>
                                            <option value="best_ios">Best (iOS)</option>
                                            <option value="2160p">2160p</option>
                                            <option value="1440p">1440p</option>
                                            <option value="1080p">1080p</option>
                                            <option value="720p">720p</option>
                                            <option value="480p">480p</option>
                                            <option value="360p">360p</option>
                                            <option value="240p">240p</option>
                                            <option value="worst">Worst</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex-1 md:flex-none">
                                    <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Format</label>
                                    <div className="relative">
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value)}
                                            className="w-full md:w-32 appearance-none bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 cursor-pointer"
                                        >
                                            <option value="any">Any (Best)</option>
                                            <option value="mp4">MP4</option>
                                            <option value="m4a">M4A</option>
                                            <option value="mp3">MP3</option>
                                            <option value="opus">OPUS</option>
                                            <option value="wav">WAV</option>
                                            <option value="flac">FLAC</option>
                                            <option value="thumbnail">Thumbnail</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className={`w-full md:w-auto mt-2 md:mt-6 flex items-center justify-center gap-2 text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition border ${showAdvanced ? 'bg-white text-black border-white' : 'border-white/10 text-zinc-400 hover:text-white hover:border-white/30'} `}
                            >
                                <Settings2 size={14} />
                                Options
                            </button>
                        </div>

                        {showAdvanced && (
                            <div className="bg-black/90 border border-white/10 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-zinc-500">Auto Start</label>
                                        <select className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-zinc-300"><option>YES</option><option>NO</option></select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="col-span-1 md:col-span-2 flex flex-col gap-3 pt-2">
                                        <label className="flex items-center gap-3 text-sm text-zinc-400 cursor-pointer hover:text-white transition group select-none">
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={strictMode}
                                                onChange={(e) => setStrictMode(e.target.checked)}
                                            />
                                            <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${strictMode ? 'bg-white border-white text-black' : 'border-white/10 group-hover:border-white/50'}`}>
                                                {strictMode && <div className="w-2 h-2 bg-black rounded-[1px]" />}
                                            </div>
                                            <div className="flex items-center">
                                                Strict Playlist Mode
                                                <InfoTooltip text="Strict mode stops the downloader from recursively finding videos in a playlist. It will only download the videos explicitly linked." />
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 text-sm text-zinc-400 cursor-pointer hover:text-white transition group select-none">
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={splitChapters}
                                                onChange={(e) => setSplitChapters(e.target.checked)}
                                            />
                                            <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${splitChapters ? 'bg-white border-white text-black' : 'border-white/10 group-hover:border-white/50'}`}>
                                                {splitChapters && <div className="w-2 h-2 bg-black rounded-[1px]" />}
                                            </div>
                                            <div className="flex items-center">
                                                Split by chapters
                                                <InfoTooltip text="Splits the video into multiple files based on the chapters defined in the video." />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Downloading Section */}
                    {Object.keys(activeDownloads).length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] border-b border-white/10 pb-2">Processing Queue</h2>
                            <div className="space-y-3">
                                {Object.values(activeDownloads).map((d: any) => (
                                    <div key={d.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden group">
                                        <div className="absolute bottom-0 left-0 h-0.5 bg-white/20 w-full md:hidden">
                                            <div className="h-full bg-white transition-all duration-300" style={{ width: d.percent }} />
                                        </div>

                                        <div className="flex-1 min-w-0 z-10">
                                            <div className="text-sm font-medium truncate text-white mb-2">{d.filename || "Fetching metadata..."}</div>

                                            <div className="hidden md:block h-1 bg-white/10 rounded-full overflow-hidden w-full max-w-sm">
                                                <div className="h-full bg-white transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: d.percent }} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-6 text-xs font-mono text-zinc-400 z-10">
                                            <span className="bg-black/50 px-2 py-1 rounded border border-white/10">{d.speed}</span>
                                            <span className="bg-black/50 px-2 py-1 rounded border border-white/10">{d.eta}</span>
                                            <span className="text-white font-bold">{d.percent}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Section */}
                    <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-end border-b border-white/10 pb-2">
                            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Library</h2>
                            <button onClick={handleClearAll} className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-white transition">Clear All</button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {completedDownloads.map((file: any) => (
                                <div key={file.filename} className="bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20 p-4 rounded-xl flex items-center justify-between transition group">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-green-400 shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-all"></div>
                                        <div className="flex flex-col min-w-0">
                                            <a
                                                href={api.getDownloadUrl(file.filename)}
                                                className="text-sm text-zinc-200 hover:text-white truncate font-medium transition"
                                            >
                                                {file.filename}
                                            </a>
                                            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 md:gap-4 md:opacity-0 md:group-hover:opacity-100 transition-all ml-4">
                                        <a href={api.getDownloadUrl(file.filename)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition">
                                            <Download size={16} />
                                        </a>
                                        <button onClick={() => handleDelete(file.filename)} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {completedDownloads.length === 0 && (
                                <div className="text-zinc-600/50 text-center py-12 text-sm tracking-widest uppercase">Void Empty</div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </PullToRefresh>
    );
}
