export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({

      success: false,

      error:
        "Only POST is allowed"

    });

  }

  try {

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {

      return res.status(500).json({

        success: false,

        error:
          "GEMINI_API_KEY is not configured in Vercel"

      });

    }

    const body =
      req.body || {};

    const text =
      String(
        body.text || ""
      ).trim();

    const language =
      body.language || "auto";

    if (!text) {

      return res.status(400).json({

        success: false,

        error:
          "Text is required"

      });

    }

    /*
      محدودیت برای جلوگیری از درخواست
      بسیار بزرگ
    */

    const safeText =
      text.slice(0, 5000);

    const languageNames = {

      auto:
        "Speak naturally in the same language as the text.",

      fa:
        "Speak naturally in Persian/Dari, suitable for Afghanistan.",

      en:
        "Speak naturally in English.",

      fr:
        "Speak naturally in French.",

      ar:
        "Speak naturally in Arabic.",

      de:
        "Speak naturally in German.",

      tr:
        "Speak naturally in Turkish.",

      ru:
        "Speak naturally in Russian.",

      es:
        "Speak naturally in Spanish.",

      zh:
        "Speak naturally in Chinese.",

      ja:
        "Speak naturally in Japanese.",

      ko:
        "Speak naturally in Korean.",

      hi:
        "Speak naturally in Hindi."

    };

    const languageInstruction =
      languageNames[language] ||
      languageNames.auto;

    const prompt = `
Read the following response aloud.

${languageInstruction}

Use a natural, friendly and clear voice.
Do not add words.
Do not translate the text.
Only speak the provided text.

Text:
${safeText}
`;

    const response =
      await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "x-goog-api-key":
              apiKey

          },

          body: JSON.stringify({

            model:
              "gemini-3.1-flash-tts",

            input: prompt,

            generation_config: {

              response_modalities: [
                "AUDIO"
              ],

              speech_config: {

                voice_config: {

                  prebuilt_voice_config: {

                    voice_name:
                      "Kore"

                  }

                }

              }

            }

          })

        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      console.error(
        "Gemini TTS error:",
        data
      );

      return res.status(
        response.status
      ).json({

        success: false,

        error:
          data?.error?.message ||
          "Gemini TTS error"

      });

    }

    /*
      Gemini ممکن است داده صوتی را
      در ساختارهای مختلف برگرداند.
    */

    let base64Audio = null;

    if (
      Array.isArray(data?.steps)
    ) {

      for (
        const step of data.steps
      ) {

        const contents =
          step?.content;

        if (
          Array.isArray(contents)
        ) {

          for (
            const content of contents
          ) {

            if (
              content?.data
            ) {

              base64Audio =
                content.data;

              break;

            }

          }

        }

        if (base64Audio) break;

      }

    }

    if (
      !base64Audio &&
      data?.output_audio?.data
    ) {

      base64Audio =
        data.output_audio.data;

    }

    if (
      !base64Audio &&
      data?.audio?.data
    ) {

      base64Audio =
        data.audio.data;

    }

    if (!base64Audio) {

      console.error(
        "No audio returned:",
        data
      );

      return res.status(500).json({

        success: false,

        error:
          "Gemini did not return audio data"

      });

    }

    /*
      Base64 → Uint8Array
    */

    const binary =
      Buffer.from(
        base64Audio,
        "base64"
      );

    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      "audio/wav"
    );

    res.setHeader(
      "Content-Length",
      binary.length
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    return res.end(binary);

  } catch (error) {

    console.error(
      "TTS SERVER ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        error?.message ||
        "TTS server error"

    });

  }

}