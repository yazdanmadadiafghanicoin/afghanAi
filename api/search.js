export default async function handler(req, res) {

  if (req.method !== "GET") {

    return res.status(405).json({
      success: false,
      error: "Only GET is allowed"
    });

  }

  try {

    const url =
      new URL(
        req.url,
        `https://${req.headers.host}`
      );

    const query =
      String(
        url.searchParams.get("q") || ""
      ).trim();

    if (!query) {

      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });

    }

    if (query.length > 300) {

      return res.status(400).json({
        success: false,
        error: "Search query is too long"
      });

    }

    const searchUrl =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(query);

    const response =
      await fetch(
        searchUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; AfghanAI/1.0)"
          }
        }
      );

    if (!response.ok) {

      return res.status(502).json({
        success: false,
        error:
          "Internet search provider is unavailable"
      });

    }

    const html =
      await response.text();

    const results = [];

    /*
      DuckDuckGo HTML result blocks
    */

    const regex =
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
      (match = regex.exec(html)) !== null &&
      results.length < 8
    ) {

      let resultUrl =
        match[1];

      let title =
        cleanHTML(match[2]);

      let snippet =
        cleanHTML(match[3]);

      /*
        DDG sometimes returns redirect URLs.
      */

      if (
        resultUrl.startsWith(
          "//duckduckgo.com/l/?uddg="
        )
      ) {

        resultUrl =
          "https:" +
          resultUrl;

      }

      try {

        if (
          resultUrl.includes(
            "duckduckgo.com/l/?uddg="
          )
        ) {

          const parsed =
            new URL(resultUrl);

          const original =
            parsed.searchParams.get(
              "uddg"
            );

          if (original) {
            resultUrl =
              original;
          }

        }

      } catch (_) {}

      if (
        !resultUrl.startsWith("http")
      ) {
        continue;
      }

      if (!title) continue;

      results.push({

        title:
          title.slice(0, 300),

        url:
          resultUrl.slice(0, 1000),

        snippet:
          snippet.slice(0, 700)

      });

    }

    return res.status(200).json({

      success: true,

      query,

      count:
        results.length,

      results

    });

  } catch (error) {

    console.error(
      "SEARCH ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        error?.message ||
        "Search server error"

    });

  }

}

function cleanHTML(value) {

  return String(value || "")

    .replace(
      /<br\s*\/?>/gi,
      " "
    )

    .replace(
      /<[^>]*>/g,
      ""
    )

    .replace(
      /&amp;/g,
      "&"
    )

    .replace(
      /&quot;/g,
      '"'
    )

    .replace(
      /&#39;/g,
      "'"
    )

    .replace(
      /&lt;/g,
      "<"
    )

    .replace(
      /&gt;/g,
      ">"
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}