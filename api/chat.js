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

    const {
      messages = [],
      language = "auto",
      webContext = ""
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {

      return res.status(400).json({
        success: false,
        error: "Messages are required"
      });
    }

    const languageInstructions = {

      fa:
        "پاسخ را به فارسی افغانستانی/دری روان و طبیعی بده.",

      en:
        "Answer in clear natural English.",

      fr:
        "Réponds en français naturel et clair.",

      ar:
        "أجب باللغة العربية بشكل واضح وطبيعي.",

      de:
        "Antworte auf natürlichem und klarem Deutsch.",

      tr:
        "Doğal ve anlaşılır Türkçe cevap ver.",

      ru:
        "Отвечай на русском языке ясно и естественно.",

      es:
        "Responde en español claro y natural.",

      zh:
        "请使用清晰自然的中文回答。",

      ja:
        "自然で分かりやすい日本語で回答してください。",

      ko:
        "자연스럽고 이해하기 쉬운 한국어로 답변하세요.",

      hi:
        "स्पष्ट और स्वाभाविक हिंदी में उत्तर दें."
    };

    let languageRule = "";

    if (
      language !== "auto" &&
      languageInstructions[language]
    ) {

      languageRule = languageInstructions[language];

    } else {

      languageRule =
        "به زبان کاربر پاسخ بده. اگر کاربر فارسی یا دری نوشت، فارسی/دری پاسخ بده.";
    }

    let webRule = "";

    if (webContext && webContext.trim()) {

      webRule = `

مهم:
نتایج زیر از جستجوی اینترنت دریافت شده‌اند.

${webContext}

برای سؤال‌های مربوط به قیمت، خبر، رویداد، اطلاعات جدید و موضوعات روز،
از این نتایج به عنوان منبع استفاده کن.

اطلاعاتی را که در نتایج وجود ندارد به عنوان واقعیت قطعی ادعا نکن.

اگر سؤال درباره قیمت لحظه‌ای است، زمان‌دار بودن اطلاعات را در نظر بگیر.

اگر نتایج کافی نیستند، صادقانه بگو که اطلاعات جستجو کافی نیست.
`;

    } else {

      webRule = `

در این درخواست نتیجه جستجوی اینترنت در اختیار تو نیست.
اگر کاربر درباره اطلاعات لحظه‌ای سؤال کرد، ادعای دسترسی لحظه‌ای نکن.
`;
    }

    const systemPrompt = `
تو AfghanAI هستی؛ یک دستیار هوش مصنوعی مفید، دقیق و صادق.

${languageRule}

پاسخ‌ها را واضح و کاربردی بده.

از ادعای اطلاعاتی که نداری خودداری کن.

اگر کاربر درباره برنامه‌نویسی سؤال کرد، راه‌حل عملی ارائه بده.

اگر سؤال ساده است، پاسخ را بی‌جهت طولانی نکن.

${webRule}
`;

    const safeMessages = messages
      .slice(-20)
      .map(message => ({
        role:
          message.role === "assistant"
            ? "assistant"
            : "user",
        content: String(message.content || "")
      }));

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {

        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          model: "openai/gpt-oss-120b",

          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...safeMessages
          ],

          temperature: 0.7,

          max_completion_tokens: 2500

        })
      }
    );

    const data = await groqResponse.json();

    if (!groqResponse.ok) {

      console.error("GROQ ERROR:", data);

      return res.status(groqResponse.status).json({

        success: false,

        error:
          data?.error?.message ||
          "Groq API error"
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content;

    if (!reply) {

      return res.status(500).json({

        success: false,

        error: "AI returned an empty response"
      });
    }

    return res.status(200).json({

      success: true,

      reply: reply,

      language: language,

      webUsed:
        Boolean(webContext && webContext.trim())

    });

  } catch(error) {

    console.error("CHAT ERROR:", error);

    return res.status(500).json({

      success: false,

      error:
        error?.message ||
        "Internal server error"

    });
  }
}