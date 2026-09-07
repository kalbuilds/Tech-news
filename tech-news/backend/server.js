import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const DEVTO_API_KEY = process.env.DEVTO_API_KEY;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      
      if (!origin) return callback(null, true);   
      const isAllowed = allowedOrigins.some((allowed) =>
        origin.startsWith(allowed.replace(/\/$/, ""))
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ["GET"],
  })
);

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

async function fetchFromNewsApi() {
  if (!NEWS_API_KEY) return [];

  const url = `https://newsapi.org/v2/top-headlines?category=technology&language=en&pageSize=50&apiKey=${NEWS_API_KEY}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "TechNewsApp/1.0" },
  });
  
  const data = await response.json();

  if (data.status !== "ok") {
    throw new Error(`NewsAPI: ${data.message || "request failed"}`);
  }

  return (data.articles || []).map((a) => ({
    title: a.title,
    description: a.description,
    url: a.url,
    urlToImage: a.urlToImage,
    publishedAt: a.publishedAt,
    source: { name: a.source?.name || "NewsAPI" },
  }));
}

async function fetchFromDevTo() {
  const headers = DEVTO_API_KEY ? { "api-key": DEVTO_API_KEY } : {};
  const url = `https://dev.to/api/articles?tag=programming&top=7&per_page=30`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Dev.to: request failed (${response.status})`);
  }

  const data = await response.json();

  return (data || []).map((a) => ({
    title: a.title,
    description: a.description,
    url: a.url,
    urlToImage: a.cover_image || a.social_image,
    publishedAt: a.published_at,
    source: { name: `Dev.to · ${a.user?.name || "community"}` },
  }));
}

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/tech-news", async (req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.timestamp < CACHE_DURATION_MS) {
      return res.json(cache.data);
    }

    const [devToResult, newsApiResult] = await Promise.allSettled([
      fetchFromDevTo(),
      fetchFromNewsApi(),
    ]);

    const failures = [devToResult, newsApiResult]
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason?.message || "Unknown error");

    const devToArticles =
      devToResult.status === "fulfilled" ? devToResult.value : [];
    const newsApiArticles =
      newsApiResult.status === "fulfilled" ? newsApiResult.value : [];
    const articles = [...devToArticles, ...newsApiArticles];

    if (articles.length === 0) {
      return res.status(502).json({
        error: failures.join(" | ") || "No articles returned from any provider",
      });
    }

    const normalized = {
      articles,
      warnings: failures.length ? failures : undefined,
    };

    cache = { data: normalized, timestamp: now };
    res.json(normalized);
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Server error fetching news" });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Backend running locally on port ${PORT}`);
  });
}

export default app;