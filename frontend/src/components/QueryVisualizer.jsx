import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { parseQueryPlan } from '../utils/QueryPlanParser';

export default function QueryVisualizer({ planResults }) {
  const { nodes, edges } = useMemo(() => parseQueryPlan(planResults), [planResults]);

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 italic">
        No execution plan data available.
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10">
        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-bold uppercase tracking-wider">
          Execution Plan
        </span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#27272a" variant="dots" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
