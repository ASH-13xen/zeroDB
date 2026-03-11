import { useState, useEffect, useCallback, useRef } from "react";

export const useDatabase = () => {
  // State to track the database engine
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // We use a ref to hold the worker so it persists across re-renders
  const workerRef = useRef(null);

  useEffect(() => {
    // 1. Initialize the worker the "Vite Way"
    workerRef.current = new Worker(
      new URL("../workers/sql.worker.js", import.meta.url),
      { type: "module" },
    );

    // 2. Listen for text messages coming BACK from the worker
    workerRef.current.onmessage = (event) => {
      const { type, message, result, error } = event.data;

      switch (type) {
        case "INIT_SUCCESS":
          console.log("✅", message);
          setIsReady(true);
          break;
        case "QUERY_SUCCESS":
          setResults(result); // result contains { columns: [], values: [] }
          setError(null);
          setIsExecuting(false);
          break;
        case "QUERY_ERROR":
          setError(error);
          setResults(null);
          setIsExecuting(false);
          break;
        default:
          console.warn("Unknown message from worker:", event.data);
      }
    };

    // 3. Cleanup: Destroy the worker if the component unmounts
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // 4. The function you will use to SEND queries to the worker
  const executeSql = useCallback(
    (sqlString) => {
      if (!workerRef.current || !isReady) {
        setError("zeroDB Engine is still spinning up...");
        return;
      }

      setIsExecuting(true);
      setError(null);

      // Send the SQL string to the worker
      workerRef.current.postMessage({ action: "EXECUTE", sql: sqlString });
    },
    [isReady],
  );

  // Expose exactly what the UI needs
  return {
    isReady,
    isExecuting,
    results,
    error,
    executeSql,
  };
};
