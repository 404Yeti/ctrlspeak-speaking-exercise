export default async function handler(req, res) {
  try {
    // Parse JSON body safely (Vercel gives raw text in req.body)
    const body = req.method === "POST" ? JSON.parse(req.body) : {};
    const { text } = body;

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

Respond ONLY in this JSON format:
{
  "score": number,
  "feedback": "string"
}
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
    const content = result.choices?.[0]?.message?.content;

    const match = content?.match(/\{[\s\S]*?\}/);
    const feedbackObj = match ? JSON.parse(match[0]) : {
      score: 5,
      feedback: "Couldn't parse AI response. Please try again."
    };

    res.status(200).json(feedbackObj);

  } catch (err) {
    console.error("💥 Error in /api/grade:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
}
