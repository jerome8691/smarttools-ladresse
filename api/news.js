function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function cleanArticle(a) {
  return {
    title: a.title || "",
    description: a.description || a.content || "",
    content: a.content || a.description || "",
    url: a.url || "",
    image: a.image || a.urlToImage || "",
    source: a.source?.name || a.source || "",
    publishedAt: a.publishedAt || a.published_at || a.published_date || ""
  };
}

function dedupeArticles(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    const key = (a.url || a.title || "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

async function tryGNews(query, limit) {
  if (!process.env.GNEWS_API_KEY) throw new Error("GNEWS_API_KEY absente");
  const q = encodeURIComponent(query);
  const max = Math.min(Math.max(limit || 12, 1), 20);
  const from = daysAgoISO(1);
  const to = todayISO();
  const url = `https://gnews.io/api/v4/search?q=${q}&lang=fr&country=fr&max=${max}&from=${from}&to=${to}&sortby=publishedAt&apikey=${process.env.GNEWS_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GNews ${response.status} : ${data?.errors?.[0] || data?.message || "erreur API"}`);

  const articles = dedupeArticles((data.articles || []).map(cleanArticle));
  if (!articles.length) throw new Error("GNews : aucun article trouvé");
  return { provider: "GNews", articles };
}

async function tryNewsAPI(query, limit) {
  if (!process.env.NEWS_API_KEY) throw new Error("NEWS_API_KEY absente");
  const q = encodeURIComponent(query);
  const pageSize = Math.min(Math.max(limit || 12, 1), 100);
  const from = daysAgoISO(1);
  const url = `https://newsapi.org/v2/everything?q=${q}&language=fr&from=${from}&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${process.env.NEWS_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === "error") throw new Error(`NewsAPI ${response.status} : ${data?.message || data?.code || "erreur API"}`);

  const articles = dedupeArticles((data.articles || []).map(cleanArticle));
  if (!articles.length) throw new Error("NewsAPI : aucun article trouvé");
  return { provider: "NewsAPI", articles };
}

async function tryTavily(query, limit) {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY absente");
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: `${query} actualité aujourd'hui France immobilier`,
      topic: "news",
      search_depth: "advanced",
      max_results: Math.min(Math.max(limit || 12, 1), 20),
      include_answer: false,
      include_raw_content: false
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Tavily ${response.status} : ${data?.error || data?.message || "erreur API"}`);

  const articles = dedupeArticles((data.results || []).map(r => cleanArticle({
    title: r.title,
    description: r.content,
    content: r.content,
    url: r.url,
    source: r.url ? new URL(r.url).hostname.replace(/^www\./, "") : "Tavily",
    publishedAt: r.published_date || ""
  })));
  if (!articles.length) throw new Error("Tavily : aucun résultat trouvé");
  return { provider: "Tavily", articles };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const { query = "immobilier France", limit = 12 } = req.body || {};
  const errors = [];

  for (const fn of [tryGNews, tryNewsAPI, tryTavily]) {
    try {
      const result = await fn(query, limit);
      return res.status(200).json(result);
    } catch (error) {
      errors.push(error.message);
    }
  }

  return res.status(503).json({
    error: "Aucune API de recherche/news disponible. Ajoutez GNEWS_API_KEY, NEWS_API_KEY ou TAVILY_API_KEY dans Vercel, puis redéployez.",
    details: errors
  });
}
