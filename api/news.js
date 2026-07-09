function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function cleanText(s = "") {
  return String(s)
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArticle(a) {
  let source = a.source?.name || a.source || "";
  try {
    if (!source && a.url) source = new URL(a.url).hostname.replace(/^www\./, "");
  } catch {}
  return {
    title: cleanText(a.title || ""),
    description: cleanText(a.description || a.content || ""),
    content: cleanText(a.content || a.description || ""),
    url: a.url || "",
    image: a.image || a.urlToImage || "",
    source: cleanText(source),
    publishedAt: a.publishedAt || a.published_at || a.published_date || ""
  };
}

function dedupeArticles(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles.map(cleanArticle)) {
    const key = (a.url || a.title || "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    if (!a.title || a.title.length < 8) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function buildQueries(query) {
  const base = query && query.trim() ? query.trim() : "immobilier France";
  return [
    base,
    `${base} actualité immobilier logement crédit DPE France`,
    `immobilier OR logement OR "crédit immobilier" OR DPE France`,
    `"marché immobilier" OR "taux immobilier" OR "prix immobilier" France`
  ];
}

async function withTimeout(promise, ms, label) {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error(`${label} : délai dépassé après ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(id);
  }
}

async function tryGNews(query, limit, diagnostics) {
  if (!process.env.GNEWS_API_KEY) throw new Error("GNEWS_API_KEY absente");
  const max = Math.min(Math.max(limit || 12, 1), 20);
  const from = daysAgoISO(3);
  const to = todayISO();

  let all = [];
  for (const q0 of buildQueries(query).slice(0, 2)) {
    const q = encodeURIComponent(q0);
    const url = `https://gnews.io/api/v4/search?q=${q}&lang=fr&country=fr&max=${max}&from=${from}&to=${to}&sortby=publishedAt&apikey=${process.env.GNEWS_API_KEY}`;
    const response = await withTimeout(fetch(url), 12000, "GNews");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`GNews ${response.status} : ${data?.errors?.[0] || data?.message || "erreur API"}`);
    all.push(...(data.articles || []).map(cleanArticle));
    if (dedupeArticles(all).length >= Math.min(8, max)) break;
  }

  const articles = dedupeArticles(all).slice(0, max);
  diagnostics.push(`GNews OK : ${articles.length} article(s), période ${from} → ${to}`);
  if (!articles.length) throw new Error("GNews : aucun article trouvé");
  return { provider: "GNews", articles, diagnostics };
}

async function tryNewsAPI(query, limit, diagnostics) {
  if (!process.env.NEWS_API_KEY) throw new Error("NEWS_API_KEY absente");
  const pageSize = Math.min(Math.max(limit || 12, 1), 100);
  const from = daysAgoISO(3);

  let all = [];
  for (const q0 of buildQueries(query).slice(0, 2)) {
    const q = encodeURIComponent(q0);
    const url = `https://newsapi.org/v2/everything?q=${q}&language=fr&from=${from}&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await withTimeout(fetch(url), 12000, "NewsAPI");
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === "error") throw new Error(`NewsAPI ${response.status} : ${data?.message || data?.code || "erreur API"}`);
    all.push(...(data.articles || []).map(cleanArticle));
    if (dedupeArticles(all).length >= Math.min(8, pageSize)) break;
  }

  const articles = dedupeArticles(all).slice(0, pageSize);
  diagnostics.push(`NewsAPI OK : ${articles.length} article(s), depuis ${from}`);
  if (!articles.length) throw new Error("NewsAPI : aucun article trouvé");
  return { provider: "NewsAPI", articles, diagnostics };
}

async function tryTavily(query, limit, diagnostics) {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY absente");
  const response = await withTimeout(fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: `${query} actualité aujourd'hui France immobilier logement crédit taux DPE`,
      topic: "news",
      search_depth: "advanced",
      max_results: Math.min(Math.max(limit || 12, 1), 20),
      include_answer: false,
      include_raw_content: false
    })
  }), 12000, "Tavily");

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Tavily ${response.status} : ${data?.error || data?.message || "erreur API"}`);

  const articles = dedupeArticles((data.results || []).map(r => cleanArticle({
    title: r.title,
    description: r.content,
    content: r.content,
    url: r.url,
    source: r.url ? new URL(r.url).hostname.replace(/^www\./, "") : "Tavily",
    publishedAt: r.published_date || ""
  }))).slice(0, limit);

  diagnostics.push(`Tavily OK : ${articles.length} résultat(s)`);
  if (!articles.length) throw new Error("Tavily : aucun résultat trouvé");
  return { provider: "Tavily", articles, diagnostics };
}

function parseGoogleNewsRSS(xml, limit) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
  const articles = items.map(item => {
    const title = cleanText((item.match(/<title>([\s\S]*?)<\/title>/) || [,""])[1]);
    const linkRaw = cleanText((item.match(/<link>([\s\S]*?)<\/link>/) || [,""])[1]);
    const desc = cleanText((item.match(/<description>([\s\S]*?)<\/description>/) || [,""])[1]);
    const pubDate = cleanText((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [,""])[1]);
    const source = cleanText((item.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [,"Google News"])[1]);
    return {
      title,
      description: desc,
      content: desc,
      url: linkRaw,
      source,
      publishedAt: pubDate
    };
  });
  return dedupeArticles(articles).slice(0, limit);
}

async function tryGoogleNewsRSS(query, limit, diagnostics) {
  const max = Math.min(Math.max(limit || 12, 1), 30);
  const all = [];

  for (const q0 of buildQueries(query).slice(0, 3)) {
    const q = encodeURIComponent(`${q0} when:3d`);
    const url = `https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`;
    const response = await withTimeout(fetch(url, {
      headers: { "User-Agent": "SmartTools-LAdresse/1.0" }
    }), 12000, "Google News RSS");
    const xml = await response.text();
    if (!response.ok) throw new Error(`Google News RSS ${response.status}`);
    all.push(...parseGoogleNewsRSS(xml, max));
    if (dedupeArticles(all).length >= Math.min(8, max)) break;
  }

  const articles = dedupeArticles(all).slice(0, max);
  diagnostics.push(`Google News RSS OK : ${articles.length} article(s), secours sans clé`);
  if (!articles.length) throw new Error("Google News RSS : aucun article trouvé");
  return { provider: "Google News RSS", articles, diagnostics };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      message: "SmartNews API active. Utilisez POST avec { query, limit }.",
      env: {
        GNEWS_API_KEY: Boolean(process.env.GNEWS_API_KEY),
        NEWS_API_KEY: Boolean(process.env.NEWS_API_KEY),
        TAVILY_API_KEY: Boolean(process.env.TAVILY_API_KEY)
      }
    });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const { query = "immobilier France", limit = 12 } = req.body || {};
  const diagnostics = [];

  for (const fn of [tryGNews, tryNewsAPI, tryTavily, tryGoogleNewsRSS]) {
    try {
      return res.status(200).json(await fn(query, limit, diagnostics));
    } catch (error) {
      diagnostics.push(error.message);
    }
  }

  return res.status(503).json({
    error: "Aucune source SmartNews disponible.",
    diagnostics
  });
}
