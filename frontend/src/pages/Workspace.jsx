import React, { useState, useEffect, useRef } from "react";
/* eslint-disable react-hooks/set-state-in-effect */
import { useDatabase } from "../hooks/useDatabase";
import SqlEditor from "../components/SqlEditor";
import { Play, Loader2, AlertCircle, CloudCheck } from "lucide-react";
import ResultsTable from "../components/ResultsTable";
import ChartVisualizer from "../components/ChartVisualizer";
import api from "../services/api";
import DatabaseExplorer from "../components/DatabaseExplorer";

const Workspace = () => {
  // 1. Consume Shared Database & Editor State from Context
  const {
    isReady,
    isExecuting,
    results,
    error,
    executeSql,
    query,
    setQuery,
    schema,
    databases,
    activeDb,
    switchDb,
    deleteDb,
  } = useDatabase();

  // 2. State to hold the SQL code in the editor
  // Removed local query state as it's now managed by useDatabase context
  const [saveStatus, setSaveStatus] = useState("Synced"); // 'Synced', 'Saving', or 'Error'
  const [viewMode, setViewMode] = useState("table");

  // Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [editorHeight, setEditorHeight] = useState(50);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  const rightPanelRef = useRef(null);

  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e) => {
      const newWidth = Math.max(200, Math.min(e.clientX, 800));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizingSidebar(false);
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    if (!isResizingEditor) return;
    const handleMouseMove = (e) => {
      if (!rightPanelRef.current) return;
      const rect = rightPanelRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentage = (relativeY / rect.height) * 100;
      const newHeight = Math.max(20, Math.min(percentage, 80));
      setEditorHeight(newHeight);
    };
    const handleMouseUp = () => setIsResizingEditor(false);
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingEditor]);

  // 3. PHASE 4: Load saved workspace from MongoDB on mount
  // 2. Load saved workspace from cloud on mount
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const res = await api.get("/auth/workspace");
        if (res.data.success && res.data.query) {
          setQuery(res.data.query);
        } else {
          setQuery(
            '-- Welcome to zeroDB Edge Mode\nCREATE TABLE test (id INTEGER, name TEXT);\nINSERT INTO test VALUES (1, "Alice"), (2, "Bob");\nSELECT * FROM test;',
          );
        }
      } catch (err) {
        console.error("Failed to load workspace from cloud", err);
        setQuery(
          '-- Welcome to zeroDB Edge Mode\nSELECT "Error loading cloud data" as status;',
        );
      }
    };
    loadWorkspace();
  }, [setQuery]);

  // 3. Debounced Auto-Save Logic
  useEffect(() => {
    if (!query) return;

    setSaveStatus("Saving");

    const timer = setTimeout(async () => {
      try {
        await api.put("/auth/workspace/save", { query });
        setSaveStatus("Synced");
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveStatus("Error");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [query]);

  // 4. Handlers
  const handleRunQuery = () => {
    if (query.trim()) {
      executeSql(query);
    }
  };

  const handleTableClick = (tableName) => {
    setQuery(`SELECT * FROM ${tableName} LIMIT 10;`);
  };

  return (
    <div className={`flex h-full bg-zinc-950 text-zinc-300 overflow-hidden ${isResizingSidebar || isResizingEditor ? "select-none" : ""}`}>
      {/* LEFT SIDEBAR: Database Explorer */}
      <div 
        className="bg-zinc-900 border-r border-zinc-800 overflow-y-auto flex flex-col flex-shrink-0"
        style={{ width: `${sidebarWidth}px` }}
      >
        <DatabaseExplorer
          schema={schema}
          databases={databases || []}
          activeDb={activeDb || "test"}
          onSwitchDb={switchDb}
          onTableClick={handleTableClick}
          onDeleteDb={deleteDb}
        />
      </div>

      {/* Vertical Resizer */}
      <div
        className="w-2 cursor-col-resize flex-shrink-0 z-10 flex justify-center group"
        onMouseDown={() => setIsResizingSidebar(true)}
      >
        <div className="w-0.5 h-full bg-zinc-800 group-hover:bg-blue-500 transition-colors" />
      </div>

      {/* RIGHT MAIN AREA: Editor & Results */}
      <div ref={rightPanelRef} className="flex-1 flex flex-col overflow-hidden">
        {/* Top Half: Editor & Controls */}
        <div 
          className="flex flex-col space-y-2 p-4 pb-2"
          style={{ flexBasis: `${editorHeight}%`, height: `${editorHeight}%`, flexShrink: 0 }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold flex items-center space-x-2">
                <span className="text-zinc-100 font-bold tracking-tight">
                  SQL Editor
                </span>
                {!isReady ? (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 font-bold uppercase">
                    Engine Booting
                  </span>
                ) : (
                  <span className="text-[10px] bg-green-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">
                    Engine Ready
                  </span>
                )}
              </h2>

              <div className="flex items-center space-x-1.5 text-xs text-zinc-500 border-l border-zinc-800 pl-4">
                {saveStatus === "Saving" ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-blue-400" />
                    <span>Saving...</span>
                  </>
                ) : saveStatus === "Synced" ? (
                  <>
                    <CloudCheck size={14} className="text-emerald-500" />
                    <span>Cloud Synced</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-rose-500" />
                    <span>Offline</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleRunQuery}
              disabled={!isReady || isExecuting}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-xl shadow-blue-950/20 text-white"
            >
              {isExecuting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              <span>Run Query</span>
            </button>
          </div>

          <div className="flex-1 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50 shadow-inner group transition-colors hover:border-zinc-700">
            <SqlEditor value={query} onChange={setQuery} />
          </div>
        </div>

        {/* Horizontal Resizer */}
        <div
          className="h-2 cursor-row-resize flex-shrink-0 z-10 flex flex-col justify-center group"
          onMouseDown={() => setIsResizingEditor(true)}
        >
          <div className="w-full h-0.5 bg-zinc-800 group-hover:bg-blue-500 transition-colors" />
        </div>

        {/* Bottom Half: Results Panel */}
        <div className="flex-1 flex flex-col space-y-2 p-4 pt-2 overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              Results
              {results && (
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full font-bold">
                  {results.values.length} rows
                </span>
              )}
            </h2>

            {/* View Mode Toggles */}
            {results && !error && (
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 space-x-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    viewMode === "table"
                      ? "bg-zinc-700 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode("chart")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    viewMode === "chart"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Chart
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden relative">
            {error ? (
              <div className="h-full border border-rose-900/30 rounded-xl bg-rose-950/10 p-6 text-rose-400 flex items-start space-x-3">
                <AlertCircle size={20} className="shrink-0 text-rose-500" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">Execution Error</p>
                  <p className="font-mono text-xs opacity-80 leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            ) : results ? (
              <div className="h-full flex flex-col space-y-2">
                <p className="text-emerald-400 text-sm font-medium px-1">
                  Query executed successfully. Returned {results.values.length}{" "}
                  rows.
                </p>
                <div className="flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
                  {viewMode === "table" ? (
                    <ResultsTable results={results} />
                  ) : (
                    <ChartVisualizer results={results} />
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-zinc-800/50 rounded-xl bg-zinc-900/20 flex flex-col items-center justify-center space-y-2">
                <p className="text-zinc-500 text-sm font-medium">
                  Ready for execution
                </p>
                <p className="text-zinc-600 text-xs">
                  Run a query, click a table, or upload a CSV to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;

