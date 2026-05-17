import React, { useState, useEffect } from "react";
import { Server, Settings, Save, Loader2, X } from "lucide-react";
import api from "../services/api";

export default function SettingsModal({ isOpen, onClose, executionMode, setExecutionMode }) {
  const [postgresUri, setPostgresUri] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Fetch existing URI
      api.get("/db/postgres-uri")
        .then(res => setPostgresUri(res.data.uri || ""))
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  const handleSaveUri = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      await api.post("/db/postgres-uri", { uri: postgresUri });
      setMessage("PostgreSQL URI saved successfully.");
    } catch (error) {
      setMessage("Failed to save URI.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Database Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Execution Mode Toggle */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Execution Mode</label>
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setExecutionMode("draft")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  executionMode === "draft" 
                    ? "bg-zinc-700 text-white shadow" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Draft (Local Wasm)
              </button>
              <button
                onClick={() => setExecutionMode("production")}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  executionMode === "production" 
                    ? "bg-blue-600 text-white shadow" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Server size={14} />
                <span>Production (Remote)</span>
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {executionMode === "draft" 
                ? "Fast, edge-based execution using local WebAssembly. Changes persist in your browser."
                : "Execute queries against a remote PostgreSQL database via the backend."}
            </p>
          </div>

          {/* Postgres URI Config */}
          <div className={`space-y-3 transition-opacity ${executionMode === "production" ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
            <label className="block text-sm font-semibold text-zinc-300">PostgreSQL Connection String</label>
            <input
              type="password"
              placeholder="postgresql://user:password@host:port/dbname"
              value={postgresUri}
              onChange={(e) => setPostgresUri(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${message.includes("success") ? "text-emerald-400" : "text-rose-400"}`}>
                {message}
              </span>
              <button
                onClick={handleSaveUri}
                disabled={isSaving || !postgresUri}
                className="flex items-center space-x-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save URI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
