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
  console.log('Transcribing audio:', { size: audioBlob.size, type: audioBlob.type, extension: fileExtension });
  
  const formData = new FormData();
  formData.append('file', audioBlob, `recording.${fileExtension}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  // Note: Removed prompt parameter as it was causing Whisper to hallucinate the prompt text
  // when audio quality was poor

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Whisper API error response:', err);
    throw new Error(`Whisper API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  console.log('Whisper API response:', data);
  return data.text ?? '';
}

export interface ExtractedEvent {
  eventType: string;
  description: string;
  tags: string[];
  valence: 'positive' | 'neutral' | 'negative';
  suggestedEmoji?: string;
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
Given a parent's spoken description of their child's day, extract ALL distinct SPECIFIC events mentioned.

IMPORTANT: Extract SPECIFIC events, not generic categories. For example:
- Instead of "mood" → extract "angry", "happy", "frustrated", "excited", etc.
- Instead of "behavior" → extract "naughty", "helpful", "kind", "aggressive", etc.
- Instead of "sleep" → extract "good_sleep", "poor_sleep", "tired", etc.

For each event, return:
- eventType: a specific event type from the list below OR a descriptive custom event name
- description: a brief description of what happened
- tags: relevant tags (e.g., "after-school", "morning", "sibling", "bedtime")
- valence: "positive", "neutral", or "negative" - how this event affects the child's wellbeing
- suggestedEmoji: MUST use the exact emoji from the mapping below for known event types

Available specific event types with their REQUIRED emojis:
- Behavioral: meltdown (🌊), shutdown (🔇), conflict (💢), aggression (😠), angry (😡), naughty (😈), refusal (🙅), overwhelm (😢), helpful (🤝), kindness (🫶), sibling_harmony (🫂), bounceback (🐦‍🔥), brave (🦁)
- Wellbeing: good_sleep (😴), poor_sleep (😵), tired (🥱), sick (🤒), injury (🤕), wet_bed (🛏️), toilet_issue (🚽)
- Activities: great_day (🌟), good_breakfast (🍳), good_dinner (😋), didnt_eat_dinner (🍽️), fast_food (🍟), sugar (🍬), medication (💊), playdate (👫), watched_tv (📺), family_adventure (🏕️), played_outside (🌳), drew_comics (🦸), stayed_home (🏠), chores (🧹), focus (🔎), reading (📚), sports (🏀), party (🥳), video_games (🎮), school_incident (🏫), poor_transitions (🎢), bad_language (🤬), sneaky (🥷), messy (🫗), dad_bonding (👨), mom_bonding (👩), travel (✈️)

Common phrase mappings (ALWAYS use the specified emoji):
- "angry", "mad", "furious", "rage" → angry (negative, emoji: 😡)
- "aggressive", "hit", "pushed", "physical aggression" → aggression (negative, emoji: 😠)
- "naughty", "misbehaved", "acting out" → naughty (negative, emoji: 😈)
- "tired", "exhausted", "sleepy" → tired (neutral/negative, emoji: 🥱)
- "helpful", "helped out", "cooperative" → helpful (positive, emoji: 🤝)
- "kind", "sweet", "caring" → kindness (positive, emoji: 🫶)
- "wet the bed", "bedwetting", "accident at night" → wet_bed (neutral, emoji: 🛏️)
- "didn't eat", "refused food", "skipped dinner/lunch" → didnt_eat_dinner (negative, emoji: 🍽️)
- "good dinner", "ate well", "finished meal" → good_dinner (positive, emoji: 😋)
- "drew", "drawing", "drew comics", "made comics" → drew_comics (positive, emoji: 🦸)
- "meltdown", "lost it", "fell apart" → meltdown (negative, emoji: 🌊)
- "shutdown", "went quiet", "stopped talking" → shutdown (negative, emoji: 🔇)
- "fight with sibling", "hit his brother/sister" → conflict (negative, emoji: 💢)
- "great day", "good day", "wonderful" → great_day (positive, emoji: 🌟)
- "slept well", "good sleep" → good_sleep (positive, emoji: 😴)
- "bad sleep", "didn't sleep", "up all night" → poor_sleep (negative, emoji: 😵)
- "took medicine", "medication" → medication (neutral, emoji: 💊)
- "school incident", "trouble at school", "sent to office" → school_incident (negative, emoji: 🏫)
- "bounced back", "recovered well", "resilient" → bounceback (positive, emoji: 🐦‍🔥)

CRITICAL: For known event types, you MUST use the exact emoji specified above in suggestedEmoji. Do not choose a different emoji.

Return ONLY a JSON array of objects. If no events can be identified, return an empty array.
Example: [{"eventType":"angry","description":"Got really angry and yelled","tags":["emotional","afternoon"],"valence":"negative","suggestedEmoji":"😡"},{"eventType":"drew_comics","description":"Drew superhero comics","tags":["creative","afternoon"],"valence":"positive","suggestedEmoji":"🦸"}]`;

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
