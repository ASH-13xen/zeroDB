import QueryHistory from "../models/QueryHistory.js";

export const addQueryHistory = async (req, res) => {
  try {
    const { query, database, executionTime, status, errorMessage } = req.body;
    const userId = req.user.id;

    if (!query || !database || executionTime === undefined || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newHistory = new QueryHistory({
      userId,
      query,
      database,
      executionTime,
      status,
      errorMessage: errorMessage || "",
    });

    await newHistory.save();
    res.status(201).json({ success: true, history: newHistory });
  } catch (error) {
    res.status(500).json({ error: "Failed to add query history", details: error.message });
  }
};

export const getQueryHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await QueryHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100); // Max 100 historical queries to keep things performant

    res.status(200).json({ success: true, history });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch query history", details: error.message });
  }
};

export const clearQueryHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    await QueryHistory.deleteMany({ userId });
    res.status(200).json({ success: true, message: "Query history cleared" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear query history", details: error.message });
  }
};
