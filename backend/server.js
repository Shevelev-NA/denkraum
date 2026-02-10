/**
 * Denkraum – Pronunciation backend (v1)
 * Node.js + Express
 *
 * Делает:
 * - принимает запрос /search?q=WORD&page=N
 * - ищет видео (заглушка)
 * - возвращает 20 результатов
 *
 * Реальные субтитры подключаются ПОЗЖЕ в ЭТОТ ЖЕ файл
 */

import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/**
 * GET /search
 * q     – слово или фраза
 * page  – номер страницы (1,2,3…)
 */
app.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  const page = parseInt(req.query.page || "1", 10);

  if (!q) {
    return res.status(400).json({ error: "Missing query" });
  }

  const results = mockSearch(q, page);

  res.json({
    query: q,
    page,
    count: results.length,
    results
  });
});

/* ================= MOCK SEARCH ================= */
/* Это временно. UI уже будет работать через backend. */

function mockSearch(q, page) {
  const base = (page - 1) * 20;

  return Array.from({ length: 20 }).map((_, i) => ({
    videoId: "dQw4w9WgXcQ",
    start: 30 + i * 3,
    title: `Example video ${base + i + 1}`,
    text: `This is a real-life sentence where the word ${q} is spoken naturally.`
  }));
}

/* ================= START ================= */

app.listen(PORT, () => {
  console.log(`Denkraum backend running on http://localhost:${PORT}`);
});
