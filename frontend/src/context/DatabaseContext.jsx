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
  const [queryPlan, setQueryPlan] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  // 2. Your new Multi-DB states
  const [schema, setSchema] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [activeDb, setActiveDb] = useState("");

  const [executionTime, setExecutionTime] = useState(null);
  const [memoryUsage, setMemoryUsage] = useState(null);

  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/sql.worker.js", import.meta.url),
      { type: "module" },
    );

    // Boot the last active database if it's not the default
    const savedDb = localStorage.getItem("zeroDB_active_db");
    if (savedDb && savedDb !== "test.sqlite") {
      workerRef.current.postMessage({ action: "SWITCH_DB", dbName: savedDb });
    }

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
        isPlan,
        executionTime: exTime,
        memoryUsage: memUsage,
      } = event.data;

      switch (type) {
        case "INIT_SUCCESS":
          console.log("✅", message);
          setIsReady(true);
          break;
        case "QUERY_SUCCESS":
          if (isPlan) {
            setQueryPlan(result);
          } else {
            setResults(result);
            if (exTime !== undefined) setExecutionTime(exTime);
            if (memUsage !== undefined) setMemoryUsage(memUsage);

            if (event.data.isSelectQuery && event.data.cleanSql) {
              lruCache.current.set(event.data.cleanSql, {
                result,
                executionTime: exTime,
                memoryUsage: memUsage
              });
              if (lruCache.current.size > MAX_CACHE_SIZE) {
                const firstKey = lruCache.current.keys().next().value;
                lruCache.current.delete(firstKey);
              }
            }
          }
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

  const [executionMode, setExecutionMode] = useState("draft"); // "draft" or "production"
  const [postgresUri, setPostgresUri] = useState("");
  
  // LRU Cache
  const lruCache = useRef(new Map());
  const MAX_CACHE_SIZE = 20;

  const executeSql = useCallback(
    async (sqlString) => {
      const cleanSql = sqlString.trim();
      const isSelectQuery = /^SELECT/i.test(cleanSql);
      const isWriteQuery = /CREATE|INSERT|UPDATE|DELETE|DROP|ALTER/i.test(cleanSql);

      // Check Cache
      if (isSelectQuery && lruCache.current.has(cleanSql)) {
        const fetchStartTime = performance.now();
        console.log("⚡ Fetching from LRU Cache");
        const cachedData = lruCache.current.get(cleanSql);
        
        // Move to end to mark as recently used
        lruCache.current.delete(cleanSql);
        lruCache.current.set(cleanSql, cachedData);

        setResults(cachedData.result);
        const fetchEndTime = performance.now();
        setExecutionTime(parseFloat((fetchEndTime - fetchStartTime).toFixed(2)));
        if (cachedData.memoryUsage !== undefined) setMemoryUsage(cachedData.memoryUsage);
        return;
      }

      // If it's a write query, invalidate the cache entirely to maintain consistency
      if (isWriteQuery) {
        lruCache.current.clear();
      }

      setIsExecuting(true);
      setError(null);

      if (executionMode === "production") {
        try {
          const { default: api } = await import("../services/api");
          const res = await api.post("/db/execute", { sql: sqlString, isPlan: false });
          
          setResults(res.data.result);
          if (res.data.executionTime !== undefined) setExecutionTime(res.data.executionTime);
          if (res.data.memoryUsage !== undefined) setMemoryUsage(res.data.memoryUsage);

          if (isSelectQuery) {
            lruCache.current.set(cleanSql, {
              result: res.data.result,
              executionTime: res.data.executionTime,
              memoryUsage: res.data.memoryUsage
            });
            if (lruCache.current.size > MAX_CACHE_SIZE) {
              const firstKey = lruCache.current.keys().next().value;
              lruCache.current.delete(firstKey);
            }
          }
        } catch (err) {
          setError(err.response?.data?.error || err.message);
          setResults(null);
        } finally {
          setIsExecuting(false);
        }
        return;
      }

      if (!workerRef.current || !isReady) {
        setError("zeroDB Engine is still spinning up...");
        setIsExecuting(false);
        return;
      }

      workerRef.current.postMessage({ action: "EXECUTE", sql: sqlString, isSelectQuery, cleanSql });
    },
    [isReady, executionMode],
  );

  const getExecutionPlan = useCallback(
    async (sqlString) => {
      setIsExecuting(true);
      setQueryPlan(null);

      if (executionMode === "production") {
        try {
          const { default: api } = await import("../services/api");
          const res = await api.post("/db/execute", { sql: `EXPLAIN ${sqlString}`, isPlan: true });
          setQueryPlan(res.data.result);
        } catch (err) {
          console.error("Execution plan error:", err);
        } finally {
          setIsExecuting(false);
        }
        return;
      }

      if (!workerRef.current || !isReady) {
        setIsExecuting(false);
        return;
      }
      
      workerRef.current.postMessage({
        action: "EXECUTE",
        sql: `EXPLAIN QUERY PLAN ${sqlString}`,
        isPlan: true,
      });
    },
    [isReady, executionMode],
  );

  // Your new DB control functions
  const switchDb = useCallback((dbName) => {
    if (!workerRef.current) return;
    setIsReady(false);
    setResults(null);
    localStorage.setItem("zeroDB_active_db", dbName);
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
        queryPlan,
        error,
        executeSql,
        getExecutionPlan,
        query,
        setQuery,
        setResults,
        setQueryPlan,
        setError,
        // Your exposed values
        schema,
        databases,
        activeDb,
        switchDb,
        deleteDb,
        // Telemetry
        executionTime,
        memoryUsage,
        executionMode,
        setExecutionMode,
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
