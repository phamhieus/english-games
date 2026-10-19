const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

const SYSTEM_PROMPT = `You help Vietnamese learners build English vocabulary lists.
The user gives messy text (often OCR output, with typos and broken lines): English words or phrases, usually with Vietnamese meanings.
Return JSON: {"words":[{"english":string,"vietnamese":string,"example"?:string,"level"?:string}]}.
Rules:
- Fix obvious OCR/typing mistakes in English words and keep Vietnamese diacritics correct.
- If a meaning is missing, add a short, accurate Vietnamese translation.
- "example" is an optional short English sentence; "level" is an optional CEFR level (A1-C2). Omit them when unsure.
- Do not invent words that are not in the input, and do not merge or drop entries. Remove duplicates only when they are identical.`;

interface DeepSeekWord {
  english?: unknown;
  vietnamese?: unknown;
  example?: unknown;
  level?: unknown;
}

const str = (v: unknown) => (typeof v === 'string' ? v.replace(/[\t\r\n]+/g, ' ').trim() : '');

/**
 * Sends the list to DeepSeek and returns it as editable tab-separated lines
 * (`english<TAB>vietnamese<TAB>example<TAB>level`) that the text importer understands.
 * The API key stays on this device and is only sent to api.deepseek.com.
 */
export async function tidyWordsWithDeepSeek(text: string, apiKey: string, signal?: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.slice(0, 12000) },
        ],
      }),
    });
  } catch {
    throw new Error('Could not reach DeepSeek. Check your internet connection (or whether your browser blocks the request).');
  }
  if (res.status === 401) throw new Error('DeepSeek rejected the API key. Check it in Settings.');
  if (res.status === 402) throw new Error('Your DeepSeek account has no balance left.');
  if (res.status === 429) throw new Error('DeepSeek is rate limiting requests. Try again in a moment.');
  if (!res.ok) throw new Error(`DeepSeek returned an error (${res.status}).`);

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content ?? '';
  let words: DeepSeekWord[];
  try {
    words = (JSON.parse(content) as { words?: DeepSeekWord[] }).words ?? [];
  } catch {
    throw new Error('DeepSeek returned an unreadable answer. Try again.');
  }
  const lines = words
    .map((w) => [str(w.english), str(w.vietnamese), str(w.example), str(w.level)])
    .filter((c) => c[0])
    .map((c) => (c[2] || c[3] ? c.join('\t') : `${c[0]}\t${c[1]}`));
  if (lines.length === 0) throw new Error('DeepSeek found no words in the text.');
  return lines.join('\n');
}
