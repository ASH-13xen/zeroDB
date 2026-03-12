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

self.onmessage = async (event) => {
  const { action, sql, dbName } = event.data;

  // NEW ACTION: Switch or Create DB
  if (action === "SWITCH_DB") {
    await loadDatabase(dbName);
  }
  if (action === "DELETE_DB") {
    try {
      // Ensure we have the exact filename
      const targetDb = dbName.endsWith(".sqlite") ? dbName : `${dbName}.sqlite`;
      const root = await navigator.storage.getDirectory();

      if (activeDbName === targetDb) {
        // 1. CRITICAL FIX: Destroy it in memory FIRST!
        // Otherwise, loadDatabase will auto-save the deleted DB back to disk.
        if (db) {
          db.close();
          db = null;
        }

        // 2. Remove the physical file
        await root.removeEntry(targetDb);
        console.log(`🗑️ Deleted active DB: ${targetDb}`);

        // 3. Now load the fallback safely
        await loadDatabase("test.sqlite");
      } else {
        // Deleting a background database is easy, just remove the file
        await root.removeEntry(targetDb);
        console.log(`🗑️ Deleted background DB: ${targetDb}`);
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
      const result = db.exec(sql);
      const isWriteQuery = /CREATE|INSERT|UPDATE|DELETE|DROP|ALTER/i.test(sql);

      if (isWriteQuery) {
        await persistToDisk();
        if (/CREATE|DROP|ALTER/i.test(sql)) await broadcastSchema();
      }

      postMessage({
        type: "QUERY_SUCCESS",
        result: result[0] ? result[0] : { columns: [], values: [] },
      });
    } catch (error) {
      postMessage({ type: "QUERY_ERROR", error: error.message });
    }
  }
};
