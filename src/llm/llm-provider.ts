export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMProvider {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
}
