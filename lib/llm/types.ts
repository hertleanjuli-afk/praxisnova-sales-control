export type LLMProvider = 'gemini-paid' | 'gemini-free' | 'groq';

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
}

export class LLMError extends Error {
  readonly provider: LLMProvider;
  readonly cause?: unknown;
  constructor(message: string, provider: LLMProvider, cause?: unknown) {
    super(message);
    this.name = 'LLMError';
    this.provider = provider;
    this.cause = cause;
  }
}

export class RateLimitError extends LLMError {
  constructor(provider: LLMProvider, cause?: unknown) {
    super(`Rate limit hit on ${provider}`, provider, cause);
    this.name = 'RateLimitError';
  }
}

export class AuthError extends LLMError {
  constructor(provider: LLMProvider, cause?: unknown) {
    super(`Auth failed on ${provider}. Check API key env var.`, provider, cause);
    this.name = 'AuthError';
  }
}

export class ModelError extends LLMError {
  constructor(provider: LLMProvider, message: string, cause?: unknown) {
    super(`Model error on ${provider}: ${message}`, provider, cause);
    this.name = 'ModelError';
  }
}
