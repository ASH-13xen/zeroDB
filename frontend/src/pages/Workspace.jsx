import { useState } from "react";
import { useDatabase } from "../hooks/useDatabase";
import SqlEditor from "../components/SqlEditor";
import { Play, Loader2, AlertCircle } from "lucide-react";
import ResultsTable from "../components/ResultsTable";

const Workspace = () => {
  // 1. Initialize our WebAssembly Database Hook
  const { isReady, isExecuting, results, error, executeSql } = useDatabase();

  // 2. State to hold the SQL code in the editor
  const [query, setQuery] = useState(
    '-- Welcome to zeroDB Edge Mode\nCREATE TABLE test (id INTEGER, name TEXT);\nINSERT INTO test VALUES (1, "Alice"), (2, "Bob");\nSELECT * FROM test;',
  );

  // 3. Handle the Run button click
  const handleRunQuery = () => {
    if (query.trim()) {
      executeSql(query);
    }
  };

  return (
    <div className="flex h-full bg-gray-950 text-white">
      {/* Sidebar Placeholder (For Phase 3: CSV Upload) */}
      <div className="w-64 border-r border-gray-800 bg-gray-900 p-4 flex flex-col">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
          Tables
        </h2>
        <div className="flex-1 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-sm text-center p-4">
          Drag & Drop CSV here (Coming Soon)
        </div>
      </div>

      {/* Main IDE Area */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Top Half: Editor & Controls */}
        <div className="h-1/2 flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <span>SQL Editor</span>
              {!isReady && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                  Engine Booting...
                </span>
              )}
              {isReady && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  Engine Ready
                </span>
              )}
            </h2>

            <button
              onClick={handleRunQuery}
              disabled={!isReady || isExecuting}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-md font-medium transition-colors"
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
          <h2 className="text-lg font-semibold">Results</h2>

          <div className="flex-1 overflow-hidden">
            {error ? (
              <div className="h-full border border-red-900/50 rounded-lg bg-red-900/10 p-4 text-red-400 flex items-start space-x-2">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            ) : results ? (
              <div className="h-full flex flex-col space-y-2">
                <p className="text-green-400 text-sm font-medium">
                  Query executed successfully. Returned {results.values.length}{" "}
                  rows.
                </p>
                <div className="flex-1 overflow-hidden">
                  <ResultsTable results={results} />
                </div>
              </div>
            ) : (
              <div className="h-full border border-gray-700 rounded-lg bg-gray-900 flex items-center justify-center">
                <p className="text-gray-600 italic">
                  Hit "Run Query" to see results...
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
