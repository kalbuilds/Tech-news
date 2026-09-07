# Tech News App

A simple tech news reader: Node/Express backend + React (Vite) frontend, powered by [NewsAPI](https://newsapi.org).

## 1. Get a free NewsAPI key
Sign up at https://newsapi.org/register — free tier works fine for this.

## 2. Backend setup
```bash
cd backend
cp .env.example .env
# edit .env and paste your NEWS_API_KEY
npm install
npm run dev
```
Backend runs on http://localhost:5000

## 3. Frontend setup (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173 and proxies `/api` requests to the backend.

## Notes
- Free NewsAPI tier only allows `localhost` requests (not deployed domains) — fine for local dev, but for production you'd typically proxy through your own backend (already set up here) and consider a paid plan.
- News is cached server-side for 10 minutes to stay within API rate limits.
- To change category (e.g. business, science), edit `category=technology` in `backend/server.js`.

## Next steps you might want
- Add a search/filter bar
- Add pagination ("load more")
- Deploy backend (Render/Railway) + frontend (Vercel/Netlify)
