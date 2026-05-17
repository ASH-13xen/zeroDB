import React, { useState, useEffect } from "react";
import { X, Sparkles, Zap, ChevronRight, Activity, Loader2 } from "lucide-react";
import QueryVisualizer from "./QueryVisualizer";
import api from "../services/api";

export default function QueryOptimizationModal({ 
  isOpen, 
  onClose, 
  query, 
  schema, 
  queryPlan, 
  onApplyOptimization 
}) {
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && query) {
      handleGetOptimization();
    }
  }, [isOpen, query]);

  const handleGetOptimization = async () => {
    setLoading(true);
    try {
      const res = await api.post("/ai/optimize-query", { 
        schema: JSON.stringify(schema), 
        query 
      });
      if (res.data.success) {
        setOptimization(res.data);
      }
    } catch (err) {
      console.error("Failed to get optimization", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Query Visualizer & Optimizer</h2>
              <p className="text-xs text-zinc-500">Analyze execution plan and get AI-driven performance tips</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors group"
          >
            <X className="w-5 h-5 text-zinc-500 group-hover:text-white" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Side: Visualizer */}
          <div className="flex-[2] border-r border-zinc-800 p-4 bg-zinc-950/30 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Execution Flow
              </h3>
            </div>
            <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <QueryVisualizer planResults={queryPlan} />
            </div>
            <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Source Query</p>
              <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap truncate">
                {query}
              </pre>
            </div>
          </div>

          {/* Right Side: Optimization */}
          <div className="flex-1 bg-zinc-900/30 p-6 overflow-y-auto space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI Optimization Suggestions
              </h3>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  <p className="text-sm text-zinc-500">Thinking deeply about your performance...</p>
                </div>
              ) : optimization ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Performance Analysis</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed italic">
                      "{optimization.analysis}"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase">Suggested Query</h4>
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                      <div className="relative bg-zinc-950 border border-white/5 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                        {optimization.optimizedSql}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onApplyOptimization(optimization.optimizedSql)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                  >
                    <span>Apply Optimization</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-zinc-600 italic">No optimizations found or error occurred.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
