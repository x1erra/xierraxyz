"use client";

import { useState, useEffect } from 'react';
import { api } from './api';
import { Download, Trash2, Settings2 } from 'lucide-react';
import Starfield from '@/components/Starfield';

export default function OurTubeApp() {
    const [url, setUrl] = useState("");
    const [activeDownloads, setActiveDownloads] = useState<any>({});
    const [completedDownloads, setCompletedDownloads] = useState<any[]>([]);
    const [quality, setQuality] = useState("best");
    const [format, setFormat] = useState("any");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [connected, setConnected] = useState(false);

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

        // Connect to WebSocket
        const ws = api.connectWebSocket(
            (event) => {
                const { type, id, data: nestedData, error } = event;
                const downloadId = id || (nestedData && nestedData.id);

                if (type === "progress" && downloadId) {
                    setActiveDownloads((prev: any) => ({
                        ...prev,
                        [downloadId]: {
                            ...(prev[downloadId] || {}),
                            ...event,
                            ...(nestedData || {})
                        },
                    }));
                } else if (type === "finished" && downloadId) {
                    // Update Active State
                    setActiveDownloads((prev: any) => {
                        const next = { ...prev };
                        delete next[downloadId];
                        return next;
                    });

                    // Add to Local Library (Private)
                    // We need to fetch the file details or reconstruct them. 
                    // Since we don't have the full size/etc in the finished event usually, 
                    // we might want to ask the server for just this file, or valid it.
                    // But for now, we'll try to use what we have or do a quick check.
                    // Actually, let's just make a HEAD request or rely on the final progress data?
                    // Simpler: Just Fetch the library update BUT only keep the one we just made?
                    // No, that defeats the purpose.
                    // Let's assume the last progress event had the filename.

                    // Better approach: We can ask the server for metadata of this specific file if needed.
                    // But for privacy, let's just create the entry from the event data if possible.
                    // The event usually contains filename.

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
        try {
            await api.startDownload(url, format, quality);
            setUrl("");
        } catch (e) {
            console.error(e);
            alert("Failed to start download");
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

    return (
        <div className="min-h-[100dvh] relative font-sans text-white selection:bg-white selection:text-black pb-20 overflow-x-hidden">
            <Starfield />

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3 text-white">
                            <span className="text-xl font-black tracking-widest">XIERRA</span>
                            <span className="text-zinc-600 text-xl font-light">|</span>
                            <span className="text-xl font-mono tracking-widest text-zinc-300">OURTUBE</span>
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

            <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-12 bg-black/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 relative z-10 mt-8">
                {/* Input Section */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Paste link..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/40 transition placeholder-zinc-600 shadow-inner"
                        />
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
                                    <label className="flex items-center gap-3 text-sm text-zinc-400 cursor-pointer hover:text-white transition group">
                                        <div className="w-4 h-4 border border-white/10 rounded group-hover:border-white/50"></div>
                                        Strict Playlist Mode
                                    </label>
                                    <label className="flex items-center gap-3 text-sm text-zinc-400 cursor-pointer hover:text-white transition group">
                                        <div className="w-4 h-4 border border-white/10 rounded group-hover:border-white/50"></div>
                                        Split by chapters
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
                        <button className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-white transition">Clear All</button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {completedDownloads.map((file: any) => (
                            <div key={file.filename} className="bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20 p-4 rounded-xl flex items-center justify-between transition group">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-green-400 shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-all"></div>
                                    <div className="flex flex-col min-w-0">
                                        <a
                                            href={`https://api.xierra.xyz/files/${encodeURIComponent(file.filename)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-zinc-200 hover:text-white truncate font-medium transition"
                                        >
                                            {file.filename}
                                        </a>
                                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 md:gap-4 md:opacity-0 md:group-hover:opacity-100 transition-all ml-4">
                                    <a href={`https://api.xierra.xyz/files/${encodeURIComponent(file.filename)}`} download className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition">
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
    );
}
