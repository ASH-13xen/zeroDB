import React, { useState } from "react";
import CsvUploader from "../components/CsvUploader";
import AiMockDataButton from "../components/AiMockDataButton";

const Workspace = () => {
  // Temporary state for Phase 2 test
  const [dummySchema, setDummySchema] = useState("CREATE TABLE Users (id INTEGER, name VARCHAR, email VARCHAR);");

  // This is the placeholder function our friend asked to route to
  const executeSql = async (sqlString) => {
      console.log("🚀 [Friend's Contract] executeSql received raw string:");
      console.log(sqlString);
      alert("Success! Check the developer console to see the raw SQL string passed to executeSql.");
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-300">
      {/* Sidebar */}
      <div className="w-72 border-r border-zinc-800 bg-zinc-900 p-4 overflow-y-auto flex flex-col gap-6">
        <div>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
            Ingestion
            </h2>
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
                <AiMockDataButton currentSchema={dummySchema} onExecuteSql={executeSql} />
           </div>
        </div>
      </div>

      {/* Main Editor & Results Placeholder */}
      <div className="flex-1 flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-4 text-zinc-100">Edge Mode Sandbox</h2>
        <div className="flex-1 border border-zinc-800 rounded-lg flex items-center justify-center bg-zinc-900/30">
          <p className="text-zinc-500">
            Phase 1 Web Worker Editor & Data Grid will be built here by your friend.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
