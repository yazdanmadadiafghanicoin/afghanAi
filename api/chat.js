export default async function handler(req, res) {

  /* =====================================================
     METHOD
  ===================================================== */

  if (req.method !== "POST") {

    return res.status(405).json({
      success: false,
      error: "Only POST is allowed"
    });

  }


  try {

    /* =====================================================
       API KEY
    ===================================================== */

    const apiKey =
      process.env.GROQ_API_KEY;


    if (!apiKey) {

      return res.status(500).json({
        success: false,
        error:
          "GROQ_API_KEY is not configured in Vercel"
      });

    }


    /* =====================================================
       REQUEST
    ===================================================== */

    const body =
      req.body || {};


    const messages =
      body.messages;


    const selectedLanguage =
      body.language || "auto";


    if (!Array.isArray(messages)) {

      return res.status(400).json({
        success: false,
        error:
          "messages must be an array"
      });

    }


    /* =====================================================
       LANGUAGE SETTINGS
    ===================================================== */

    const languageInstructions = {

      fa: `
زبان پاسخ: فارسی / دری.

همیشه به فارسی/دری پاسخ بده.
از کلمات و ساختار طبیعی دری استفاده کن.
اگر کاربر درباره افغانستان صحبت می‌کند،
تا حد امکان اصطلاحات رایج افغانستان را استفاده کن.
`,

      en: `
Response language: English.

Always answer in clear, natural English.
`,

      fr: `
Langue de réponse : français.

Réponds toujours en français clair et naturel.
`,

      ar: `
لغة الإجابة: العربية.

أجب دائماً باللغة العربية الواضحة والطبيعية.
`,

      de: `
Antwortsprache: Deutsch.

Antworte immer auf klarem und natürlichem Deutsch.
`,

      tr: `
Yanıt dili: Türkçe.

Her zaman açık ve doğal Türkçe cevap ver.
`,

      ru: `
Язык ответа: русский.

Всегда отвечай на понятном и естественном русском языке.
`,

      es: `
Idioma de respuesta: español.

Responde siempre en español claro y natural.
`,

      zh: `
回复语言：中文。

始终使用清晰、自然的中文回答。
`,

      ja: `
回答言語：日本語。

常に自然で分かりやすい日本語で回答してください。
`,

      ko: `
응답 언어: 한국어.

항상 자연스럽고 이해하기 쉬운 한국어로 답변하세요.
`,

      hi: `
उत्तर की भाषा: हिन्दी।

हमेशा स्पष्ट और स्वाभाविक हिन्दी में उत्तर दें।
`

    };


    let languageInstruction = "";


    if (
      selectedLanguage !== "auto" &&
      languageInstructions[selectedLanguage]
    ) {

      languageInstruction =
        languageInstructions[
          selectedLanguage
        ];

    } else {

      languageInstruction = `
زبان پاسخ را از آخرین پیام کاربر تشخیص بده.

اگر کاربر فارسی یا دری صحبت می‌کند،
به فارسی/دری پاسخ بده.

اگر انگلیسی صحبت می‌کند،
به انگلیسی پاسخ بده.

اگر فرانسوی صحبت می‌کند،
به فرانسوی پاسخ بده.

به طور کلی همیشه به همان زبانی که کاربر استفاده کرده
پاسخ بده.
`;

    }


    /* =====================================================
       SYSTEM PROMPT
    ===================================================== */

    const systemMessage = {

      role: "system",

      content: `

تو AfghanAI هستی؛
یک دستیار هوش مصنوعی چندزبانه.

${languageInstruction}

قوانین پاسخ:

1. پاسخ‌ها واضح، دقیق و کاربردی باشند.

2. اگر کاربر درباره برنامه‌نویسی،
GitHub، Vercel، JavaScript، HTML،
API یا پروژه‌های نرم‌افزاری سؤال کرد،
مرحله‌به‌مرحله راهنمایی کن.

3. اگر کاربر کد خواست،
کد کامل و قابل استفاده ارائه کن.

4. اگر کاربر از تو خواست چیزی را اصلاح کنی،
نسخه اصلاح‌شده را کامل ارائه کن.

5. اگر چیزی را نمی‌دانی،
حدس نزن و صادقانه بگو.

6. اطلاعات ساختگی به عنوان واقعیت ارائه نکن.

7. پاسخ را بیش از حد طولانی نکن،
مگر اینکه کاربر جزئیات بیشتری بخواهد.

8. اگر سؤال کاربر مبهم است،
بهترین تفسیر منطقی را انجام بده و در صورت نیاز
یک سؤال کوتاه برای روشن شدن موضوع بپرس.

9. اگر کاربر فارسی افغانستان/دری می‌نویسد،
پاسخ را طبیعی و قابل فهم برای کاربر افغانستان بنویس.

10. زبان انتخاب‌شده توسط کاربر را رعایت کن.
`

    };


    /* =====================================================
       SAFE MESSAGES
    ===================================================== */

    const safeMessages =
      messages
        .slice(-20)
        .map(message => {

          let role = "user";


          if (
            message &&
            message.role === "assistant"
          ) {

            role = "assistant";

          }


          if (
            message &&
            message.role === "system"
          ) {

            role = "system";

          }


          return {

            role,

            content:
              String(
                message?.content || ""
              ).slice(0, 8000)

          };

        });


    /* =====================================================
       GROQ REQUEST
    ===================================================== */

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

          body:
            JSON.stringify({

              model:
                "openai/gpt-oss-120b",

              messages: [

                systemMessage,

                ...safeMessages

              ],

              temperature:
                0.7,

              max_completion_tokens:
                2500

            })

        }
      );


    /* =====================================================
       RESPONSE
    ===================================================== */

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
        ?.message?.content;


    if (!reply) {

      return res.status(500).json({

        success: false,

        error:
          "AI did not return a response"

      });

    }


    /* =====================================================
       SUCCESS
    ===================================================== */

    return res.status(200).json({

      success: true,

      reply: reply.trim(),

      language:
        selectedLanguage

    });


  } catch (error) {

    console.error(
      "AfghanAI API Error:",
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