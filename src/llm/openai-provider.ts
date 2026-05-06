import { LLMProvider, LLMOptions } from './llm-provider';

/**
 * OpenAI LLM provider stub.
 *
 * When connecting a real OpenAI API:
 * - Use exponential backoff with a maximum of 3 retries for transient errors
 * - Read the API key from the OPENAI_API_KEY environment variable
 * - Use the chat completions endpoint with the configured model
 */
export class OpenAIProvider implements LLMProvider {
  async complete(_prompt: string, _options?: LLMOptions): Promise<string> {
    throw new Error(
      'OpenAI provider not configured — set OPENAI_API_KEY'
    );
  }
}
