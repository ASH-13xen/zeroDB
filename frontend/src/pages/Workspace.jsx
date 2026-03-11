import React, { useState } from "react";
import { useDatabase } from "../hooks/useDatabase";
import SqlEditor from "../components/SqlEditor";
import { Play, Loader2, AlertCircle } from "lucide-react";
import ResultsTable from "../components/ResultsTable";
import CsvUploader from "../components/CsvUploader";
import AiMockDataButton from "../components/AiMockDataButton";

const Workspace = () => {
  // 1. Friend's WebAssembly Database Hook (Our contract is fulfilled!)
  const { isReady, isExecuting, results, error, executeSql } = useDatabase();

  // 2. Friend's Editor State
  const [query, setQuery] = useState(
    '-- Welcome to zeroDB Edge Mode\nCREATE TABLE test (id INTEGER, name TEXT);\nINSERT INTO test VALUES (1, "Alice"), (2, "Bob");\nSELECT * FROM test;'
  );

  // 3. Our Phase 2 Temporary Schema State
  const [dummySchema, setDummySchema] = useState(
    "CREATE TABLE Users (id INTEGER, name VARCHAR, email VARCHAR);"
  );

  // 4. Friend's Run Query Handler
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
            <label className="text-xs text-zinc-400 mb-1 block">Current Schema (Test)</label>
            <textarea
              value={dummySchema}
              onChange={(e) => setDummySchema(e.target.value)}
              className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-emerald-400 mb-3"
            />
            {/* Passing the real executeSql from useDatabase! */}
            <AiMockDataButton currentSchema={dummySchema} onExecuteSql={executeSql} />
          </div>
        </div>
      </div>

      {/* RIGHT MAIN AREA: Friend's Phase 1 Components */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Top Half: Editor & Controls */}
        <div className="h-1/2 flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <span className="text-zinc-100">SQL Editor</span>
              {!isReady && (
                <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
                  Engine Booting...
                </span>
              )}
              {isReady && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                  Engine Ready
                </span>
              )}
            </h2>

            <button
              onClick={handleRunQuery}
              disabled={!isReady || isExecuting}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 px-4 py-2 rounded-md font-medium transition-colors text-white"
            >
              {isExecuting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
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
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            ) : results ? (
              <div className="h-full flex flex-col space-y-2">
                <p className="text-emerald-400 text-sm font-medium">
                  Query executed successfully. Returned {results.values.length} rows.
                </p>
                <div className="flex-1 overflow-hidden">
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
