import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const ResultsTable = ({ results }) => {
  const { columns, values } = results;

  // The scrollable container
  const parentRef = useRef(null);

  // Set up the virtualizer
  const rowVirtualizer = useVirtualizer({
    count: values.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // Estimate each row is 36px tall
    overscan: 5, // Render 5 extra rows above/below for smoother scrolling
  });

  // Dynamically create a CSS Grid based on the number of columns
  // e.g., if there are 3 columns, it creates 3 equal-width columns
  const gridTemplateColumns = `repeat(${columns.length}, minmax(150px, 1fr))`;

  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-auto bg-gray-900 border border-gray-700 rounded-lg text-sm"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 shadow-md">
        <div
          className="grid px-4 py-2 font-semibold text-gray-300"
          style={{ gridTemplateColumns }}
        >
          {columns.map((col, index) => (
            <div
              key={index}
              className="truncate pr-4 uppercase tracking-wider text-xs"
            >
              {col}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Body */}
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowData = values[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 w-full grid px-4 py-2 border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
              style={{
                gridTemplateColumns,
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowData.map((cell, cellIndex) => (
                <div key={cellIndex} className="truncate pr-4 text-gray-400">
                  {/* Convert nulls or booleans to strings so React doesn't crash */}
                  {cell !== null ? (
                    String(cell)
                  ) : (
                    <span className="text-gray-600 italic">null</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultsTable;
