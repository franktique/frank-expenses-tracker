import {
  maskApiKey,
  AI_PROVIDER_PROTOCOLS,
  AI_PROVIDER_PROTOCOL_LABELS,
  CreateAIProviderSchema,
  UpdateAIProviderSchema,
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

describe('AI providers — vision_model schema', () => {
  it('defaults vision_model to empty string on create', () => {
    const result = CreateAIProviderSchema.safeParse({
      name: 'Mi proveedor',
      protocol: 'openai',
      model: 'gpt-4o',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vision_model).toBe('');
    }
  });

  it('accepts an explicit vision_model on create', () => {
    const result = CreateAIProviderSchema.safeParse({
      name: 'Mi proveedor',
      protocol: 'anthropic',
      model: 'claude-sonnet-4-6',
      vision_model: 'claude-3-5-sonnet',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vision_model).toBe('claude-3-5-sonnet');
    }
  });

  it('allows clearing vision_model on update (empty string)', () => {
    const result = UpdateAIProviderSchema.safeParse({ vision_model: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vision_model).toBe('');
    }
  });

  it('rejects an overlong vision_model', () => {
    const result = CreateAIProviderSchema.safeParse({
      name: 'Mi proveedor',
      protocol: 'openai',
      model: 'gpt-4o',
      vision_model: 'x'.repeat(301),
    });
    expect(result.success).toBe(false);
  });
});
