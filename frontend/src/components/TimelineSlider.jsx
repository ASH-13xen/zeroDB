import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, ShieldAlert, History } from "lucide-react";

export default function TimelineSlider({
  snapshots = [],
  currentSnapshotIndex = -1,
  onRestore,
  onCommitRevert,
  onFinalizeBaseline,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const autoplayTimer = useRef(null);

  // Stop playing if we reach the end
  useEffect(() => {
    if (isPlaying && currentSnapshotIndex >= snapshots.length - 1) {
      setIsPlaying(false);
    }
  }, [currentSnapshotIndex, snapshots.length, isPlaying]);

  // Handle Autoplay Interval
  useEffect(() => {
    if (isPlaying) {
      autoplayTimer.current = setInterval(() => {
        if (currentSnapshotIndex < snapshots.length - 1) {
          onRestore(currentSnapshotIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1200); // Step every 1.2s
    } else {
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
      }
    }

    return () => {
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
      }
    };
  }, [isPlaying, currentSnapshotIndex, snapshots.length, onRestore]);

  if (snapshots.length <= 1) {
    return (
      <div className="bg-zinc-900/60 border-t border-zinc-800/80 px-6 py-4 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <History size={14} className="text-zinc-600" />
          <span>Time Travel inactive. Execute an <code className="text-blue-400 font-mono">INSERT</code>, <code className="text-blue-400 font-mono">UPDATE</code>, or <code className="text-blue-400 font-mono">DELETE</code> query to create restore points.</span>
        </div>
      </div>
    );
  }

  const activeSnapshot = snapshots[currentSnapshotIndex] || {};

  const handleSliderChange = (e) => {
    setIsPlaying(false);
    const index = parseInt(e.target.value, 10);
    onRestore(index);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    if (currentSnapshotIndex > 0) {
      onRestore(currentSnapshotIndex - 1);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentSnapshotIndex < snapshots.length - 1) {
      onRestore(currentSnapshotIndex + 1);
    }
  };

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 px-6 py-3.5 flex flex-col md:flex-row items-center gap-4 shrink-0 transition-all select-none">
      {/* 1. Control Buttons */}
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleStepBack}
          disabled={currentSnapshotIndex <= 0}
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:border-zinc-800 transition-all active:scale-95"
          title="Step Back"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={currentSnapshotIndex >= snapshots.length - 1}
          className={`p-2 rounded-lg border transition-all active:scale-95 ${
            isPlaying
              ? "bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600/30"
              : "bg-blue-600 border-blue-500 text-white hover:bg-blue-500 disabled:bg-zinc-950 disabled:border-zinc-800 disabled:text-zinc-600"
          }`}
          title={isPlaying ? "Pause Timeline" : "Play Timeline Timelapse"}
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>

        <button
          onClick={handleStepForward}
          disabled={currentSnapshotIndex >= snapshots.length - 1}
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:border-zinc-800 transition-all active:scale-95"
          title="Step Forward"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 2. Slider Track */}
      <div className="flex-1 w-full flex items-center gap-3">
        <span className="text-[10px] font-bold text-zinc-500 tracking-wider">START</span>
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min="0"
            max={snapshots.length - 1}
            value={currentSnapshotIndex}
            onChange={handleSliderChange}
            className="w-full h-1.5 rounded-lg bg-zinc-800 appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-0"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(currentSnapshotIndex / (snapshots.length - 1)) * 100}%, #27272a ${(currentSnapshotIndex / (snapshots.length - 1)) * 100}%, #27272a 100%)`
            }}
          />
          {/* Tic markers */}
          <div className="absolute left-0 right-0 -bottom-1 flex justify-between pointer-events-none px-[2px]">
            {snapshots.map((snap, i) => (
              <div
                key={snap.id}
                className={`w-1 h-1 rounded-full ${
                  i <= currentSnapshotIndex ? "bg-blue-500 shadow-glow" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </div>
        <span className="text-[10px] font-bold text-zinc-500 tracking-wider">LIVE ({snapshots.length - 1})</span>
      </div>

      {/* 3. Snapshot Metadata Label & Revert Action */}
      <div className="w-full md:w-auto flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-2 min-w-[280px] shrink-0">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="p-1 rounded bg-zinc-900 border border-zinc-800 shrink-0">
            <History size={14} className="text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-none">
              Timeline State ({currentSnapshotIndex + 1}/{snapshots.length})
            </p>
            <p className="text-xs font-mono text-zinc-300 truncate mt-1" title={activeSnapshot.query}>
              {activeSnapshot.query}
            </p>
          </div>
        </div>

        {/* Actions Flex */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Revert Here Button */}
          {currentSnapshotIndex < snapshots.length - 1 && (
            <button
              onClick={() => onCommitRevert(currentSnapshotIndex)}
              className="px-2.5 py-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 text-[10px] font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 shrink-0"
              title="Permanently discard future history and set this as the active database state"
            >
              Revert Here
            </button>
          )}

          {/* Finalize Baseline Button */}
          {snapshots.length > 1 && (
            <button
              onClick={onFinalizeBaseline}
              className="px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-[10px] font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 shrink-0"
              title="Compact timeline: squash all history snapshots, freeing up Web-Worker memory heap and locking this current state as the baseline"
            >
              Finalize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
