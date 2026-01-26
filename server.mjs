import path from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import Parser from "rss-parser";
import mysql from "mysql2/promise";

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
const DATABASE_URL = process.env.DATABASE_URL || "";

const cache = new Map();
let pool;

function getPool() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!pool) {
    pool = mysql.createPool({
      uri: DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

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

const PUNISHMENT_TABLES = {
  ban: "litebans_bans",
  mute: "litebans_mutes",
  warn: "litebans_warnings",
  kick: "litebans_kicks",
};

app.get("/api/warn", async (req, reply) => {
  try {
    const {
      type = "",
      player = "",
      staff = "",
      search = "",
      sort = "date",
      order = "desc",
      page = "1",
      limit = "25",
    } = req.query ?? {};

    const safeType = typeof type === "string" ? type.toLowerCase() : "";
    const selectedTypes = safeType && PUNISHMENT_TABLES[safeType]
      ? [safeType]
      : Object.keys(PUNISHMENT_TABLES);

    if (selectedTypes.length === 0) {
      return reply.code(400).send({ error: "Unknown punishment type" });
    }

    const historyJoin = `
      LEFT JOIN (
        SELECT h.uuid, h.name
        FROM litebans_history h
        JOIN (
          SELECT uuid, MAX(date) AS max_date
          FROM litebans_history
          GROUP BY uuid
        ) last
        ON h.uuid = last.uuid AND h.date = last.max_date
      ) h
      ON h.uuid = p.uuid
    `;

    const unionParts = selectedTypes.map(
      (t) =>
        `SELECT '${t}' AS type,
          COALESCE(h.name, p.uuid) AS player,
          p.uuid AS player_uuid,
          h.name AS player_name,
          p.banned_by_name AS staff,
          p.reason,
          p.time,
          p.until
        FROM ${PUNISHMENT_TABLES[t]} p
        ${historyJoin}`
    );

    const filters = [];
    const params = [];

    if (typeof player === "string" && player.trim()) {
      filters.push("(t.player LIKE ? OR t.player_uuid LIKE ?)");
      params.push(`%${player.trim()}%`, `%${player.trim()}%`);
    }
    if (typeof staff === "string" && staff.trim()) {
      filters.push("t.staff LIKE ?");
      params.push(`%${staff.trim()}%`);
    }
    if (typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      filters.push(
        "(t.player LIKE ? OR t.player_uuid LIKE ? OR t.staff LIKE ? OR t.reason LIKE ?)"
      );
      params.push(q, q, q, q);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const sortMap = {
      type: "t.type",
      player: "t.player",
      staff: "t.staff",
      date: "t.time",
    };
    const orderBy = sortMap[sort] || sortMap.date;
    const orderDir = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";

    const safeLimit = Math.min(Math.max(Number(limit) || 25, 5), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const baseSql = unionParts.join(" UNION ALL ");
    const countSql = `SELECT COUNT(*) AS total FROM (${baseSql}) AS t ${whereSql}`;
    const dataSql = `SELECT * FROM (${baseSql}) AS t ${whereSql} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`;

    const db = getPool();
    const [[countRow]] = await db.query(countSql, params);
    const [rows] = await db.query(dataSql, [...params, safeLimit, offset]);
    const countQueries = Object.entries(PUNISHMENT_TABLES).map(([key, table]) =>
      db.query(`SELECT COUNT(*) AS total FROM ${table}`).then(([rows]) => [
        key,
        rows?.[0]?.total ?? 0,
      ])
    );
    const countsEntries = await Promise.all(countQueries);
    const counts = countsEntries.reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        acc.total += value;
        return acc;
      },
      { ban: 0, mute: 0, warn: 0, kick: 0, total: 0 }
    );

    return {
      page: safePage,
      limit: safeLimit,
      total: countRow?.total ?? 0,
      counts,
      items: rows,
    };
  } catch (e) {
    reply.code(500).send({ error: String(e) });
  }
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
