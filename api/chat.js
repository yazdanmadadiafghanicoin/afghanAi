export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      success: false,
      error: "Only POST is allowed"
    });

  }

  try {

    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {

      return res.status(500).json({
        success: false,
        error:
          "GROQ_API_KEY is not configured in Vercel"
      });

    }

    const body =
      req.body || {};

    const messages =
      body.messages;

    const language =
      body.language || "auto";

    if (!Array.isArray(messages)) {

      return res.status(400).json({
        success: false,
        error:
          "messages must be an array"
      });

    }

    const languageInstructions = {

      auto: `
به زبان خود کاربر پاسخ بده.
اگر کاربر فارسی یا دری نوشت، به فارسی/دری پاسخ بده.
اگر انگلیسی نوشت، انگلیسی پاسخ بده.
زبان کاربر را خودت تشخیص بده.
`,

      fa: `
فقط به فارسی/دری پاسخ بده.
از زبان واضح و طبیعی افغانستان استفاده کن.
`,

      en: `
Answer only in English.
`,

      fr: `
Réponds uniquement en français.
`,

      ar: `
أجب باللغة العربية فقط.
`,

      de: `
Antworte ausschließlich auf Deutsch.
`,

      tr: `
Yalnızca Türkçe cevap ver.
`,

      ru: `
Отвечай только на русском языке.
`,

      es: `
Responde únicamente en español.
`,

      zh: `
请只用中文回答。
`,

      ja: `
日本語だけで答えてください。
`,

      ko: `
한국어로만 답변하세요.
`,

      hi: `
केवल हिंदी में उत्तर दें।
`

    };

    const languageInstruction =
      languageInstructions[language] ||
      languageInstructions.auto;

    const systemMessage = {

      role: "system",

      content: `
تو AfghanAI هستی؛ یک دستیار هوش مصنوعی شخصی.

وظایف تو:
- پاسخ‌گویی به سوالات عمومی
- کمک به برنامه‌نویسی
- کمک به GitHub
- کمک به Vercel
- کمک به ساخت وب‌سایت و اپلیکیشن
- آموزش مرحله‌به‌مرحله
- کمک به پروژه‌های کاربر
- پاسخ واضح و کاربردی

قوانین:
- چیزی را که مطمئن نیستی به عنوان واقعیت بیان نکن.
- اگر اطلاعات کافی نداری، صادقانه بگو.
- پاسخ‌ها را بیش از حد طولانی نکن مگر اینکه کاربر جزئیات بخواهد.
- اگر کاربر درخواست کد کامل کرد، کد کامل و قابل استفاده بده.
- اگر کاربر تازه‌کار است، مراحل را ساده توضیح بده.

زبان:
${languageInstruction}
`

    };

    const safeMessages =
      messages
        .slice(-20)
        .map(message => {

          let role = "user";

          if (
            message.role === "assistant"
          ) {

            role = "assistant";

          } else if (
            message.role === "system"
          ) {

            role = "system";

          }

          return {

            role,

            content:
              String(
                message.content || ""
              ).slice(0, 8000)

          };

        });

    const response =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${apiKey}`

          },

          body: JSON.stringify({

            model:
              "openai/gpt-oss-120b",

            messages: [
              systemMessage,
              ...safeMessages
            ],

            temperature: 0.7,

            max_completion_tokens:
              2500

          })

        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      return res.status(
        response.status
      ).json({

        success: false,

        error:
          data?.error?.message ||
          "Groq API error"

      });

    }

    const reply =
      data
        ?.choices?.[0]
        ?.message
        ?.content;

    if (!reply) {

      return res.status(500).json({

        success: false,

        error:
          "AI did not return a response"

      });

    }

    return res.status(200).json({

      success: true,

      reply: String(reply),

      language

    });

  } catch (error) {

    console.error(
      "CHAT ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        error?.message ||
        "Server error"

    });

  }

}