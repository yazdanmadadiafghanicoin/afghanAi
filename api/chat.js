export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Only POST is allowed"
    });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GROQ_API_KEY is not configured in Vercel"
      });
    }

    const { messages } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: "messages must be an array"
      });
    }

    const safeMessages = messages
      .slice(-20)
      .map((m) => ({
        role:
          m.role === "assistant"
            ? "assistant"
            : m.role === "system"
            ? "system"
            : "user",
        content: String(m.content || "").slice(0, 8000)
      }));

    const systemMessage = {
      role: "system",
      content: `
تو Yazdan AI هستی؛ یک دستیار هوش مصنوعی فارسی و دری.
پاسخ‌ها را واضح، کوتاه و کاربردی بده.
اگر کاربر درباره برنامه‌نویسی، GitHub، Vercel، پروژه‌هایش یا مسائل عمومی سؤال کرد، مرحله‌به‌مرحله راهنمایی کن.
اگر چیزی را نمی‌دانی، حدس نزن و صادقانه بگو.
`
    };

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [systemMessage, ...safeMessages],
          temperature: 0.7,
          max_completion_tokens: 2000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || "Groq API error"
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        success: false,
        error: "AI did not return a response"
      });
    }

    return res.status(200).json({
      success: true,
      reply
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Server error"
    });
  }
}