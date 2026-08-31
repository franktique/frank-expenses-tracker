import {
  maskApiKey,
  AI_PROVIDER_PROTOCOLS,
  AI_PROVIDER_PROTOCOL_LABELS,
} from '@/types/ai-providers';

describe('AI providers — maskApiKey', () => {
  it('returns an empty string for an empty key', () => {
    expect(maskApiKey('')).toBe('');
  });

  it('returns a mask for a short key (<= 4 chars) without revealing it', () => {
    expect(maskApiKey('abc')).toBe('••••');
    expect(maskApiKey('abcd')).toBe('••••');
  });

  it('reveals only the last 4 characters of a long key', () => {
    expect(maskApiKey('sk-1234567890abcd')).toBe('••••abcd');
  });
});

describe('AI providers — constants', () => {
  it('supports both protocols', () => {
    expect(AI_PROVIDER_PROTOCOLS).toEqual(['anthropic', 'openai']);
  });

  it('has display labels for both protocols', () => {
    expect(AI_PROVIDER_PROTOCOL_LABELS.anthropic).toBe('Anthropic');
    expect(AI_PROVIDER_PROTOCOL_LABELS.openai).toBe('OpenAI');
  });
});
