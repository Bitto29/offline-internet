/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Battery, 
  BatteryLow, 
  BatteryMedium, 
  BatteryFull, 
  Zap, 
  Wifi, 
  WifiOff, 
  Search, 
  History, 
  Trash2, 
  ExternalLink,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface CachedContent {
  id: string;
  query: string;
  content: string;
  timestamp: number;
  sources?: { uri: string; title: string }[];
}

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [query, setQuery] = useState('');
  const [isCharging, setIsCharging] = useState(false);
  const [cache, setCache] = useState<CachedContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<CachedContent | null>(null);
  const [batteryLevel, setBatteryLevel] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Load cache on mount
  useEffect(() => {
    const saved = localStorage.getItem('web_battery_cache');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCache(parsed);
      updateBatteryLevel(parsed.length);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save cache when it changes
  useEffect(() => {
    localStorage.setItem('web_battery_cache', JSON.stringify(cache));
    updateBatteryLevel(cache.length);
  }, [cache]);

  const updateBatteryLevel = (count: number) => {
    // Max 10 items for 100% battery for demo purposes
    const level = Math.min((count / 10) * 100, 100);
    setBatteryLevel(level);
  };

  const chargeBattery = async () => {
    if (!query.trim() || !isOnline) return;

    setIsCharging(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Research and provide a comprehensive summary of: ${query}. Focus on providing enough detail so that someone reading this offline would have a good understanding of the topic.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "No content generated.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = chunks?.map(c => ({
        uri: c.web?.uri || '',
        title: c.web?.title || 'Source'
      })).filter(s => s.uri) || [];

      const newContent: CachedContent = {
        id: crypto.randomUUID(),
        query,
        content: text,
        timestamp: Date.now(),
        sources
      };

      setCache(prev => [newContent, ...prev]);
      setQuery('');
      setSelectedContent(newContent);
    } catch (error) {
      console.error("Charging failed:", error);
      alert("Failed to charge battery. Check your connection or API key.");
    } finally {
      setIsCharging(false);
    }
  };

  const clearBattery = () => {
    if (confirm("Are you sure you want to discharge all stored internet power?")) {
      setCache([]);
      setSelectedContent(null);
    }
  };

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCache(prev => prev.filter(item => item.id !== id));
    if (selectedContent?.id === id) setSelectedContent(null);
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] text-[#151619] font-sans selection:bg-[#F27D26] selection:text-white">
      {/* Top Status Bar */}
      <div className="bg-[#151619] text-white px-6 py-3 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#F27D26] animate-pulse" />
          <span className="text-[10px] font-mono tracking-[2px] uppercase opacity-70">WebBattery System v1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={14} className="text-emerald-400" />
            ) : (
              <WifiOff size={14} className="text-red-400" />
            )}
            <span className="text-[10px] font-mono uppercase tracking-wider">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="h-4 w-[1px] bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">{Math.round(batteryLevel)}% Capacity</span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Battery */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Main Hardware Widget */}
          <div className="bg-[#151619] rounded-2xl p-6 shadow-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap size={80} />
            </div>

            <div className="relative z-10 space-y-8">
              <header>
                <h1 className="text-white text-2xl font-bold tracking-tight">Internet Battery</h1>
                <p className="text-white/50 text-xs mt-1 font-mono uppercase tracking-wider">Storage & Retrieval Unit</p>
              </header>

              {/* Battery Visualizer */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-24 h-48 border-4 border-white/20 rounded-xl p-1">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/20 rounded-t-md" />
                  <div className="w-full h-full bg-white/5 rounded-lg overflow-hidden flex flex-col justify-end">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${batteryLevel}%` }}
                      className={cn(
                        "w-full transition-colors duration-500",
                        batteryLevel > 70 ? "bg-emerald-500" : 
                        batteryLevel > 30 ? "bg-[#F27D26]" : "bg-red-500"
                      )}
                    />
                  </div>
                  {/* Battery Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-full h-[1px] bg-white" />
                    ))}
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-white font-mono text-3xl font-bold">{Math.round(batteryLevel)}%</span>
                  <p className="text-white/40 text-[10px] uppercase tracking-[2px] mt-1">Charge Level</p>
                </div>
              </div>

              {/* Input Area */}
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && chargeBattery()}
                    placeholder="Enter topic to charge..."
                    disabled={!isOnline || isCharging}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/50 disabled:opacity-50 transition-all"
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                </div>

                <button
                  onClick={chargeBattery}
                  disabled={!isOnline || isCharging || !query.trim()}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all",
                    isOnline && !isCharging && query.trim() 
                      ? "bg-[#F27D26] text-white hover:bg-[#ff8c3a] shadow-lg shadow-[#F27D26]/20" 
                      : "bg-white/5 text-white/20 cursor-not-allowed"
                  )}
                >
                  {isCharging ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Charging...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Start Charging
                    </>
                  )}
                </button>

                {!isOnline && (
                  <div className="flex items-center gap-2 text-red-400/80 text-[10px] font-mono uppercase justify-center">
                    <Info size={12} />
                    System Offline: Charging Unavailable
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Storage List */}
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-black/5 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#151619]/40" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Stored Power</h2>
              </div>
              <button 
                onClick={clearBattery}
                className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                title="Clear all"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {cache.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30">
                  <BatteryLow size={40} className="mb-2" />
                  <p className="text-xs font-medium">Battery Empty</p>
                  <p className="text-[10px]">Charge some internet to see it here</p>
                </div>
              ) : (
                cache.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedContent(item)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all group relative",
                      selectedContent?.id === item.id 
                        ? "bg-[#151619] border-[#151619] text-white shadow-md" 
                        : "bg-white border-black/5 hover:border-black/20 text-[#151619]"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.query}</p>
                        <p className={cn(
                          "text-[10px] mt-1 font-mono opacity-50",
                          selectedContent?.id === item.id ? "text-white/60" : "text-black/40"
                        )}>
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => deleteItem(item.id, e)}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity",
                          selectedContent?.id === item.id ? "hover:bg-white/10 text-white/40" : "hover:bg-black/5 text-black/20"
                        )}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Content Viewer */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-xl border border-black/5 h-full min-h-[600px] flex flex-col overflow-hidden">
            {selectedContent ? (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={selectedContent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col h-full"
                >
                  {/* Content Header */}
                  <div className="p-6 border-b border-black/5 bg-gray-50/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-[#151619]">{selectedContent.query}</h2>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] font-mono uppercase bg-[#151619] text-white px-2 py-1 rounded">Stored Content</span>
                          <span className="text-[10px] font-mono uppercase text-black/40">
                            Captured: {new Date(selectedContent.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-mono font-bold uppercase">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          Available Offline
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 overflow-y-auto p-8 prose prose-sm max-w-none markdown-body">
                    <Markdown>{selectedContent.content}</Markdown>
                    
                    {selectedContent.sources && selectedContent.sources.length > 0 && (
                      <div className="mt-12 pt-8 border-t border-black/5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4 flex items-center gap-2">
                          <ExternalLink size={14} />
                          Original Power Sources
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedContent.sources.map((source, idx) => (
                            <a 
                              key={idx}
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-black/5 hover:border-[#F27D26]/30 hover:bg-white transition-all group"
                            >
                              <span className="text-xs font-medium truncate max-w-[200px]">{source.title}</span>
                              <ChevronRight size={14} className="text-black/20 group-hover:text-[#F27D26] transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-black/10">
                  <Battery size={48} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">No Power Selected</h3>
                  <p className="text-sm text-black/40 max-w-xs mx-auto">
                    Select a stored topic from your battery storage or charge a new one to begin viewing.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
        }
        
        .markdown-body h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; }
        .markdown-body h2 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-body h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .markdown-body p { margin-bottom: 1rem; line-height: 1.6; color: #374151; }
        .markdown-body ul, .markdown-body ol { margin-bottom: 1rem; padding-left: 1.5rem; }
        .markdown-body li { margin-bottom: 0.5rem; }
        .markdown-body strong { font-weight: 700; color: #111827; }
        .markdown-body blockquote { border-left: 4px solid #F27D26; padding-left: 1rem; font-style: italic; color: #4B5563; margin: 1.5rem 0; }
      `}} />
    </div>
  );
}
