import 'dotenv/config';
import { Client } from 'pg';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';

async function main() {
  const pgClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_NAME || 'ragEmpresarial',
  });
  await pgClient.connect();

  const { rows } = await pgClient.query(`
    SELECT doc_id, count(*) AS chunks
    FROM rag_chunks
    GROUP BY doc_id
    ORDER BY doc_id
  `);

  const out = 'resumen_ingesta.pdf';
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(createWriteStream(out));

  doc.fontSize(18).text('Resumen de ingesta RAG', { underline: true });
  doc.moveDown();

  for (const r of rows) {
    doc.fontSize(14).text(`• ${r.doc_id}  —  ${r.chunks} chunks`);
    const preview = await pgClient.query(
      `SELECT content FROM rag_chunks WHERE doc_id = $1 LIMIT 1`,
      [r.doc_id]
    );
    const snippet = (preview.rows[0]?.content || '').slice(0, 240).replace(/\s+/g,' ');
    if (snippet) doc.fontSize(10).text(`   ${snippet}…`);
    doc.moveDown(0.5);
  }
  doc.end();
  await pgClient.end();
  console.log('PDF generado:', out);
}

main().catch(e => { console.error(e); process.exit(1); });
