import { error } from './http';

/**
 * GET /api/tts?text=word — an MP3 of an English word or short phrase.
 * A human recording from the Free Dictionary API when it has one (single words only),
 * otherwise Workers AI (MeloTTS). Every result is kept in D1, so each text is fetched or
 * generated once; browsers cache it too.
 */
const MAX_LENGTH = 60;
const MODEL = '@cf/myshell-ai/melotts';
const AUDIO_HEADERS = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' };

export async function handleTts(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'GET') return error(405, 'Method not allowed.');
  const text = normalize(new URL(request.url).searchParams.get('text') ?? '');
  if (!text) return error(400, 'Give a word (letters only, up to 60 characters).');

  const saved = await env.DB.prepare('SELECT audio, source FROM tts_audio WHERE text = ?1').bind(text).first<{ audio: number[] | ArrayBuffer; source: string }>();
  if (saved) return audioResponse(new Uint8Array(saved.audio), saved.source);

  let source = 'dictionary';
  let audio = await fromDictionary(text);
  if (!audio) {
    source = 'ai';
    audio = await fromAi(env, text);
  }
  if (!audio) return error(404, 'No audio for this text.');

  ctx.waitUntil(
    env.DB.prepare('INSERT OR IGNORE INTO tts_audio (text, source, audio, created_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(text, source, audio, Date.now())
      .run()
      .catch((e: unknown) => console.error(JSON.stringify({ msg: 'tts save failed', text, error: String(e) }))),
  );
  return audioResponse(audio, source);
}

/** Lower-case, single spaces; null for anything that isn't a plain word or phrase. */
export function normalize(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text || text.length > MAX_LENGTH) return null;
  return /^[a-z0-9][a-z0-9 '’.,!?-]*$/.test(text) ? text : null;
}

function audioResponse(audio: Uint8Array, source: string): Response {
  return new Response(audio, { headers: { ...AUDIO_HEADERS, 'X-Audio-Source': source } });
}

/** Wikimedia asks API clients to identify themselves. */
const WIKI_HEADERS = { 'User-Agent': 'WordShooter/1.0 (https://word-shooter-sage.vercel.app)' };

/**
 * A recording from the Free Dictionary API, US first, then UK. Its MP3s are copies of
 * Wikimedia Commons recordings; when its media host fails, the Commons MP3 is used instead.
 */
async function fromDictionary(text: string): Promise<Uint8Array | null> {
  if (!/^[a-z'-]+$/.test(text)) return null;
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`);
    if (!res.ok) return null;
    const entries = (await res.json()) as { phonetics?: { audio?: string; sourceUrl?: string }[] }[];
    const accent = (audio: string) => (/-us\.mp3$/.test(audio) ? 0 : /-uk\.mp3$/.test(audio) ? 1 : 2);
    const recordings = entries
      .flatMap((e) => e.phonetics ?? [])
      .filter((p) => p.audio?.startsWith('https://'))
      .sort((a, b) => accent(a.audio!) - accent(b.audio!))
      .slice(0, 2);
    for (const { audio, sourceUrl } of recordings) {
      const mp3 = (await fetchAudio(audio!)) ?? (await fromCommons(sourceUrl));
      if (mp3) return mp3;
    }
    return null;
  } catch {
    return null;
  }
}

/** The MP3 transcode of a Commons file, from its `…?curid=123` page link. */
async function fromCommons(sourceUrl: string | undefined): Promise<Uint8Array | null> {
  const id = sourceUrl?.match(/^https:\/\/commons\.wikimedia\.org\/.*[?&]curid=(\d+)/)?.[1];
  if (!id) return null;
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&pageids=${id}&prop=videoinfo&viprop=derivatives&format=json`, {
    headers: WIKI_HEADERS,
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { query?: { pages?: Record<string, { videoinfo?: { derivatives?: { src?: string; type?: string }[] }[] }> } };
  const derivatives = Object.values(body.query?.pages ?? {}).flatMap((p) => p.videoinfo ?? []).flatMap((v) => v.derivatives ?? []);
  const src = derivatives.find((d) => d.type?.startsWith('audio/mpeg') || d.src?.endsWith('.mp3'))?.src;
  return src?.startsWith('https://upload.wikimedia.org/') ? fetchAudio(src, WIKI_HEADERS) : null;
}

async function fetchAudio(url: string, headers?: HeadersInit): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok || !/audio|mpeg|octet-stream/.test(res.headers.get('Content-Type') ?? '')) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** MeloTTS answers with base64 MP3 in JSON or with the MP3 bytes; accept either. */
async function fromAi(env: Env, text: string): Promise<Uint8Array | null> {
  try {
    const out: unknown = await env.AI.run(MODEL, { prompt: text, lang: 'en' });
    if (out instanceof ReadableStream) return new Uint8Array(await new Response(out).arrayBuffer());
    if (out instanceof ArrayBuffer) return new Uint8Array(out);
    if (out instanceof Uint8Array) return out;
    const b64 = (out as { audio?: unknown } | null)?.audio;
    if (typeof b64 !== 'string' || !b64) return null;
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch (e) {
    console.error(JSON.stringify({ msg: 'tts ai failed', text, error: e instanceof Error ? e.message : String(e) }));
    return null;
  }
}
