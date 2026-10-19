import { error, json, readBody } from './http';
import type { User } from './auth';

/**
 * One saved snapshot per account, versioned so two devices can't silently overwrite
 * each other: a write must name the version it was based on, or it gets 409.
 *
 *   GET    /api/data   → { version, updatedAt, data }   (version 0 + null data = nothing saved yet)
 *   PUT    /api/data   ← { baseVersion, data }          → { version, updatedAt }
 */

/** Largest snapshot accepted from the client (uncompressed JSON). */
const MAX_BODY_BYTES = 12 * 1024 * 1024;
/** D1 rows top out around 2 MB; the compressed snapshot must fit. */
const MAX_STORED_BYTES = 1_900_000;

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

const toBytes = (v: unknown): Uint8Array => (v instanceof ArrayBuffer ? new Uint8Array(v) : Uint8Array.from(v as ArrayLike<number>));

export async function getData(env: Env, user: User): Promise<Response> {
  const row = await env.DB.prepare('SELECT version, data, updated_at FROM user_data WHERE user_id = ?1')
    .bind(user.id)
    .first<{ version: number; data: ArrayBuffer | number[]; updated_at: number }>();
  if (!row) return json({ version: 0, updatedAt: null, data: null });
  return new Response(`{"version":${row.version},"updatedAt":${row.updated_at},"data":${await gunzip(toBytes(row.data))}}`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function putData(request: Request, env: Env, user: User): Promise<Response> {
  const text = await readBody(request, MAX_BODY_BYTES);
  if (text === null) return error(413, 'Your saved data is too large to sync.');
  let body: { baseVersion?: unknown; data?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return error(400, 'Invalid JSON.');
  }
  const baseVersion = body.baseVersion;
  if (typeof baseVersion !== 'number' || !Number.isInteger(baseVersion) || baseVersion < 0) return error(400, 'baseVersion is required.');
  if (typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) return error(400, 'data must be an object.');

  const packed = await gzip(JSON.stringify(body.data));
  if (packed.byteLength > MAX_STORED_BYTES) return error(413, 'Your saved data is too large to sync.');
  const now = Date.now();

  // Optimistic concurrency: only write on top of the version the client last saw.
  const result =
    baseVersion === 0
      ? await env.DB.prepare(
          'INSERT INTO user_data (user_id, version, data, size, updated_at) VALUES (?1, 1, ?2, ?3, ?4) ON CONFLICT (user_id) DO NOTHING',
        )
          .bind(user.id, packed, packed.byteLength, now)
          .run()
      : await env.DB.prepare('UPDATE user_data SET version = version + 1, data = ?2, size = ?3, updated_at = ?4 WHERE user_id = ?1 AND version = ?5')
          .bind(user.id, packed, packed.byteLength, now, baseVersion)
          .run();

  if (result.meta.changes === 0) {
    const current = await env.DB.prepare('SELECT version FROM user_data WHERE user_id = ?1').bind(user.id).first<{ version: number }>();
    return json({ error: 'The account was updated from another device.', version: current?.version ?? 0 }, { status: 409 });
  }
  return json({ version: baseVersion + 1, updatedAt: now });
}
