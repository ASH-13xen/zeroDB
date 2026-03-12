import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates mock data SQL statements using Gemini.
 */
export const generateMockData = async (req, res) => {
  try {
    const { schema } = req.body;

    if (!schema) {
      return res
        .status(400)
        .json({ error: "Missing 'schema' in request body." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is not defined in the environment variables.",
      );
      return res
        .status(500)
        .json({ error: "Server configuration error: Gemini API key missing." });
    }

    const modelName = "gemini-2.5-flash";
    console.log(`Using Gemini model: ${modelName}`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
You are a Database Architect. I am building a Local-First, AI-Powered Browser SQL IDE.
Given this table schema, return ONLY a raw SQL string containing 20 realistic INSERT statements.

Do not include markdown formatting like \`\`\`sql or \`\`\`.
Do not include any explanations.
Ensure the SQL is valid for SQLite.
Ensure the mock data is realistic and matches the data types inferred from the column names.

Schema:
${schema}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // The model might still sometimes include markdown, so let's strip it just in case
    let cleanSql = responseText.trim();
    if (cleanSql.startsWith("```sql")) {
      cleanSql = cleanSql.substring(6);
    }
    if (cleanSql.startsWith("```")) {
      cleanSql = cleanSql.substring(3);
    }
    if (cleanSql.endsWith("```")) {
      cleanSql = cleanSql.substring(0, cleanSql.length - 3);
    }

    cleanSql = cleanSql.trim();

    res.status(200).json({
      success: true,
      sql: cleanSql,
    });
  } catch (error) {
    console.error("Error generating mock data:", error);
    res.status(500).json({
      error: "Failed to generate mock data",
      details: error.message,
    });
  }
};

/**
 * Generates a SQL query from natural language using Gemini.
 */
export const generateSqlQuery = async (req, res) => {
  try {
    const { schema, prompt } = req.body;

    if (!schema || !prompt) {
      return res
        .status(400)
        .json({ error: "Missing 'schema' or 'prompt' in request body." });
    }

    const apiKey = process.env.GEMINI_TEXT_TO_SQL_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(
        "GEMINI_TEXT_TO_SQL_API_KEY is not defined in the environment variables.",
      );
      return res
        .status(500)
        .json({ error: "Server configuration error: Gemini API key missing." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const aiPrompt = `
You are an expert SQL Developer. I am building a Local-First Browser SQL IDE.
Given the following table schema and a user's natural language request, generate ONLY the valid SQLite query to satisfy the request.

Do not include markdown formatting like \`\`\`sql or \`\`\`.
Do not include any explanations, greetings, or additional text. Just return the raw SQL string.

Schema:
${schema}

User Request:
${prompt}
`;

    const result = await model.generateContent(aiPrompt);
    const responseText = result.response.text();

    // The model might still sometimes include markdown, so let's strip it just in case
    let cleanSql = responseText.trim();
    if (cleanSql.startsWith("```sql")) {
      cleanSql = cleanSql.substring(6);
    }
    if (cleanSql.startsWith("```")) {
      cleanSql = cleanSql.substring(3);
    }
    if (cleanSql.endsWith("```")) {
      cleanSql = cleanSql.substring(0, cleanSql.length - 3);
    }

    cleanSql = cleanSql.trim();

    res.status(200).json({
      success: true,
      query: cleanSql,
    });
  } catch (error) {
    console.error("Error generating SQL query:", error);
    res.status(500).json({
      error: "Failed to generate SQL query",
      details: error.message,
    });
  }
};

/**
 * Analyzes an SQL query and suggests optimizations.
 */
export const optimizeQuery = async (req, res) => {
  try {
    const { schema, query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Missing 'query' in request body." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const aiPrompt = `
You are a Senior Database Performance Engineer. I am building an AI-powered SQL IDE.
Given the following table schema and a user's SQL query, provide:
1. An "Optimized SQL" version (if possible, or the same if already optimal).
2. A concise "Analysis" of the query's performance bottlenecks.

Format your response as a JSON object:
{
  "optimizedSql": "...",
  "analysis": "..."
}

Schema:
${schema || "No schema provided."}

User Query:
${query}
`;

    const result = await model.generateContent(aiPrompt);
    const responseText = result.response.text();

    // Parse JSON from AI response - robustly
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.substring(7);
    if (cleanedResponse.startsWith("```")) cleanedResponse = cleanedResponse.substring(3);
    if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
    
    let jsonMatch = cleanedResponse.trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`AI returned invalid format: ${responseText}`);
    }
    
    const optimization = JSON.parse(jsonMatch[0]);

    res.status(200).json({
      success: true,
      ...optimization
    });
  } catch (error) {
    console.error("Error optimizing query:", error);
    res.status(500).json({
      error: "Failed to optimize query",
      details: error.message,
    });
  }
};

