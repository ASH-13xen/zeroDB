import initSqlJs from "sql.js";
// The "?url" at the end is a Vite superpower. It tells Vite to grab the actual file from
// node_modules and give us the correct, guaranteed URL for it.
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

let db = null;

async function initDB() {
  try {
    const SQL = await initSqlJs({
      // We ignore whatever file sql.js asks for, and strictly give it the Vite URL
      locateFile: () => wasmUrl,
    });

    db = new SQL.Database();
    postMessage({ type: "INIT_SUCCESS", message: "zeroDB Engine Ready!" });
  } catch (err) {
    console.error("Worker Boot Error:", err);
    postMessage({ type: "QUERY_ERROR", error: err.message });
  }
}

initDB();

self.onmessage = (event) => {
  const { action, sql } = event.data;

  if (action === "EXECUTE") {
    try {
      const result = db.exec(sql);
      postMessage({
        type: "QUERY_SUCCESS",
        result: result[0] ? result[0] : { columns: [], values: [] },
      });
    } catch (error) {
      postMessage({ type: "QUERY_ERROR", error: error.message });
    }
  }
};
