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

    const {
      messages,
      language = "auto",
      webContext = ""
    } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error:
          "messages must be an array"
      });
    }

    const languageInstructions = {

      auto: `
به زبان کاربر پاسخ بده.
اگر فارسی یا دری پرسید، فارسی/دری جواب بده.
اگر انگلیسی پرسید، انگلیسی جواب بده.
زبان کاربر را تشخیص بده.
`,

      fa: `
فقط به فارسی/دری پاسخ بده.
`,

      en: `
Only answer in English.
`,

      fr: `
Réponds uniquement en français.
`,

      ar: `
أجب باللغة العربية فقط.
`,

      de: `
Antworte nur auf Deutsch.
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
केवल हिंदी में उत्तर दें。
`

    };

    const languageInstruction =
      languageInstructions[language] ||
      languageInstructions.auto;

    let webInstruction = "";

    if (webContext) {

      webInstruction = `

مهم:
نتایج زیر از جستجوی اینترنتی آمده‌اند.

اگر سؤال کاربر مربوط به اطلاعات جدید،
قیمت، اخبار، رویدادها یا اطلاعات فعلی است،
از این نتایج برای پاسخ استفاده کن.

اطلاعاتی که در نتایج نیست را به عنوان
اطلاعات جستجو شده ادعا نکن.

اگر منابع کافی نیستند، صادقانه بگو.

نتایج اینترنت:

${webContext}

`;

    }

    const systemMessage = {

      role: "system",

      content: `

تو AfghanAI هستی؛ یک دستیار هوش مصنوعی شخصی.

وظایف:
- پاسخ به سوالات عمومی
- برنامه‌نویسی
- GitHub
- Vercel
- ساخت سایت و اپلیکیشن
- آموزش مرحله‌به‌مرحله
- پروژه‌های کاربر
- تحلیل اطلاعات اینترنتی

قوانین:
- حدس را به عنوان واقعیت بیان نکن.
- اگر مطمئن نیستی بگو.
- پاسخ‌ها واضح و کاربردی باشند.
- اگر کاربر کد کامل خواست، کد کامل بده.
- برای اطلاعات جدید، نتایج جستجوی وب را در نظر بگیر.

زبان:
${languageInstruction}

${webInstruction}

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