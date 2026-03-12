import React, { useState } from "react";
import { Sparkles, Loader2, Database } from "lucide-react";

export default function AiMockDataButton({ currentSchema, onExecuteSql }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGenerate = async () => {
        if (!currentSchema || currentSchema.trim() === "") {
            setError("Please define a table schema in the editor first.");
            setTimeout(() => setError(""), 3000);
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            // Provide a complete path in a real app, assuming vite proxy or full URL
            const response = await fetch("http://localhost:5000/api/ai/mock-data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ schema: currentSchema })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate mock data");
            }

            if (data.sql && onExecuteSql) {
                // Pass the raw SQL string (expected to be ~20 INSERT statements) to the engine
                await onExecuteSql(data.sql);

                // Auto-run SELECT * to show the results immediately
                const tableMatch = currentSchema.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
                if (tableMatch && tableMatch[1]) {
                    const tableName = tableMatch[1];
                    // Small delay to ensure the insert is processed if the worker is busy
                    setTimeout(() => {
                        onExecuteSql(`SELECT * FROM ${tableName} LIMIT 100;`);
                    }, 100);
                }
            } else {
                 throw new Error("No SQL data returned from AI");
            }

        } catch (err) {
            console.error("AI Generation Error:", err);
            setError(err.message);
            setTimeout(() => setError(""), 4000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`
                    w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all
                    ${isLoading 
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 cursor-not-allowed" 
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-indigo-500/25"}
                `}
            >
                {isLoading ? (
                    <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span>Generating...</span>
                    </>
                ) : (
                    <>
                         <Sparkles className="w-4 h-4" />
                         <span>Generate Mock Data</span>
                    </>
                )}
            </button>
            {error && (
                <div className="text-xs text-rose-400 text-center flex items-center justify-center gap-1.5 mt-1 bg-zinc-900/50 p-1.5 rounded">
                     <Database className="w-3 h-3" />
                     {error}
                </div>
            )}
        </div>
    );
}
