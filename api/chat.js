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

أجب دائماً باللغة العربية الو