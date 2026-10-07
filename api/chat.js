const MODEL = "openai/gpt-5.6-luna";

const SYSTEM_PROMPT = `
تو Yazdan AI هستی، یک دستیار هوش مصنوعی فارسی‌زبان.

قوانین:
- به فارسی واضح و دوستانه پاسخ بده.
- اگر کاربر به دری یا فارسی افغانستانی صحبت کرد، همان سبک را حفظ کن.
- پاسخ‌ها را تا حد امکان دقیق و کاربردی بده.
- اگر چیزی را نمی‌دانی، حدس نزن و واضح بگو.
- در مسائل مالی، پزشکی و حقوقی ادعای قطعیت نکن.
- به کاربر برای ساخت پروژه‌های نرم‌افزاری کمک کن.
`;

export default async function handler(req, res) {

  // فقط POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  }

  try {

    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "AI_GATEWAY_API_KEY در Vercel تنظیم نشده است."
      });
    }

    const body = req.body || {};

    let messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    // جلوگیری از ارسال حجم بسیار زیاد
    messages = messages.slice(-20);

    const cleanMessages = messages
      .filter(item =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      )
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 12000)
      }));

    if (cleanMessages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "پیام خالی است."
      });
    }

    const gatewayResponse = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model: MODEL,

          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            ...cleanMessages
          ],

          temperature: 0.7,

          max_tokens: 2000
        })
      }
    );

    const rawText = await gatewayResponse.text();

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      data = {
        error: rawText
      };
    }

    if (!gatewayResponse.ok) {

      console.error("AI Gateway Error:", data);

      return res.status(502).json({
        success: false,
        error:
          data?.error?.message ||
          data?.error ||
          "خطا از طرف AI Gateway"
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content;

    if (!reply) {

      console.error("Invalid AI response:", data);

      return res.status(502).json({
        success: false,
        error: "پاسخ معتبر از هوش مصنوعی دریافت نشد."
      });
    }

    return res.status(200).json({
      success: true,
      reply: reply
    });

  } catch (error) {

    console.error("Server Error:", error);

    return res.status(500).json({
      success: false,
      error: "خطای داخلی سرور."
    });
  }
}