import pkg from "pg";
const { Client } = pkg;
import User from "../models/User.js";

export const savePostgresUri = async (req, res) => {
  try {
    const { uri } = req.body;
    const userId = req.user.id;

    if (!uri) {
      return res.status(400).json({ error: "No URI provided" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.postgresUri = uri;
    await user.save();

    res.status(200).json({ success: true, message: "Postgres URI saved" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save Postgres URI", details: error.message });
  }
};

export const getPostgresUri = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ success: true, uri: user.postgresUri });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Postgres URI", details: error.message });
  }
};

export const executePostgresQuery = async (req, res) => {
  try {
    const { sql, isPlan } = req.body;
    const userId = req.user.id;

    if (!sql) {
      return res.status(400).json({ error: "No SQL provided" });
    }

    const user = await User.findById(userId);
    if (!user || !user.postgresUri) {
      return res.status(400).json({ error: "No PostgreSQL connection configured. Please set it in Settings." });
    }

    const startTime = performance.now();
    const client = new Client({ connectionString: user.postgresUri });
    await client.connect();

    // EXPLAIN ANALYZE doesn't directly return nodes like SQLite does, but we can parse it 
    // or just execute the query normally.
    const result = await client.query(sql);
    const endTime = performance.now();

    await client.end();

    const executionTime = endTime - startTime;

    // Convert pg result to match our frontend format { columns, values }
    const columns = result.fields.map(f => f.name);
    const values = result.rows.map(row => columns.map(col => row[col]));

    res.status(200).json({
      success: true,
      result: { columns, values },
      isPlan,
      executionTime: parseFloat(executionTime.toFixed(2)),
      memoryUsage: "Remote" // Not available locally
    });
  } catch (error) {
    res.status(500).json({ error: "Query execution failed", details: error.message });
  }
};
