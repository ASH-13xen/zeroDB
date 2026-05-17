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
  const lastSelectQueryRef = useRef("");
  const exportResolveRef = useRef(null);

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

            const memUsage = window.performance && window.performance.memory
              ? Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024)
              : "N/A";
            setMemoryUsage(memUsage);

            if (event.data.isSelectQuery && event.data.cleanSql) {
              lastSelectQueryRef.current = event.data.cleanSql;
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

            // Log history asynchronously
            import("../services/api").then(({ default: api }) => {
              api.post("/history", {
                query: event.data.cleanSql,
                database: activeDb || "test.sqlite",
                executionTime: exTime || 0,
                status: "success"
              }).catch(err => console.warn("Failed to log local query history", err));
            });
          }
          setError(null);
          setIsExecuting(false);
          break;
        case "QUERY_ERROR":
          setError(error);
          setResults(null);
          setIsExecuting(false);
          
          if (event.data && event.data.cleanSql) {
            import("../services/api").then(({ default: api }) => {
              api.post("/history", {
                query: event.data.cleanSql,
                database: activeDb || "test.sqlite",
                executionTime: 0,
                status: "error",
                errorMessage: error
              }).catch(err => console.warn("Failed to log local query error", err));
            });
          }
          break;
        // Your schema listener
        case "SCHEMA_UPDATE":
          setSchema(newSchema);
          if (dbList) setDatabases(dbList);
          if (currentDb) setActiveDb(currentDb);
          break;
        case "SNAPSHOTS_UPDATE":
          setSnapshots(event.data.snapshots);
          setCurrentSnapshotIndex(event.data.currentSnapshotIndex);
          break;
        case "RESTORE_SUCCESS":
          // Wipe out LRU cache to prevent stale data retrieval
          lruCache.current.clear();
          
          // Re-execute the last select query to keep results in sync!
          if (lastSelectQueryRef.current) {
            const lastQuery = lastSelectQueryRef.current;
            setIsExecuting(true);
            setError(null);
            workerRef.current?.postMessage({
              action: "EXECUTE",
              sql: lastQuery,
              isSelectQuery: true,
              cleanSql: lastQuery
            });
          } else {
            setResults(null);
          }
          break;
        case "EXPORT_SUCCESS":
          if (exportResolveRef.current) {
            exportResolveRef.current(event.data);
            exportResolveRef.current = null;
          }
          break;
        case "IMPORT_SUCCESS":
          setIsReady(true);
          console.log("✅", event.data.message);
          break;
        default:
          console.warn("Unknown message from worker:", event.data);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const [executionMode, setExecutionMode] = useState(() => {
    return localStorage.getItem("zeroDB_execution_mode") || "draft";
  }); // "draft" or "production"
  const [postgresUri, setPostgresUri] = useState("");
  
  // SQL Time-Travel Debugging State
  const [snapshots, setSnapshots] = useState([]);
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(-1);
  
  useEffect(() => {
    localStorage.setItem("zeroDB_execution_mode", executionMode);
    
    if (executionMode === "production") {
      import("../services/api").then(({ default: api }) => {
        api.get("/db/schema").then(res => {
          setSchema(res.data.schema);
          setDatabases(["Remote PostgreSQL"]);
          setActiveDb("Remote PostgreSQL");
        }).catch(err => {
          console.error("Failed to fetch remote schema", err);
          setSchema([]);
          setDatabases(["Remote PostgreSQL"]);
          setActiveDb("Remote PostgreSQL");
        });
      });
    } else {
      workerRef.current?.postMessage({ action: "BROADCAST_SCHEMA" });
    }
  }, [executionMode]);
  
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

        setError(null);
        setResults(cachedData.result);
        const fetchEndTime = performance.now();
        const exTime = parseFloat((fetchEndTime - fetchStartTime).toFixed(2));
        setExecutionTime(exTime);
        
        const memUsage = window.performance && window.performance.memory
          ? Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024)
          : "N/A";
        setMemoryUsage(memUsage);

        // Log cached history asynchronously
        import("../services/api").then(({ default: api }) => {
          api.post("/history", {
            query: cleanSql,
            database: activeDb || "test.sqlite",
            executionTime: exTime,
            status: "success"
          }).catch(err => console.warn("Failed to log cached query history", err));
        });

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

          // Log remote query history
          api.post("/history", {
            query: cleanSql,
            database: activeDb || "Remote PostgreSQL",
            executionTime: res.data.executionTime || 0,
            status: "success"
          }).catch(err => console.warn("Failed to log remote query history", err));

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
          const errMsg = err.response?.data?.error || err.message;
          setError(errMsg);
          setResults(null);

          // Log remote query error
          import("../services/api").then(({ default: api }) => {
            api.post("/history", {
              query: cleanSql,
              database: activeDb || "Remote PostgreSQL",
              executionTime: 0,
              status: "error",
              errorMessage: errMsg
            }).catch(e => console.warn("Failed to log remote query error", e));
          });
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

  const restoreSnapshot = useCallback((index) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ action: "RESTORE_SNAPSHOT", index });
  }, []);

  const commitRevert = useCallback((index) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ action: "COMMIT_REVERT", index });
  }, []);

  const finalizeBaseline = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ action: "FINALIZE_BASELINE" });
  }, []);

  const exportAndShareDatabase = useCallback(async (mode) => {
    if (!workerRef.current || executionMode !== "draft") return;
    
    // 1. Get the bytes from worker
    const { dbBytes, dbName } = await new Promise((resolve, reject) => {
      exportResolveRef.current = resolve;
      workerRef.current.postMessage({ action: "EXPORT_ACTIVE_DB" });
      setTimeout(() => reject(new Error("Export timed out")), 5000);
    });

    // 2. Create FormData
    const formData = new FormData();
    const blob = new Blob([dbBytes], { type: "application/octet-stream" });
    formData.append("databaseFile", blob, dbName);
    formData.append("dbName", dbName);
    formData.append("mode", mode);

    // 3. Upload to backend
    const { default: api } = await import("../services/api");
    const response = await api.post("/share/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }, [executionMode]);

  const importSharedDatabase = useCallback(async (shareId) => {
    if (!workerRef.current) return;
    
    setIsReady(false);
    
    // 1. Download from backend as Blob/ArrayBuffer
    const { default: api } = await import("../services/api");
    const response = await api.get(`/share/${shareId}`, { responseType: "arraybuffer" });
    
    const dbName = response.headers["x-database-name"] || `imported_${Date.now()}.sqlite`;
    
    // 2. Send bytes to worker to initialize
    workerRef.current.postMessage({
      action: "IMPORT_DB_BYTES",
      dbName,
      dbBytes: response.data,
    });
    
    localStorage.setItem("zeroDB_active_db", dbName);
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
        // Time Travel
        snapshots,
        currentSnapshotIndex,
        restoreSnapshot,
        commitRevert,
        finalizeBaseline,
        // Sharing
        exportAndShareDatabase,
        importSharedDatabase,
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
