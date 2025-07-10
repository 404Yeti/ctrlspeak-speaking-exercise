export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  try {
    // Manually parse the body
    const rawBody = await new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
      req.on('error', err => reject(err));
    });

    const { text } = JSON.parse(rawBody);

    if (!text) {
      return res.status(400).json({ error: "Missing 'text' in request body." });
    }

    const prompt = `
You're an English tutor grading a student's explanation of code. Here’s what they said:

"${text}"

Evaluate the explanation based on:
- Fluency
- Clarity
- Use of technical vocabulary

Give a score from 1 to 10. Then provide 1–2 sentences of constructive feedback.

Respond with **only** a valid JSON object. No code blocks, no extra explanation, no text before or after. Format:
{"score": 8, "feedback": "Your answer was clear and used the correct terminology."}
`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5
      })
    });

   const result = await openaiResponse.json();
  console.log("🧠 Full OpenAI Response:", JSON.stringify(result, null, 2));

  const content = result?.choices?.[0]?.message?.content;


    console.log("🧠 OpenAI raw result:", content);

    let cleaned = content?.replace(/```json|```|\n/g, "").trim();
    let feedbackObj;

    try {
      feedbackObj = JSON.parse(cleaned);
    } catch (e) {
      feedbackObj = {
        score: 5,
        feedback: "Couldn't parse AI response. Please try again.\n\nRaw: " + content
      };
    }

    res.status(200).json(feedbackObj);

  } catch (err) {
    console.error("💥 Error in /api/grade:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
}
