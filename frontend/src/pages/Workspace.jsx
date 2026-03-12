import React, { useState } from "react";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect } from "react";
import { useDatabase } from "../hooks/useDatabase";
import SqlEditor from "../components/SqlEditor";
import {
  Play,
  Loader2,
  AlertCircle,
  CloudCheck,
  CloudUpload,
} from "lucide-react";
import ResultsTable from "../components/ResultsTable";
import CsvUploader from "../components/CsvUploader";
import AiMockDataButton from "../components/AiMockDataButton";
import api from "../services/api"; // Ensure this points to your axios instance

const Workspace = () => {
  // 1. Friend's WebAssembly Database Hook (Our contract is fulfilled!)
  const { isReady, isExecuting, results, error, executeSql } = useDatabase();

  // 2. Friend's Editor State

  // 3. Our Phase 2 Temporary Schema State
  const [dummySchema, setDummySchema] = useState(
    "CREATE TABLE Users (id INTEGER, name VARCHAR, email VARCHAR);",
  );

  // 4. Friend's Run Query Handler
  // 2. State to hold the SQL code in the editor
  const [query, setQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState("Synced"); // 'Synced', 'Saving', or 'Error'

  // 3. PHASE 4: Load saved workspace from MongoDB on mount
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const res = await api.get("/auth/workspace"); // Adjust endpoint if needed
        if (res.data.success && res.data.query) {
          setQuery(res.data.query);
        } else {
          // Default starter code if no saved query exists
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
  }, []);

  // 4. PHASE 4: Debounced Auto-Save Logic
  useEffect(() => {
    // Don't auto-save empty queries or the initial load
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
    }, 1500); // 1.5 second debounce delay

    return () => clearTimeout(timer);
  }, [query]);

  // 5. Handle the Run button click
  const handleRunQuery = () => {
    if (query.trim()) {
      executeSql(query);
    }
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-300 overflow-hidden">
      {/* LEFT SIDEBAR: Our Phase 2 & 3 Components */}
      <div className="w-72 border-r border-zinc-800 bg-zinc-900 p-4 overflow-y-auto flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
            Ingestion
          </h2>
          {/* Passing the real executeSql from useDatabase! */}
          <CsvUploader onExecuteSql={executeSql} />
        </div>

        <div>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
            AI Data
          </h2>
          <div className="p-4 border border-zinc-700/50 bg-zinc-900/50 rounded-xl mb-2">
            <label className="text-xs text-zinc-400 mb-1 block">
              Current Schema (Test)
            </label>
            <textarea
              value={dummySchema}
              onChange={(e) => setDummySchema(e.target.value)}
              className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-emerald-400 mb-3"
            />
            {/* Passing the real executeSql from useDatabase! */}
            <AiMockDataButton
              currentSchema={dummySchema}
              onExecuteSql={executeSql}
            />
          </div>
        </div>
      </div>

      {/* RIGHT MAIN AREA: Friend's Phase 1 Components */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Top Half: Editor & Controls */}
        <div className="h-1/2 flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold flex items-center space-x-2">
                <span>SQL Editor</span>
                {!isReady ? (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 uppercase">
                    Engine Booting...
                  </span>
                ) : (
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 uppercase">
                    Engine Ready
                  </span>
                )}
              </h2>

              {/* Cloud Sync Status Indicator */}
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 border-l border-gray-800 pl-4">
                {saveStatus === "Saving" ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />{" "}
                    <span>Saving to Cloud...</span>
                  </>
                ) : saveStatus === "Synced" ? (
                  <>
                    <CloudCheck size={14} className="text-emerald-500" />{" "}
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-red-500" />{" "}
                    <span>Sync Error</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleRunQuery}
              disabled={!isReady || isExecuting}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-4 py-2 rounded-md font-medium transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              {isExecuting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              <span>Run Query</span>
            </button>
          </div>

          <SqlEditor value={query} onChange={setQuery} />
        </div>

        {/* Bottom Half: Results Panel */}
        <div className="h-1/2 flex flex-col space-y-2">
          <h2 className="text-lg font-semibold text-zinc-100">Results</h2>

          <div className="flex-1 overflow-hidden">
            {error ? (
              <div className="h-full border border-rose-900/50 rounded-lg bg-rose-900/10 p-4 text-rose-400 flex items-start space-x-2">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p className="font-mono text-sm">{error}</p>
              </div>
            ) : results ? (
              <div className="h-full flex flex-col space-y-2">
                <p className="text-emerald-400 text-sm font-medium">
                  Query executed successfully. Returned {results.values.length}{" "}
                  rows.
                </p>
                <p className="text-green-400 text-xs font-medium uppercase tracking-tight">
                  Success: Returned {results.values.length} rows.
                </p>
                <div className="flex-1 overflow-hidden rounded-lg border border-gray-800">
                  <ResultsTable results={results} />
                </div>
              </div>
            ) : (
              <div className="h-full border border-zinc-700 rounded-lg bg-zinc-900 flex items-center justify-center">
                <p className="text-zinc-500 italic">
                  Hit "Run Query", drag a CSV, or click "Generate Mock Data"...
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
