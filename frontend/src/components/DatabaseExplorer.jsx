import React, { useState } from "react";
import { useDatabaseContext } from "../context/DatabaseContext";

export default function DatabaseExplorer({
  schema = [],
  onTableClick,
  databases = [],
  activeDb,
  onSwitchDb,
  onDeleteDb,
}) {
  const { exportAndShareDatabase, importSharedDatabase, executionMode } = useDatabaseContext();

  const [newDbName, setNewDbName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareMode, setShareMode] = useState("private");
  const [shareLink, setShareLink] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  
  // NEW: Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importInputValue, setImportInputValue] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  
  // NEW: State to track which tables are expanded (showing columns)
  const [expandedTables, setExpandedTables] = useState({});

  // NEW: Function to toggle a table's expanded state
  const toggleTable = (tableName) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  // Handle creating a new database
  const handleCreateDb = (e) => {
    e.preventDefault();
    if (newDbName.trim()) {
      onSwitchDb(newDbName.trim());
      setNewDbName("");
      setIsCreating(false);
    }
  };

  // Handle deleting the current database
  const handleDelete = () => {
    if (!activeDb) return;
    if (
      window.confirm(
        `Are you sure you want to permanently delete '${activeDb}'? This cannot be undone.`,
      )
    ) {
      onDeleteDb(activeDb);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      setShareLink("");
      const result = await exportAndShareDatabase(shareMode);
      // Assuming your site is running on current origin
      setShareLink(window.location.origin + "/workspace?importDb=" + result.shareId);
    } catch (err) {
      console.error(err);
      // We can also add shareStatus if we wanted, but the user specifically asked for import error handling
    } finally {
      setIsSharing(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importInputValue.trim()) return;
    setImportStatus(null);
    
    // Extract ID if they pasted a full URL
    let shareId = importInputValue.trim();
    try {
      if (shareId.startsWith("http")) {
        const url = new URL(shareId);
        shareId = url.searchParams.get("importDb") || shareId;
      }
    } catch {
      // Not a valid URL, assume it's just the ID
    }

    try {
      setIsImporting(true);
      await importSharedDatabase(shareId);
      setImportStatus({ type: "success", message: "Database imported successfully!" });
      setTimeout(() => {
        setImportModalOpen(false);
        setImportInputValue("");
        setImportStatus(null);
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setImportStatus({ type: "error", message: errorMsg });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col w-full text-sm">
      {/* 1. Database Selector Area */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
          Active Database
        </h2>

        <div className="flex gap-2 mb-2">
          <select
            value={activeDb || ""}
            onChange={(e) => onSwitchDb(e.target.value)}
            className="flex-1 w-full bg-zinc-950 border border-zinc-700 text-zinc-300 rounded p-1.5 text-sm outline-none focus:border-blue-500 transition-colors"
          >
            {databases.map((db) => (
              <option key={db} value={db}>
                {db}
              </option>
            ))}
          </select>
          
          {executionMode === "draft" && (
            <>
              <button
                onClick={() => setShareModalOpen(true)}
                title="Share Database"
                className="px-2.5 flex items-center justify-center border border-indigo-900/50 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40 rounded transition-colors"
              >
                🔗
              </button>
              
              <button
                onClick={() => setImportModalOpen(true)}
                title="Import Database from Link"
                className="px-2.5 flex items-center justify-center border border-emerald-900/50 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 rounded transition-colors"
              >
                📥
              </button>
            </>
          )}

          <button
            onClick={handleDelete}
            title="Delete Database"
            className="px-2.5 flex items-center justify-center border border-rose-900/50 bg-rose-900/20 text-rose-500 hover:bg-rose-900/40 rounded transition-colors"
          >
            🗑️
          </button>
        </div>

        {isCreating ? (
          <form onSubmit={handleCreateDb} className="flex gap-2 mt-2">
            <input
              autoFocus
              type="text"
              placeholder="db_name"
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-500 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-zinc-500 hover:text-zinc-300 px-1 text-xs transition-colors"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2 transition-colors"
          >
            <span>+ New Database</span>
          </button>
        )}
      </div>

      {/* 2. Schema Explorer Area */}
      <div className="p-4 overflow-y-auto flex-1">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
          Tables
        </h2>

        {!schema || schema.length === 0 ? (
          <p className="text-zinc-600 italic text-xs">
            No tables in {activeDb}.
          </p>
        ) : (
          <ul className="space-y-3">
            {schema.map((table) => (
              <li key={table.tableName} className="flex flex-col">
                <div className="flex items-center w-full">
                  {/* The new Expand/Collapse Arrow Button */}
                  <button
                    onClick={() => toggleTable(table.tableName)}
                    className="w-5 flex justify-center text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors mr-1"
                  >
                    {expandedTables[table.tableName] ? "▼" : "▶"}
                  </button>

                  {/* The original table click button (still injects the SELECT query) */}
                  <button
                    onClick={() => onTableClick(table.tableName)}
                    className="flex items-center text-blue-400 hover:text-blue-300 font-semibold transition-colors text-left flex-1"
                  >
                    <span className="mr-1.5">🗄️</span> {table.tableName}
                  </button>
                </div>

                {/* Only render the columns if this specific table is expanded */}
                {expandedTables[table.tableName] && (
                  <ul className="pl-6 space-y-1 border-l border-zinc-800 ml-2.5 mt-1.5 mb-1">
                    {table.columns.map((col) => (
                      <li
                        key={col.name}
                        className="flex justify-between text-zinc-400 text-xs"
                      >
                        <span>{col.name}</span>
                        <span className="text-zinc-600 font-mono">
                          {col.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-6 w-full max-w-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Share Database</h3>
              <button onClick={() => { setShareModalOpen(false); setShareLink(""); }} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            
            <p className="text-xs text-zinc-400 mb-4">Generate a link to share a snapshot of <strong>{activeDb}</strong> with another device.</p>
            
            <div className="mb-4 space-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="radio" value="private" checked={shareMode === "private"} onChange={(e)=>setShareMode(e.target.value)} />
                Private (Only you can open)
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="radio" value="public" checked={shareMode === "public"} onChange={(e)=>setShareMode(e.target.value)} />
                Public (Anyone with link)
              </label>
            </div>

            {shareLink ? (
              <div className="mb-4">
                <label className="text-xs text-emerald-400 font-bold mb-1 block">Link Generated (Valid for 24h)</label>
                <input type="text" readOnly value={shareLink} className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 rounded px-3 py-2 text-xs outline-none" onClick={(e) => e.target.select()} />
              </div>
            ) : null}

            <button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded transition-colors disabled:opacity-50"
            >
              {isSharing ? "Generating..." : "Generate Share Link"}
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-6 w-full max-w-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Import Database</h3>
              <button onClick={() => { setImportModalOpen(false); setImportInputValue(""); setImportStatus(null); }} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            
            <p className="text-xs text-zinc-400 mb-4">Paste a ZeroDB share link or Share ID to import it into your local workspace. <br/><br/><span className="text-amber-500">Warning: If a database with the imported name already exists, it will be overwritten.</span></p>
            
            <div className="mb-4">
              <input 
                autoFocus
                type="text" 
                placeholder="https://... or Share ID"
                value={importInputValue} 
                onChange={(e) => setImportInputValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 rounded px-3 py-2 text-xs outline-none focus:border-emerald-500" 
              />
            </div>

            {importStatus && (
              <div className={`mb-4 p-2 rounded text-xs font-semibold flex items-center gap-2 ${
                importStatus.type === 'error' ? 'bg-rose-900/20 text-rose-400 border border-rose-900/50' : 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/50'
              }`}>
                {importStatus.type === 'error' ? '❌' : '✅'} {importStatus.message}
              </div>
            )}

            <button
              onClick={handleImportSubmit}
              disabled={isImporting || !importInputValue.trim()}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded transition-colors disabled:opacity-50"
            >
              {isImporting ? "Importing..." : "Import Database"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
