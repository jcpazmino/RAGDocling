# Manual de ingest_pgvector.ts

Este manual explica el funcionamiento general y detallado del archivo `src/ingest_pgvector.ts` del proyecto RAGDocling.

## Propósito

Este script realiza la ingesta de documentos (PDF, DOCX, imágenes, etc.) en un pipeline de RAG (Retrieval Augmented Generation) usando Docling, OpenAI y PostgreSQL con la extensión pgvector. El objetivo es convertir documentos en chunks semánticos, generar embeddings y almacenarlos para búsquedas inteligentes.

## Flujo General

1. **Conexión a PostgreSQL**: Se configura y conecta el cliente de Postgres usando variables de entorno.
2. **Preparación de directorio**: Se asegura que el directorio de documentos (`DATA_DIR`) exista.
3. **Lectura de archivos**: Se listan los archivos soportados en el directorio de datos.
4. **Conversión con Docling**: Cada archivo se convierte a Markdown y JSON usando la API de Docling.
5. **Limpieza de Markdown**: El Markdown generado se limpia para eliminar líneas vacías y caracteres invisibles, evitando puntos en consola.
6. **Chunking**: El Markdown se divide en secciones/chunks por encabezados y párrafos, asegurando que cada chunk tenga suficiente contenido.
7. **Embeddings**: (opcional, comentado) Se generan embeddings con OpenAI para cada chunk.
8. **Upsert en Postgres**: (opcional, comentado) Se almacenan los chunks y embeddings en la base de datos usando pgvector.
9. **Cierre de conexión**: Se cierra la conexión a la base de datos.

## Detalle de Funciones

### chunkMarkdown(md: string)
- Divide el Markdown en secciones por encabezados.
- Si una sección es muy larga, la subdivide por párrafos.
- Filtra chunks con menos de 20 palabras.

### convertWithDocling(filePath: string)
- Usa la API de Docling para convertir el archivo a Markdown y JSON.
- Devuelve el documento convertido.

### embedBatch(texts: string[])
- Genera embeddings para un lote de textos usando OpenAI.
- Devuelve los vectores de embedding.

### upsertChunks(docId, chunks, embs)
- Inserta o actualiza los chunks y embeddings en la tabla `rag_chunks` de Postgres.
- Usa transacciones para asegurar la integridad.

### main()
- Orquesta todo el proceso: conexión, lectura, conversión, limpieza, chunking, embeddings y upsert.
- Muestra el Markdown limpio en consola.
- Cierra la conexión al finalizar.

## Limpieza de Markdown

El script elimina cualquier línea que no contenga al menos un carácter imprimible, evitando que la consola muestre puntos por líneas vacías o invisibles.

```typescript
md = md
  .split('\n')
  .filter((line: string) => line.match(/[!-~¡-ÿ]/))
  .join('\n');
```

## Requisitos
- Docling corriendo en http://localhost:5001
- PostgreSQL con extensión pgvector
- Node.js 18+
- API Key de OpenAI

## Ejecución

```bash
npm run dev:ingest
```

Coloca tus documentos en el directorio configurado (`DATA_DIR`, por defecto `./docs`) y ejecuta el comando para iniciar la ingesta.

---

Para dudas o mejoras, consulta el README principal o contacta al autor del proyecto.
