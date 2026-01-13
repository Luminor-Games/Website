import path from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import Parser from "rss-parser";

const app = Fastify({ logger: true });
const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:description", "mediaDescription", { keepArray: true }],
    ],
  },
});

// === ТУТ НАСТРОЙ СВОИ ССЫЛКИ ===
const FEED_PAGES = {
  news: [
    "https://social.luminor.games/@news.rss",
  ],
  gallery: [
    "https://social.luminor.games/tags/галерея.rss",
  ],
};

const PORT = Number(process.env.API_PORT || 3101);
const TTL_MS = Number(process.env.FEEDS_TTL_MS || 1_200_000); // 20 минут
const LIMIT = Number(process.env.FEEDS_LIMIT || 20);

const cache = new Map();

function normalizeMedia(item) {
  const arr = item.mediaContent ?? [];
  // rss-parser обычно кладёт атрибуты в obj.$ (как в xml2js)
  return arr
    .map((m) => {
      const a = m?.$ ?? {};
      // media:description может быть вложенным
      const desc =
        m?.["media:description"]?.[0]?._ ??
        m?.["media:description"]?._ ??
        m?.["media:description"] ??
        m?.mediaDescription?.[0]?._ ??
        m?.mediaDescription?._ ??
        "";

      return {
        url: a.url || "",
        type: a.type || "",
        fileSize: a.fileSize ? Number(a.fileSize) : null,
        medium: a.medium || "",
        description: typeof desc === "string" ? desc : "",
      };
    })
    .filter((x) => x.url);
}

function normalizeItem(item) {
  return {
    title: item.title ?? "",
    link: item.link ?? "",
    pubDate: item.isoDate ?? item.pubDate ?? "",
    author: item.creator ?? item.author ?? "",
    contentSnippet: item.contentSnippet ?? "",
    content: item.content ?? "",
    media: normalizeMedia(item),
  };
}

// API: /api/feeds/:page
app.get("/api/feeds/:page", async (req, reply) => {
  const { page } = req.params;

  const urls = FEED_PAGES[page];
  if (!urls) return reply.code(404).send({ error: "Unknown feed page" });

  const key = `page:${page}`;
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && now - cached.ts < TTL_MS) {
    reply.header("Cache-Control", "public, max-age=30");
    return cached.data;
  }

  const feeds = await Promise.all(
    urls.map(async (url) => {
      try {
        const feed = await parser.parseURL(encodeURI(url));
        return {
          url,
          title: feed.title ?? url,
          items: (feed.items ?? []).slice(0, LIMIT).map(normalizeItem),
        };
      } catch (e) {
        return { url, title: url, error: String(e), items: [] };
      }
    })
  );

  const data = { generatedAt: new Date().toISOString(), feeds };
  cache.set(key, { ts: now, data });

  reply.header("Cache-Control", "public, max-age=30");
  return data;
});

// Статика: build/
const siteDir = path.join(process.cwd(), "build");
app.register(fastifyStatic, { root: siteDir, prefix: "/" });

// SPA fallback (кроме /api)
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url.startsWith("/api/")) {
    reply.code(404).send({ error: "Not found" });
    return;
  }
  reply.sendFile("index.html");
});

app.listen({ host: "0.0.0.0", port: PORT });
