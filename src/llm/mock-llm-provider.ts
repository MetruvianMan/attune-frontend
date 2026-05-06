import { LLMProvider, LLMOptions } from './llm-provider';

/**
 * Mock LLM provider for testing. Returns deterministic responses
 * based on prompt content so the insight engine and NLP pipeline
 * can work without a real API key.
 */
export class MockLLMProvider implements LLMProvider {
  async complete(prompt: string, _options?: LLMOptions): Promise<string> {
    const lower = prompt.toLowerCase();

    if (lower.includes('insight')) {
      return 'Over the past week, patterns suggest that consistent bedtime routines were associated with calmer mornings. This is a common and expected pattern for many neurodivergent children.';
    }

    if (lower.includes('strategy')) {
      return 'Consider adding a 10–15 minute quiet transition buffer after school before any demands are placed. This gives time for sensory regulation and can reduce afternoon dysregulation.';
    }

    if (lower.includes('narrative')) {
      return 'Your child had a mixed week with some challenging moments and some bright spots. The data shows a connection between sleep quality and next-day regulation.';
    }

    if (lower.includes('extract')) {
      return JSON.stringify({
        eventType: 'meltdown',
        emotionalTone: 'frustrated',
        tags: ['after-school', 'transition'],
        persons: [],
      });
    }

    if (lower.includes('query') || lower.includes('question')) {
      return 'Based on the logged data, meltdowns this month were most common on Mondays and days with schedule changes.';
    }

    return 'This is a mock LLM response for testing purposes.';
  }
}
