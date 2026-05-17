import React, { useState, useEffect } from "react";
import { Clock, Database, Trash2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Play } from "lucide-react";
import api from "../services/api";

export default function QueryHistory({ onQueryClick }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/history");
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error("Failed to fetch query history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear your query execution history?")) {
      try {
        await api.delete("/history");
        setHistory([]);
      } catch (err) {
        console.error("Failed to clear query history", err);
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full flex flex-col w-full text-sm">
      {/* Header with Clear Action */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Query History
          </h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Last {history.length} executions
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2 py-1 rounded"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-12">
            <Clock className="text-zinc-700" size={32} />
            <p className="text-zinc-500 text-xs">No query history yet</p>
            <p className="text-zinc-600 text-[10px]">Your executed queries will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-3.5">
            {history.map((item) => {
              const isExpanded = expandedItems[item._id];
              return (
                <li
                  key={item._id}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 transition-colors flex flex-col space-y-2 group relative overflow-hidden"
                >
                  {/* Status, Database, Time */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <div className="flex items-center space-x-1.5">
                      {item.status === "success" ? (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : (
                        <XCircle size={12} className="text-rose-500" />
                      )}
                      <span className="font-mono text-zinc-400 max-w-[120px] truncate" title={item.database}>
                        {item.database}
                      </span>
                    </div>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>

                  {/* Code Snippet */}
                  <div className="relative">
                    <pre
                      onClick={() => onQueryClick(item.query)}
                      className={`text-xs font-mono p-2 bg-zinc-900/60 rounded border border-zinc-800/80 text-zinc-300 overflow-x-auto cursor-pointer hover:bg-zinc-900 hover:border-blue-500/30 transition-all select-all ${
                        isExpanded ? "whitespace-pre-wrap break-all" : "whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
                      }`}
                    >
                      {item.query}
                    </pre>

                    {/* Quick Load Button */}
                    <button
                      onClick={() => onQueryClick(item.query)}
                      className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 bg-blue-600 text-white p-1 rounded hover:bg-blue-500 active:scale-95 transition-all"
                      title="Load query in Editor"
                    >
                      <Play size={10} fill="currentColor" />
                    </button>
                  </div>

                  {/* Metadata and Error Message */}
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-0.5">
                    <div className="flex space-x-2">
                      {item.executionTime > 0 && (
                        <span>⏱ {item.executionTime}ms</span>
                      )}
                    </div>
                    {item.query.length > 25 && (
                      <button
                        onClick={() => toggleExpand(item._id)}
                        className="text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <span>Collapse</span>
                            <ChevronDown size={12} />
                          </>
                        ) : (
                          <>
                            <span>Expand</span>
                            <ChevronRight size={12} />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Error details if failed */}
                  {isExpanded && item.status === "error" && item.errorMessage && (
                    <div className="text-[11px] font-mono text-rose-400 bg-rose-950/15 border border-rose-900/30 rounded p-2 mt-1">
                      {item.errorMessage}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
