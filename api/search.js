export default async function handler(req, res) {

  if (req.method !== "GET") {

    return res.status(405).json({
      success: false,
      error: "Only GET is allowed"
    });
  }

  try {

    const q =
      typeof req.query?.q === "string"
        ? req.query.q.trim()
        : "";

    if (!q) {

      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    if (q.length > 300) {

      return res.status(400).json({
        success: false,
        error: "Search query is too long"
      });
    }

    const searchUrl =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(q);

    const response = await fetch(searchUrl, {

      method: "GET",

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

        "Accept":
          "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {

      throw new Error(
        "Search provider returned HTTP " +
        response.status
      );
    }

    const html = await response.text();

    const results = [];

    const resultPattern =
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
      (match = resultPattern.exec(html)) !== null &&
      results.length < 8
    ) {

      let url = match[1];

      let title = cleanHtml(match[2]);

      if (!url || !title) {
        continue;
      }

      url = decodeDuckDuckGoUrl(url);

      let snippet = "";

      const afterTitle =
        html.slice(
          match.index + match[0].length
        );

      const snippetMatch =
        afterTitle.match(
          /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i
        ) ||
        afterTitle.match(
          /<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i
        );

      if (snippetMatch) {

        snippet =
          cleanHtml(snippetMatch[1]);
      }

      if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
      ) {
        continue;
      }

      results.push({
        title,
        url,
        snippet
      });
    }

    return res.status(200).json({

      success: true,

      query: q,

      count: results.length,

      results

    });

  } catch(error) {

    console.error("SEARCH ERROR:", error);

    return res.status(500).json({

      success: false,

      error:
        error?.message ||
        "Internet search failed",

      results: []

    });
  }
}


function decodeDuckDuckGoUrl(url) {

  try {

    if (
      url.includes("duckduckgo.com/l/?") ||
      url.includes("uddg=")
    ) {

      const parsed =
        new URL(
          url,
          "https://duckduckgo.com"
        );

      const target =
        parsed.searchParams.get("uddg");

      if (target) {
        return decodeURIComponent(target);
      }
    }

  } catch(error) {}

  return decodeHtmlEntities(url);
}


function cleanHtml(value) {

  return decodeHtmlEntities(

    String(value || "")

      .replace(/<br\s*\/?>/gi, " ")

      .replace(/<[^>]+>/g, "")

      .replace(/\s+/g, " ")

      .trim()
  );
}


function decodeHtmlEntities(value) {

  return String(value || "")

    .replace(/&amp;/g, "&")

    .replace(/&quot;/g, '"')

    .replace(/&#39;/g, "'")

    .replace(/&#x27;/gi, "'")

    .replace(/&lt;/g, "<")

    .replace(/&gt;/g, ">")

    .replace(/&nbsp;/g, " ")

    .replace(/&#(\d+);/g, function(_, code) {

      return String.fromCharCode(
        Number(code)
      );

    });
}