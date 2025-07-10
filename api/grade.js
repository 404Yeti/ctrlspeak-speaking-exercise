export default async function handler(req, res) {
  const { text } = req.body;

  const prompt = `
You're an English-speaking tutor grading IT learners. A student was asked to explain what a Go function does. Here's their explanation:

"${text}"

Grade them on fluency, clarity, and vocabulary (1-10 scale). Then provide 1-2 sentences of feedback to improve. Return this in JSON:

{
  "score": number,
  "feedback": "string"
}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

  const result = await response.json();
  const content = result.choices[0].message.content;

  const feedbackMatch = content.match(/\{[^}]+\}/);
  if (feedbackMatch) {
    const parsed = JSON.parse(feedbackMatch[0]);
    res.status(200).json(parsed);
  } else {
    res.status(200).json({ score: 5, feedback: "Couldn't parse AI response. Please try again." });
  }
}
