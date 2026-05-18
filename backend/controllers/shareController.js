import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import SharedDatabase from "../models/SharedDatabase.js";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadDatabase = async (req, res) => {
  try {
    const { dbName, mode } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No database file uploaded." });
    }
    if (!dbName) {
      return res.status(400).json({ error: "Database name is required." });
    }

    const shareId = nanoid(10);
    const ownerId = req.user.id;

    const newSharedDb = new SharedDatabase({
      shareId,
      ownerId,
      dbName,
      mode: mode || "private",
      filePath: file.path,
    });

    await newSharedDb.save();

    res.status(201).json({
      message: "Database shared successfully",
      shareId,
      link: `/workspace?importDb=${shareId}`,
    });
  } catch (error) {
    console.error("Upload DB Error:", error);
    res.status(500).json({ error: "Failed to upload database." });
  }
};

export const downloadDatabase = async (req, res) => {
  try {
    const { shareId } = req.params;
    const sharedDb = await SharedDatabase.findOne({ shareId });

    if (!sharedDb) {
      return res.status(404).json({ error: "Shared database not found or expired." });
    }

    // Check permissions
    if (sharedDb.mode === "private") {
      // Must be logged in and the owner
      if (!req.user || req.user.id.toString() !== sharedDb.ownerId.toString()) {
        return res.status(403).json({ error: "You do not have permission to access this private database." });
      }
    }

    // Check if file still exists on disk
    if (!fs.existsSync(sharedDb.filePath)) {
      // Clean up orphaned document
      await SharedDatabase.deleteOne({ _id: sharedDb._id });
      return res.status(404).json({ error: "Database file no longer exists." });
    }

    // Return metadata as custom headers, and the file as binary stream
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${sharedDb.dbName}"`,
      "Access-Control-Expose-Headers": "X-Database-Name, X-Database-Mode",
      "X-Database-Name": sharedDb.dbName,
      "X-Database-Mode": sharedDb.mode,
    });

    const fileStream = fs.createReadStream(sharedDb.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Download DB Error:", error);
    res.status(500).json({ error: "Failed to download database." });
  }
};
