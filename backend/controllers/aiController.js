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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Fast and cheap model

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
