import Workspace from "../models/Workspace.js";

export const saveWorkspace = async (req, res) => {
  try {
    const { query } = req.body;
    // req.user.id comes from your Auth Middleware (which we should verify is active)
    const workspace = await Workspace.findOneAndUpdate(
      { userId: req.user.id },
      { savedQuery: query, lastUpdated: Date.now() },
      { upsert: true, new: true },
    );
    res.json({ success: true, workspace });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ userId: req.user.id });
    res.json({ success: true, query: workspace?.savedQuery || "" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
