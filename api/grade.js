export const config = {
  api: {
    bodyParser: false,
  },
};

// CORS wrapper (allow only CtrlSpeak.com)
function allowCors(handler) {
  return async (req, res) => {
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "https://ctrlspeak.com");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    return handler(req, res);
  };
}

// Prompt logic per mode
function buildPrompt(text, mode) {
  switch (mode) {
    case "interview":
      return `
You're a technical interviewer evaluating a candidate’s spoken answer.

Here’s their response:

"${text}"

Evaluate it based on:
- Accuracy
- Use of technical terminology
- Communication clarity

Respond with a **valid JSON object only** like:
{"score": 8, "feedback": "Your answer was mostly accurate but missed explaining edge cases."}
`;

    case "writing":
      return `
You're an English writing coach. A student submitted this email:

"${text}"

Evaluate it based on:
- Grammar
- Tone
- Clarity
- Structure

Return a **valid JSON object only** like:
{"score": 7, "feedback": "Good structure and tone, but a few grammar mistakes and missing greeting."}
`;

    case "code":
    default:
      return `
You're an English tutor grading a student's spoken explanation of a code snippet.

Here’s what they said:

"${text}"

Evaluate based on:
- Fluency
- Clarity
- Use of technical vocabulary

Respond with a **valid JSON object only** like:
{"score": 9, "feedback": "You clearly explained the loop and used the correct terminology."}
`;
  }
}

async function handler(req, res) {
  try {
    // Parse raw body manually
    const rawBody = await new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => resolve(body));
      req.on("error", (err) => reject(err));
    });

    if (!rawBody) return res.status(400).json({ error: "Empty request body." });

    let parsed;
    try {
      parsed = JSON.parse(rawBody);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body." });
    }

    const { text, mode = "code" } = parsed;

    if (!text) return res.status(400).json({ error: "Missing 'text' field." });

    const prompt = buildPrompt(text, mode);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
    });

    const result = await openaiRes.json();
    console.log("🧠 Full OpenAI Response:", JSON.stringify(result, null, 2));

    const raw = result?.choices?.[0]?.message?.content;
    console.log("🧠 Raw Response:", raw);

    // Clean up code block formatting
    let cleaned = raw?.replace(/```json|```|\n/g, "").trim();

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleaned);
    } catch (e) {
      parsedResult = {
        score: 5,
        feedback: "Couldn't parse AI response. Please try again.\n\nRaw: " + raw,
      };
    }

    res.status(200).json(parsedResult);
  } catch (err) {
    console.error("💥 Handler Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
}

export default allowCors(handler);
