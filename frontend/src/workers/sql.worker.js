/* eslint-disable no-unused-vars */
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

let db = null;
let SQL = null;
let activeDbName = "test.sqlite";
// Helper: Scan OPFS for all .sqlite files

async function getAvailableDatabases() {
  const root = await navigator.storage.getDirectory();
  const dbs = new Set(); // Use a Set to avoid duplicates

  // Iterate through all physical files in the OPFS root
  for await (const [name, handle] of root.entries()) {
    if (handle.kind === "file" && name.endsWith(".sqlite")) {
      dbs.add(name);
    }
  }

  // CRITICAL FIX: Always add the activeDbName to the list,
  // even if it only exists in memory and hasn't been saved to disk yet!
  if (activeDbName) {
    dbs.add(activeDbName);
  }

  return Array.from(dbs);
}

// Helper: Save current DB
async function persistToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(activeDbName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    console.log(`💾 Saved ${activeDbName} to OPFS`);
  } catch (err) {
    console.error("❌ OPFS Save Error:", err);
  }
}

// Helper: Broadcast Schema AND Database List
async function broadcastSchema() {
  if (!db) return;
  try {
    const databases = await getAvailableDatabases();
    const tablesResult = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
    );
    const schema = [];

    if (tablesResult.length > 0) {
      const tableNames = tablesResult[0].values.map((row) => row[0]);
      for (const tableName of tableNames) {
        const columnsResult = db.exec(`PRAGMA table_info("${tableName}");`);
        if (columnsResult.length > 0) {
          const columns = columnsResult[0].values.map((row) => ({
            name: row[1],
            type: row[2],
          }));
          schema.push({ tableName, columns });
        }
      }
    }

    // Now we send the schema, the list of DBs, and the active DB name
    postMessage({
      type: "SCHEMA_UPDATE",
      schema,
      databases,
      activeDb: activeDbName,
    });
  } catch (err) {
    console.error("❌ Schema Fetch Error:", err);
  }
}

// Helper: Load a specific DB from OPFS
async function loadDatabase(dbName) {
  try {
    if (!SQL) {
      SQL = await initSqlJs({ locateFile: () => wasmUrl });
    }

    // 1. Save current DB before switching
    if (db) {
      await persistToDisk();
      db.close();
    }

    activeDbName = dbName.endsWith(".sqlite") ? dbName : `${dbName}.sqlite`;
    const root = await navigator.storage.getDirectory();
    let binaryData = null;

    try {
      const fileHandle = await root.getFileHandle(activeDbName);
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      binaryData = new Uint8Array(buffer);
      console.log(`📂 Loaded ${activeDbName}`);
    } catch (e) {
      console.log(`🆕 Creating new database: ${activeDbName}`);
    }

    db = new SQL.Database(binaryData);
    await broadcastSchema();
    postMessage({
      type: "INIT_SUCCESS",
      message: `Connected to ${activeDbName}`,
    });
  } catch (err) {
    postMessage({ type: "QUERY_ERROR", error: err.message });
  }
}

// Initial Boot
loadDatabase("test.sqlite");

const statementCache = new Map();
const executionCounts = new Map();

self.onmessage = async (event) => {
  const { action, sql, dbName, isPlan, cleanSql, isSelectQuery } = event.data;

  // NEW ACTION: Switch or Create DB
  if (action === "SWITCH_DB") {
    statementCache.clear();
    executionCounts.clear();
    await loadDatabase(dbName);
  }

  if (action === "BROADCAST_SCHEMA") {
    await broadcastSchema();
  }
  if (action === "DELETE_DB") {
    statementCache.clear();
    executionCounts.clear();
    try {
      // Ensure we have the exact filename
      const targetDb = dbName.endsWith(".sqlite") ? dbName : `${dbName}.sqlite`;
      const root = await navigator.storage.getDirectory();

      if (activeDbName === targetDb) {
        // 1. CRITICAL FIX: Destroy it in memory FIRST!
        if (db) {
          db.close();
          db = null;
        }

        // 2. Safely remove the physical file if it exists
        try {
          await root.removeEntry(targetDb);
          console.log(`🗑️ Deleted active DB file: ${targetDb}`);
        } catch (e) {
          if (e.name !== 'NotFoundError') throw e;
          console.log(`ℹ️ Active DB ${targetDb} was memory-only, no file to delete.`);
        }

        // 3. Now load the fallback safely
        await loadDatabase("test.sqlite");
      } else {
        // Deleting a background database
        try {
          await root.removeEntry(targetDb);
          console.log(`🗑️ Deleted background DB: ${targetDb}`);
        } catch (e) {
          if (e.name !== 'NotFoundError') throw e;
          console.log(`ℹ️ Background DB ${targetDb} file not found.`);
        }
        await broadcastSchema();
      }
    } catch (error) {
      console.error("❌ Failed to delete DB:", error);
      postMessage({
        type: "QUERY_ERROR",
        error: "Failed to delete database: " + error.message,
      });
    }
  }

  if (action === "EXECUTE") {
    try {
      const startTime = performance.now();
      let result = [];
      const isSchemaChange = /CREATE|DROP|ALTER/i.test(sql);
      const isWriteQuery = /CREATE|INSERT|UPDATE|DELETE|DROP|ALTER/i.test(sql);

      // JIT / Prepared Statement Execution for SELECTs
      if (isSelectQuery && !isPlan) {
        if (statementCache.has(cleanSql)) {
          // Fast path: Execute compiled statement
          const stmt = statementCache.get(cleanSql);
          const columns = stmt.getColumnNames();
          const values = [];
          while (stmt.step()) values.push(stmt.get());
          stmt.reset();
          result = [{ columns, values }];
          console.log("⚡ JIT Compiled Query Executed");
        } else {
          // Slow path: Execute normally
          result = db.exec(sql);
          // Increment counter
          const count = (executionCounts.get(cleanSql) || 0) + 1;
          executionCounts.set(cleanSql, count);
          
          // JIT Threshold: If executed > 2 times, compile it
          if (count > 2) {
            try {
              const stmt = db.prepare(sql);
              statementCache.set(cleanSql, stmt);
              console.log("🔥 JIT Compiled Statement Cached");
            } catch (compileErr) {
              console.warn("Failed to compile statement for JIT:", compileErr);
            }
          }
        }
      } else {
        // Normal Execution
        result = db.exec(sql);
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      if (isWriteQuery) {
        await persistToDisk();
        // Proactively clear statement cache on ANY write to prevent sql.js pointer corruption
        statementCache.clear(); 
        if (isSchemaChange) {
          executionCounts.clear();
          await broadcastSchema();
        }
      }

      // Memory tracking (Chrome only, but good for telemetry)
      const memoryUsage = self.performance && self.performance.memory 
        ? Math.round(self.performance.memory.usedJSHeapSize / 1024 / 1024) 
        : "N/A";

      postMessage({
        type: "QUERY_SUCCESS",
        result: result[0] ? result[0] : { columns: [], values: [] },
        isPlan,
        executionTime: parseFloat(executionTime.toFixed(2)),
        memoryUsage,
        cleanSql,
        isSelectQuery
      });
    } catch (error) {
      postMessage({ type: "QUERY_ERROR", error: error.message || String(error), isPlan, cleanSql });
    }
  }
};
