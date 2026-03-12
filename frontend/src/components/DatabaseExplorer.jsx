import React, { useState } from "react";

export default function DatabaseExplorer({
  schema = [],
  onTableClick,
  databases = [],
  activeDb,
  onSwitchDb,
  onDeleteDb,
}) {
  const [newDbName, setNewDbName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
    </div>
  );
}
