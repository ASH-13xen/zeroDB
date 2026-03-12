import React, { useState } from "react";
import { MessageSquare, Loader2, Database } from "lucide-react";

export default function AiQueryGenerator({ currentSchema, onQueryGenerated }) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGenerate = async () => {
        if (!currentSchema || currentSchema.trim() === "") {
            setError("Please define a table schema in the editor first.");
            setTimeout(() => setError(""), 3000);
            return;
        }

        if (!prompt || prompt.trim() === "") {
            setError("Please enter a question or request.");
            setTimeout(() => setError(""), 3000);
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            // Provide a complete path in a real app, assuming vite proxy or full URL
            const response = await fetch("http://localhost:5000/api/ai/generate-query", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    schema: currentSchema,
                    prompt: prompt
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Surface the detailed Gemini API error if available (e.g. Rate Limits)
                throw new Error(data.details || data.error || "Failed to generate SQL query");
            }

            if (data.query && onQueryGenerated) {
                // Pass the generated SQL string back up so it can be placed in the editor
                onQueryGenerated(data.query);
                setPrompt(""); // Clear the input on success
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
        <div className="flex flex-col gap-2 p-4 border border-zinc-700/50 bg-zinc-900/50 rounded-xl mb-4">
            <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Text to SQL
            </h3>
            <p className="text-xs text-zinc-500 mb-2">Understand the schema above and generate a query.</p>
            
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Find all users who signed up today..."
                className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 mb-2 focus:outline-none focus:border-emerald-500/50 resize-none"
                disabled={isLoading}
            />

            <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className={`
                    w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all
                    ${isLoading || !prompt.trim()
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-not-allowed" 
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-500/25"}
                `}
            >
                {isLoading ? (
                    <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span>Generating...</span>
                    </>
                ) : (
                    <>
                         <MessageSquare className="w-4 h-4" />
                         <span>Generate SQL</span>
                    </>
                )}
            </button>
            {error && (
                <div className="text-xs text-rose-400 text-center flex items-center justify-center gap-1.5 mt-1 bg-zinc-900/50 p-1.5 rounded">
                     <Database className="w-3 h-3 shrink-0" />
                     {error}
                </div>
            )}
        </div>
    );
}
