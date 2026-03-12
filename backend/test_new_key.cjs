import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCOt1u_7RTnY97eCOhfBaJr9aBqZN-xTkM"; // User's new key

async function testKey() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent("Hello, are you there?");
    console.log("Success:", result.response.text());
  } catch (error) {
    console.error("Error from exact new key:", error);
  }
}

testKey();
