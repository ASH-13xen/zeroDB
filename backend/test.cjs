import fetch from 'node-fetch';

(async () => {
  try {
    const res = await fetch("http://localhost:5000/api/ai/generate-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            schema: "CREATE TABLE data (id INT, radius_mean FLOAT);",
            prompt: "print id and radius_mean columns of data table"
        })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
})();
