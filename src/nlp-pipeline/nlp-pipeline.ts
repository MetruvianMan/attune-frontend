import type { LLMProvider } from '@src/llm/llm-provider.js';
import type { ExtractedEventData } from '@src/event-capture/voice-logger.js';
import type { EventType, Event, ContextEntry, Insight, ArchivedDocument, StrategyFeedback, IntakeProfile } from '@src/models/index.js';
import type { ConversationTurn } from '@src/models/conversation.js';

export interface Correlation {
  factor1: string;
  factor2: string;
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
}

export interface Pattern {
  type: string;
  description: string;
  occurrences: number;
}

export interface QueryIntent {
  eventTypes: EventType[];
  timeRange: { start: Date; end: Date };
  dimensions: string[];
  followUpContext?: string;
}

export interface StrategyGenerationContext {
  insight: Insight;
  intakeProfile?: IntakeProfile;
  documents: ArchivedDocument[];
  feedbackHistory: StrategyFeedback[];
}

export interface RelevantData {
  events: Event[];
  contextEntries: ContextEntry[];
  insights: Insight[];
  documents: ArchivedDocument[];
}

export interface NLPPipeline {
  transcribeAudio(audio: Blob): Promise<string>;
  extractEventData(transcript: string): Promise<ExtractedEventData>;
  generateInsightNarrative(correlations: Correlation[], patterns: Pattern[]): Promise<string>;
  generateStrategies(context: StrategyGenerationContext): Promise<string[]>;
  interpretQuery(query: string, conversationHistory: ConversationTurn[]): Promise<QueryIntent>;
  generateConversationalResponse(intent: QueryIntent, data: RelevantData): Promise<string>;
  extractDocumentText(file: File): Promise<string | null>;
}

const VALID_EVENT_TYPES: EventType[] = [
  'mood', 'sleep', 'diet', 'screen_time', 'physical_wellness', 'medication',
  'meltdown', 'shutdown', 'conflict', 'school_incident', 'positive_behavior',
];

export class NLPPipelineImpl implements NLPPipeline {
  private llm: LLMProvider;

  constructor(llm: LLMProvider) {
    this.llm = llm;
  }

  /**
   * Stub — will be wired to a speech-to-text API later.
   */
  async transcribeAudio(_audio: Blob): Promise<string> {
    return '';
  }

  /**
   * Use the LLM to extract event type, tone, tags, and persons from a transcript.
   * Parses the LLM response as JSON. If parsing fails, returns defaults.
   */
  async extractEventData(transcript: string): Promise<ExtractedEventData> {
    const prompt = `Extract structured event data from the following parent's spoken log about their child.
Return a JSON object with these fields:
- "eventType": one of ${JSON.stringify(VALID_EVENT_TYPES)} or null if unclear
- "emotionalTone": a short description of the emotional tone (e.g., "frustrated", "hopeful", "neutral")
- "tags": an array of relevant tags (e.g., ["school", "morning routine"])
- "persons": an array of person names mentioned (e.g., ["Ms. Johnson", "Sam"])

Transcript:
"${transcript}"

Respond with ONLY the JSON object, no additional text.`;

    const response = await this.llm.complete(prompt, {
      temperature: 0.2,
      systemPrompt: 'You are a structured data extraction assistant. Always respond with valid JSON only.',
    });

    try {
      const parsed = JSON.parse(response);
      const eventType = VALID_EVENT_TYPES.includes(parsed.eventType) ? parsed.eventType : null;
      return {
        eventType,
        emotionalTone: typeof parsed.emotionalTone === 'string' ? parsed.emotionalTone : '',
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === 'string') : [],
        persons: Array.isArray(parsed.persons) ? parsed.persons.filter((p: unknown) => typeof p === 'string') : [],
      };
    } catch {
      return {
        eventType: null,
        emotionalTone: '',
        tags: [],
        persons: [],
      };
    }
  }

  /**
   * Use the LLM to produce a neuro-affirming narrative from correlations and patterns.
   */
  async generateInsightNarrative(correlations: Correlation[], patterns: Pattern[]): Promise<string> {
    const correlationSummary = correlations
      .map((c) => `- ${c.factor1} ↔ ${c.factor2} (${c.strength}): ${c.description}`)
      .join('\n');

    const patternSummary = patterns
      .map((p) => `- ${p.type} (${p.occurrences} occurrences): ${p.description}`)
      .join('\n');

    const prompt = `Generate a neuro-affirming weekly insight narrative for a parent of a neurodivergent child based on the following data.

Correlations found:
${correlationSummary || 'None identified'}

Patterns detected:
${patternSummary || 'None identified'}

Guidelines:
- Use supportive, plain language — no clinical or deficit-based framing
- Frame observations compassionately (e.g., "dysregulation episode" not "bad behavior")
- Acknowledge uncertainty when correlations are weak
- Normalize variability where appropriate
- Keep the narrative concise (2-4 sentences)

Respond with ONLY the narrative text.`;

    return this.llm.complete(prompt, {
      temperature: 0.7,
      systemPrompt: 'You are a compassionate, neuro-affirming caregiving assistant. Use supportive language and avoid clinical terminology.',
    });
  }

  /**
   * Use the LLM to produce 2-3 actionable strategies from the context.
   */
  async generateStrategies(context: StrategyGenerationContext): Promise<string[]> {
    const insightSummary = context.insight.narrative;
    const signals = context.insight.supportingSignals
      .map((s) => `- ${s.description} (observed ${s.observationCount} times)`)
      .join('\n');

    const profileInfo = context.intakeProfile
      ? `Child profile: traits: ${context.intakeProfile.traits.join(', ')}; strengths: ${context.intakeProfile.strengths.join(', ')}; struggles: ${context.intakeProfile.struggles.join(', ')}; sensory sensitivities: ${context.intakeProfile.sensoryPreferences.sensitivities.join(', ')}; communication: ${context.intakeProfile.communicationStyle.type}`
      : 'No intake profile available.';

    const docSummary = context.documents.length > 0
      ? context.documents
          .filter((d) => d.extractedText)
          .map((d) => `- ${d.documentType}: ${d.extractedText?.substring(0, 200)}...`)
          .join('\n')
      : 'No documents available.';

    const feedbackSummary = context.feedbackHistory.length > 0
      ? context.feedbackHistory
          .map((f) => `- Strategy ${f.strategyId}: ${f.feedback}`)
          .join('\n')
      : 'No prior feedback.';

    const prompt = `Generate 2-3 actionable, neuro-affirming parenting strategies based on the following insight and context.

Insight: ${insightSummary}

Supporting signals:
${signals || 'None'}

${profileInfo}

Relevant documents:
${docSummary}

Prior strategy feedback:
${feedbackSummary}

Guidelines:
- Each strategy should be specific and actionable
- Use neuro-affirming language — no clinical or judgmental framing
- Incorporate the child's strengths and preferences when available
- Prioritize approaches similar to previously "helped" strategies
- Avoid approaches similar to previously "didnt_help" strategies

Return a JSON array of 2-3 strategy description strings.
Respond with ONLY the JSON array, no additional text.`;

    const response = await this.llm.complete(prompt, {
      temperature: 0.7,
      systemPrompt: 'You are a compassionate, neuro-affirming caregiving assistant. Always respond with a valid JSON array of strings.',
    });

    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.every((s: unknown) => typeof s === 'string')) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Use the LLM to parse a natural language query into a QueryIntent.
   * Defaults timeRange to the last 30 days if not specified.
   */
  async interpretQuery(query: string, conversationHistory: ConversationTurn[]): Promise<QueryIntent> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const historyContext = conversationHistory.length > 0
      ? conversationHistory
          .map((t) => `${t.role}: ${t.content}`)
          .join('\n')
      : 'No prior conversation.';

    const prompt = `Parse the following natural language query from a parent about their neurodivergent child's data into a structured intent.

Query: "${query}"

Conversation history:
${historyContext}

Return a JSON object with:
- "eventTypes": array of event types referenced (from: ${JSON.stringify(VALID_EVENT_TYPES)}), empty array if none specified
- "timeRangeStart": ISO date string for the start of the time range (default: 30 days ago = "${thirtyDaysAgo.toISOString()}")
- "timeRangeEnd": ISO date string for the end of the time range (default: now = "${now.toISOString()}")
- "dimensions": array of analysis dimensions (e.g., ["frequency", "severity", "triggers", "time_of_day"])
- "followUpContext": resolved context from conversation history if this is a follow-up question, or null

Respond with ONLY the JSON object, no additional text.`;

    const response = await this.llm.complete(prompt, {
      temperature: 0.2,
      systemPrompt: 'You are a query interpretation assistant. Always respond with valid JSON only.',
    });

    try {
      const parsed = JSON.parse(response);
      const eventTypes: EventType[] = Array.isArray(parsed.eventTypes)
        ? parsed.eventTypes.filter((t: unknown) => typeof t === 'string' && VALID_EVENT_TYPES.includes(t as EventType))
        : [];

      const timeRangeStart = parsed.timeRangeStart ? new Date(parsed.timeRangeStart) : thirtyDaysAgo;
      const timeRangeEnd = parsed.timeRangeEnd ? new Date(parsed.timeRangeEnd) : now;

      return {
        eventTypes,
        timeRange: {
          start: isNaN(timeRangeStart.getTime()) ? thirtyDaysAgo : timeRangeStart,
          end: isNaN(timeRangeEnd.getTime()) ? now : timeRangeEnd,
        },
        dimensions: Array.isArray(parsed.dimensions)
          ? parsed.dimensions.filter((d: unknown) => typeof d === 'string')
          : [],
        followUpContext: typeof parsed.followUpContext === 'string' ? parsed.followUpContext : undefined,
      };
    } catch {
      return {
        eventTypes: [],
        timeRange: { start: thirtyDaysAgo, end: now },
        dimensions: [],
      };
    }
  }

  /**
   * Use the LLM to produce a narrative answer from intent and data.
   */
  async generateConversationalResponse(intent: QueryIntent, data: RelevantData): Promise<string> {
    const eventSummary = data.events.length > 0
      ? `${data.events.length} events found. Types: ${[...new Set(data.events.map((e) => e.eventType))].join(', ')}`
      : 'No matching events found.';

    const contextSummary = data.contextEntries.length > 0
      ? `${data.contextEntries.length} context entries: ${data.contextEntries.map((c) => `${c.contextType}/${c.subType}`).join(', ')}`
      : 'No context entries.';

    const insightSummary = data.insights.length > 0
      ? data.insights.map((i) => i.narrative).join(' ')
      : 'No prior insights.';

    const docSummary = data.documents.length > 0
      ? `${data.documents.length} documents available.`
      : 'No documents.';

    const prompt = `Generate a conversational response for a parent asking about their neurodivergent child's data.

Query intent:
- Event types: ${intent.eventTypes.length > 0 ? intent.eventTypes.join(', ') : 'all'}
- Time range: ${intent.timeRange.start.toISOString()} to ${intent.timeRange.end.toISOString()}
- Dimensions: ${intent.dimensions.length > 0 ? intent.dimensions.join(', ') : 'general'}
${intent.followUpContext ? `- Follow-up context: ${intent.followUpContext}` : ''}

Available data:
- Events: ${eventSummary}
- Context: ${contextSummary}
- Prior insights: ${insightSummary}
- Documents: ${docSummary}

Guidelines:
- Respond in a warm, supportive tone
- Reference specific data points when available
- Use neuro-affirming language
- If data is insufficient, suggest what additional logging would help
- Keep the response concise and actionable

Respond with ONLY the narrative text.`;

    return this.llm.complete(prompt, {
      temperature: 0.7,
      systemPrompt: 'You are a compassionate, neuro-affirming caregiving assistant helping a parent understand their child\'s patterns.',
    });
  }

  /**
   * Stub — will be wired to a document parsing library later.
   */
  async extractDocumentText(_file: File): Promise<string | null> {
    return null;
  }
}
