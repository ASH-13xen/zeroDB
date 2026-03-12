import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // There isn't a direct "listModels" in the simple SDK easily, 
    // but we can try to hit a basic one that almost always works.
    
    console.log("Testing gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("echo 'hello'");
    console.log("Success with 1.5-flash!");
    console.log(result.response.text());
  } catch (err) {
    console.error("Failed with 1.5-flash:", err.message);
    
    try {
      console.log("Testing gemini-pro (legacy)...");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent("echo 'hello'");
      console.log("Success with gemini-pro!");
      console.log(result.response.text());
    } catch (err2) {
      console.error("Failed with gemini-pro:", err2.message);
    }
  }
}

listModels();
