/**
 * Browser-side OpenAI API client.
 * Calls the OpenAI Chat Completions API directly from the browser.
 * Only suitable for localhost/dev — production should use a backend proxy.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

/**
 * Transcribe audio using OpenAI Whisper API.
 * Accepts a Blob of audio data and returns the full transcript text.
 */
export async function transcribeWithWhisper(audioBlob: Blob, apiKey: string, fileExtension: string = 'webm'): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, `recording.${fileExtension}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.text ?? '';
}

export interface ExtractedEvent {
  eventType: string;
  description: string;
  tags: string[];
}

/**
 * Send a transcript to OpenAI and get back a list of extracted events.
 * Returns an array of events parsed from the parent's spoken description.
 */
export async function extractEventsFromTranscript(
  transcript: string,
  apiKey: string,
): Promise<ExtractedEvent[]> {
  const systemPrompt = `You are a caregiving assistant that helps parents of neurodivergent children log daily events. 
Given a parent's spoken description of their child's day, extract ALL distinct events mentioned.

For each event, return:
- eventType: one of: meltdown, shutdown, conflict, school_incident, positive_behavior, mood, sleep, diet, screen_time, physical_wellness, medication
- description: a brief description of what happened
- tags: relevant tags (e.g., "after-school", "morning", "sibling", "bedtime")

Map common phrases to event types:
- "wet the bed", "bedwetting", "accident at night" → physical_wellness
- "didn't eat", "refused food", "skipped dinner/lunch" → diet
- "meltdown", "lost it", "fell apart" → meltdown
- "shutdown", "went quiet", "stopped talking" → shutdown
- "fight with sibling", "hit his brother/sister" → conflict
- "great day", "good day", "wonderful" → positive_behavior
- "slept well", "good sleep", "bad sleep", "didn't sleep" → sleep
- "took medicine", "medication" → medication
- "school incident", "trouble at school", "sent to office" → school_incident

Return ONLY a JSON array of objects. If no events can be identified, return an empty array.
Example: [{"eventType":"meltdown","description":"Had a meltdown after school during transition","tags":["after-school","transition"]},{"eventType":"physical_wellness","description":"Wet the bed overnight","tags":["bedtime","bedwetting"]}]`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parent said: "${transcript}"` },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '[]';

  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (e: any) => typeof e.eventType === 'string' && typeof e.description === 'string',
      );
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Check if an OpenAI API key is configured.
 */
export function getOpenAIKey(): string | null {
  const key = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (key && typeof key === 'string' && key.length > 10 && key !== 'sk-your-key-here') {
    return key;
  }
  return null;
}

/**
 * Debug helper — returns info about the key detection for troubleshooting.
 */
export function debugKeyStatus(): string {
  const raw = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (raw === undefined) return 'VITE_OPENAI_API_KEY not found in env';
  if (raw === null) return 'VITE_OPENAI_API_KEY is null';
  if (typeof raw !== 'string') return `VITE_OPENAI_API_KEY is type ${typeof raw}`;
  if (raw === 'sk-your-key-here') return 'Still has placeholder value';
  if (raw.length <= 10) return `Key too short (${raw.length} chars)`;
  return `Key detected (${raw.length} chars, starts with ${raw.substring(0, 7)}...)`;
}
