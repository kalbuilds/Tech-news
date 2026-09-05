import { useEffect, useMemo, useState } from "react";
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || "";

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function sourceGroup(sourceName = "") {
  if (sourceName.startsWith("Dev.to")) return "Dev.to";
  return "NewsAPI";
}

const BOOKMARKS_KEY = "tech-news-bookmarks";

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || [];
  } catch {
    return [];
  }
}

export default function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState(loadBookmarks);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [tick, setTick] = useState(0); 

  function loadNews() {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/tech-news`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setArticles(data.articles || []);
        setWarnings(data.warnings || []);
        setLastUpdated(Date.now());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadNews, []);

  // Re-render every 30s so "updated Xm ago" stays accurate without refetching
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  function toggleBookmark(url) {
    setBookmarks((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  }

  const availableSources = useMemo(() => {
    const groups = new Set(articles.map((a) => sourceGroup(a.source?.name)));
    return ["All", ...groups];
  }, [articles]);

  const visibleArticles = useMemo(() => {
    let list = [...articles];

    if (sourceFilter !== "All") {
      list = list.filter((a) => sourceGroup(a.source?.name) === sourceFilter);
    }

    if (showBookmarkedOnly) {
      list = list.filter((a) => bookmarks.includes(a.url));
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      const diff = new Date(b.publishedAt) - new Date(a.publishedAt);
      return sortOrder === "newest" ? diff : -diff;
    });

    return list;
  }, [articles, sourceFilter, query, sortOrder, showBookmarkedOnly, bookmarks]);

  return (
    <div className="app">
      <header>
        <h1 className="glow-title">⚡ Tech News</h1>
        <p>Latest headlines from around the tech world</p>

        <div className="header-meta">
          <span className="live-badge">
            <span className="live-dot" />
            Live
          </span>

          <span className="stat">
            {articles.length} article{articles.length === 1 ? "" : "s"}
          </span>

          {lastUpdated && (
            <span className="stat" key={tick}>
              updated {timeAgo(new Date(lastUpdated).toISOString())}
            </span>
          )}

          <button
            className={`refresh-btn ${loading ? "spinning" : ""}`}
            onClick={loadNews}
            disabled={loading}
          >
            <span className="refresh-icon">🔄</span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <div className="controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search headlines..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="filter-row">
          {availableSources.map((s) => (
            <button
              key={s}
              className={`chip ${sourceFilter === s ? "active" : ""}`}
              onClick={() => setSourceFilter(s)}
            >
              {s}
            </button>
          ))}

          <button
            className={`chip ${showBookmarkedOnly ? "active" : ""}`}
            onClick={() => setShowBookmarkedOnly((v) => !v)}
          >
            ★ Saved ({bookmarks.length})
          </button>

          <select
            className="sort-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {loading && <p className="status">Loading news...</p>}
      {error && (
        <p className="status error">
          Couldn't load news: {error}
          <br />
          Make sure the backend is running and your API keys are set.
        </p>
      )}
      {!loading && !error && warnings.length > 0 && (
        <p className="status warning">
          Some sources had issues: {warnings.join(" | ")}
        </p>
      )}
      {!loading && !error && visibleArticles.length === 0 && (
        <p className="status">No articles match your filters.</p>
      )}

      <div className="grid">
        {visibleArticles.map((article, i) => (
          <div key={article.url || i} className="card">
            <button
              className={`bookmark-btn ${bookmarks.includes(article.url) ? "saved" : ""}`}
              onClick={() => toggleBookmark(article.url)}
              aria-label="Toggle bookmark"
            >
              {bookmarks.includes(article.url) ? "★" : "☆"}
            </button>

            <a href={article.url} target="_blank" rel="noopener noreferrer">
              {article.urlToImage && (
                <img
                  src={article.urlToImage}
                  alt=""
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
              <div className="card-body">
                <span className="source">{article.source?.name}</span>
                <h2>{article.title}</h2>
                <p>{article.description}</p>
                <span className="time">{timeAgo(article.publishedAt)}</span>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
