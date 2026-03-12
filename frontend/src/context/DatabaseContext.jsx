/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  // 1. Friend's states
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  // 2. Your new Multi-DB states
  const [schema, setSchema] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [activeDb, setActiveDb] = useState("");

  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/sql.worker.js", import.meta.url),
      { type: "module" },
    );

    workerRef.current.onmessage = (event) => {
      // Destructure everything including your new DB tracking payloads
      const {
        type,
        message,
        result,
        error,
        schema: newSchema,
        databases: dbList,
        activeDb: currentDb,
      } = event.data;

      switch (type) {
        case "INIT_SUCCESS":
          console.log("✅", message);
          setIsReady(true);
          break;
        case "QUERY_SUCCESS":
          setResults(result);
          setError(null);
          setIsExecuting(false);
          break;
        case "QUERY_ERROR":
          setError(error);
          setResults(null);
          setIsExecuting(false);
          break;
        // Your schema listener
        case "SCHEMA_UPDATE":
          setSchema(newSchema);
          if (dbList) setDatabases(dbList);
          if (currentDb) setActiveDb(currentDb);
          break;
        default:
          console.warn("Unknown message from worker:", event.data);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const executeSql = useCallback(
    (sqlString) => {
      if (!workerRef.current || !isReady) {
        setError("zeroDB Engine is still spinning up...");
        return;
      }

      setIsExecuting(true);
      setError(null);
      workerRef.current.postMessage({ action: "EXECUTE", sql: sqlString });
    },
    [isReady],
  );

  // Your new DB control functions
  const switchDb = useCallback((dbName) => {
    if (!workerRef.current) return;
    setIsReady(false);
    setResults(null);
    workerRef.current.postMessage({ action: "SWITCH_DB", dbName });
  }, []);

  const deleteDb = useCallback((dbName) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ action: "DELETE_DB", dbName });
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        // Friend's exposed values
        isReady,
        isExecuting,
        results,
        error,
        executeSql,
        query,
        setQuery,
        setResults,
        setError,
        // Your exposed values
        schema,
        databases,
        activeDb,
        switchDb,
        deleteDb,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error(
      "useDatabaseContext must be used within a DatabaseProvider",
    );
  }
  return context;
};
