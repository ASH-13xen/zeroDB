import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?worker';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?worker';

const MANUAL_BUNDLES = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};

let db = null;
let conn = null;

async function initDuckDB() {
  if (db) return;
  try {
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    const worker = new bundle.mainWorker();
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    conn = await db.connect();
    
    postMessage({
      type: "INIT_SUCCESS",
      message: "Connected to DuckDB-Wasm (OLAP Mode)",
    });
    
    await broadcastSchema();
  } catch (error) {
    postMessage({ type: "QUERY_ERROR", error: error.message });
  }
}

// Initial Boot
initDuckDB();

async function broadcastSchema() {
  if (!conn) return;
  try {
    // DuckDB schema catalog
    const tablesResult = await conn.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'main'
      ORDER BY table_name, ordinal_position;
    `);
    
    const schemaMap = new Map();
    for (const row of tablesResult) {
      const tableName = row.table_name;
      if (!schemaMap.has(tableName)) {
        schemaMap.set(tableName, []);
      }
      schemaMap.get(tableName).push({
        name: row.column_name,
        type: row.data_type
      });
    }

    const schema = Array.from(schemaMap.entries()).map(([tableName, columns]) => ({
      tableName,
      columns
    }));

    postMessage({
      type: "SCHEMA_UPDATE",
      schema,
      databases: ["DuckDB In-Memory"],
      activeDb: "DuckDB In-Memory",
    });
  } catch (err) {
    console.error("❌ DuckDB Schema Fetch Error:", err);
  }
}

self.onmessage = async (event) => {
  const { action, sql, isPlan, cleanSql, isSelectQuery, file, tableName } = event.data;

  if (action === "BROADCAST_SCHEMA") {
    await broadcastSchema();
  }

  if (action === "REGISTER_FILE") {
    try {
      if (!db || !conn) throw new Error("DuckDB not initialized yet");
      // Register the File object directly with DuckDB Wasm
      await db.registerFileHandle(file.name, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);
      
      // Auto-create a view or table to query it easily.
      // We use sample_size=-1 so DuckDB scans the entire file to infer types properly and avoids crashing on dirty data deep in the file.
      const createSql = `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${file.name}', sample_size=-1);`;
      await conn.query(createSql);
      
      await broadcastSchema();
      
      postMessage({
        type: "FILE_REGISTER_SUCCESS",
        tableName,
        fileName: file.name
      });
    } catch (error) {
      postMessage({ type: "QUERY_ERROR", error: error.message });
    }
  }

  if (action === "EXECUTE") {
    try {
      if (!conn) throw new Error("DuckDB not initialized yet");
      const startTime = performance.now();
      
      const isSchemaChange = /CREATE|DROP|ALTER/i.test(sql);
      
      let arrowResult;
      if (isPlan) {
        arrowResult = await conn.query(`EXPLAIN ${sql}`);
      } else {
        arrowResult = await conn.query(sql);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      if (isSchemaChange && !isPlan) {
        await broadcastSchema();
      }
      
      // Convert Arrow result to the format expected by the frontend
      // The frontend expects { columns: [...], values: [[...], [...]] }
      let formattedResult = { columns: [], values: [] };
      if (arrowResult && arrowResult.schema) {
        formattedResult.columns = arrowResult.schema.fields.map(f => f.name);
        formattedResult.values = arrowResult.toArray().map(row => {
          return formattedResult.columns.map(col => {
            const val = row[col];
            // Handle BigInts which cause issues when serializing to main thread
            return typeof val === 'bigint' ? val.toString() : val;
          });
        });
      }

      const memoryUsage = self.performance && self.performance.memory 
        ? Math.round(self.performance.memory.usedJSHeapSize / 1024 / 1024) 
        : "N/A";

      postMessage({
        type: "QUERY_SUCCESS",
        result: formattedResult,
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
