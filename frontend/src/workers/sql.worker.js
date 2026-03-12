/* eslint-disable no-unused-vars */
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

let db = null;
const DB_FILENAME = "zerodb_local.sqlite";

// Helper: Save the current in-memory DB to the OPFS disk
async function persistToDisk() {
  if (!db) return;
  try {
    const data = db.export(); // Export DB to a byte array
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_FILENAME, { create: true });

    // Create a writable stream to save the file
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();

    console.log("💾 Database persisted to OPFS");
  } catch (err) {
    console.error("❌ OPFS Save Error:", err);
  }
}

async function initDB() {
  try {
    const SQL = await initSqlJs({
      locateFile: () => wasmUrl,
    });

    // Try to load existing data from OPFS
    const root = await navigator.storage.getDirectory();
    let binaryData = null;

    try {
      const fileHandle = await root.getFileHandle(DB_FILENAME);
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      binaryData = new Uint8Array(buffer);
      console.log("📂 Existing database loaded from OPFS");
    } catch (e) {
      console.log("🆕 No existing database found, creating new one.");
    }

    // Initialize DB with either existing data or empty
    db = new SQL.Database(binaryData);

    postMessage({ type: "INIT_SUCCESS", message: "Persistent Engine Ready!" });
  } catch (err) {
    postMessage({ type: "QUERY_ERROR", error: err.message });
  }
}

initDB();

self.onmessage = async (event) => {
  const { action, sql } = event.data;

  if (action === "EXECUTE") {
    try {
      const result = db.exec(sql);

      // Feature 3: Check if the query modifies data
      const isWriteQuery = /CREATE|INSERT|UPDATE|DELETE|DROP/i.test(sql);
      if (isWriteQuery) {
        await persistToDisk();
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
