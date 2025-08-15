# Docling + OpenAI + pgvector demo

Mini pipeline:
1) Convierte PDFs/DOCX/etc. con Docling (API `/v1`).
2) Chunking simple por encabezados Markdown.
3) Embeddings con OpenAI (text-embedding-3-small, 1536 dims).
4) Upsert a Postgres/pgvector.
5) Búsqueda semántica y PDF resumen.

## Requisitos
- Docker o Python con `docling-serve` corriendo en http://localhost:5001
- Postgres con extensión `vector` habilitada
- Node 18+
- OPENAI_API_KEY válido

## Uso

# instala deps
npm i

# ingesta (convierte + chunk + embed + upsert)
# El proceso elimina líneas vacías y puntos en consola, mostrando solo contenido relevante del documento.
npm run dev:ingest

# búsqueda semántica
npm run dev:search -- "mi consulta"

# PDF resumen
npm run dev:report
```
