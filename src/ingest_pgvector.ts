import 'dotenv/config';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Docling } from 'docling-sdk';
import OpenAI from 'openai';
import { Client } from 'pg';

const DOCLING_BASE = process.env.DOCLING_BASE || 'http://localhost:5001';
const OPENAI_EMBED_MODEL = process.env.MODEL_EMBEDDING || 'text-embedding-3-small';
const DATA_DIR = process.env.DATA_DIR || './docs';

const pgClient = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'ragEmpresarial',
});

function chunkMarkdown(md: string) {
  const sections = md.split(/\n(?=#+\s)/g).map(s => s.trim()).filter(Boolean);
  const CH_MAX = 1800;
  const chunks: { id: string; text: string }[] = [];
  let idx = 0;

  for (const sec of sections) {
    if (sec.length <= CH_MAX) chunks.push({ id: `sec_${idx++}`, text: sec });
    else {
      const paras = sec.split(/\n{2,}/g);
      let buf = '';
      for (const p of paras) {
        const next = buf ? buf + '\n\n' + p : p;
        if (next.length > CH_MAX) { if (buf.trim()) chunks.push({ id: `sec_${idx++}`, text: buf.trim() }); buf = p; }
        else buf = next;
      }
      if (buf.trim()) chunks.push({ id: `sec_${idx++}`, text: buf.trim() });
    }
  }
  return chunks.filter(c => c.text.split(/\s+/).length > 20);
}

async function convertWithDocling(filePath: string) {
  const client = new Docling({ api: { baseUrl: DOCLING_BASE, timeout: 120_000 } });
  const bin = await readFile(filePath);
  const res = await client.convertFile({ files: bin, filename: path.basename(filePath), to_formats: ['json','md'] });
  return res.document;
}

async function embedBatch(texts: string[]) {
  const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await oai.embeddings.create({ model: OPENAI_EMBED_MODEL, input: texts });
  return r.data.map(d => d.embedding);
}

async function upsertChunks(docId: string, chunks: { id: string; text: string }[], embs: number[][]) {
  await pgClient.query('BEGIN');
  const q = `
    INSERT INTO rag_chunks (doc_id, chunk_id, content, metadata, embedding)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (doc_id, chunk_id) DO UPDATE
      SET content = EXCLUDED.content, metadata = EXCLUDED.metadata, embedding = EXCLUDED.embedding
  `;
  for (let i = 0; i < chunks.length; i++) {
    await pgClient.query(q, [docId, chunks[i].id, chunks[i].text, {}, embs[i]]);
  }
  await pgClient.query('COMMIT');
}

async function main() {
  await pgClient.connect();
  await mkdir(DATA_DIR, { recursive: true });

  const files = (await readdir(DATA_DIR)).filter(f => /\.(pdf|docx|pptx|png|jpg|jpeg)$/i.test(f));
  if (files.length === 0) {
    console.log(`Coloca documentos en ${DATA_DIR} y vuelve a ejecutar.`);
    await pgClient.end();
    return;
  }

  for (const f of files) {
  const full = path.join(DATA_DIR, f);
  console.log('> Procesando', f);
  const doc = await convertWithDocling(full);
  let md = doc?.md_content || '';
    md = md
      .split('\n')
      .filter((line: string) => line.match(/[!-~¡-ÿ]/))
      .join('\n');

  if (!md) { console.warn('  (sin Markdown)'); continue; }
  console.log(md);

    const chunks = chunkMarkdown(md);
    //const embs = await embedBatch(chunks.map(c => c.text));
    //console.log( "chunks:", chunks);
    // await upsertChunks(f, chunks, embs);
    // console.log(`  OK: ${chunks.length} chunks → pgvector`);
  }
  await pgClient.end();
}

main().catch(e => { console.error(e); process.exit(1); });
