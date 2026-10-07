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

    const url =
      "https://api.duckduckgo.com/?q=" +
      encodeURIComponent(q) +
      "&format=json" +
      "&no_html=1" +
      "&skip_disambig=1";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "AfghanAI/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(
        "DuckDuckGo returned HTTP " + response.status
      );
    }

    const data = await response.json();

    const results = [];

    // نتیجه اصلی
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || q,
        url: data.AbstractURL,
        snippet: data.AbstractText
      });
    }

    // نتایج مرتبط
    function collectTopics(topics) {
      if (!Array.isArray(topics)) return;

      for (const item of topics) {
        if (results.length >= 8) break;

        if (item.Topics) {
          collectTopics(item.Topics);
          continue;
        }

        if (item.Text && item.FirstURL) {
          results.push({
            title: item.Text.split(" - ")[0] || q,
            url: item.FirstURL,
            snippet: item.Text
          });
        }
      }
    }

    collectTopics(data.RelatedTopics);

    // حذف URLهای تکراری
    const unique = [];
    const seen = new Set();

    for (const item of results) {
      if (!item.url || seen.has(item.url)) continue;

      seen.add(item.url);
      unique.push(item);
    }

    return res.status(200).json({
      success: true,
      query: q,
      count: unique.length,
      results: unique.slice(0, 8)
    });

  } catch (error) {
    console.error("SEARCH ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Search failed",
      results: []
    });
  }
}