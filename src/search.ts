import 'dotenv/config';
import { Client } from 'pg';
import OpenAI from 'openai';

const OPENAI_EMBED_MODEL = process.env.MODEL_EMBEDDING || 'text-embedding-3-small';

async function main() {
  const queryText = process.argv.slice(2).join(' ') || 'demo query';
  const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const e = await oai.embeddings.create({ model: OPENAI_EMBED_MODEL, input: queryText });
  const vec = e.data[0].embedding;

  const pgClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_NAME || 'ragEmpresarial',
  });
  await pgClient.connect();

  const sql = `
    SELECT doc_id, chunk_id, content, embedding <=> $1 AS distance
    FROM rag_chunks
    ORDER BY embedding <=> $1
    LIMIT 5
  `;
  const { rows } = await pgClient.query(sql, [vec]);
  for (const r of rows) {
    console.log(`\n[${r.doc_id}] (${r.distance.toFixed(4)})\n${r.content.slice(0, 300)}...`);
  }
  await pgClient.end();
}

main().catch(e => { console.error(e); process.exit(1); });
