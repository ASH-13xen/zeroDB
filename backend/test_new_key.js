const apiKey = "AIzaSyCOt1u_7RTnY97eCOhfBaJr9aBqZN-xTkM"; // User's new key
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

async function testKey() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hello, are you there?" }] }]
      })
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("Error from exact new key:", error);
  }
}

testKey();
