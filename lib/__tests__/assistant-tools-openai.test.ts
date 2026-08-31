import { getToolsForOpenAI, getToolsAsJsonSchema } from '@/lib/assistant/tools';

// Avoid loading the Neon serverless client (TextDecoder) in the jsdom env — the
// tool schema converters under test don't touch the DB.
jest.mock('@/lib/db', () => ({
  sql: jest.fn(),
}));

describe('getToolsForOpenAI', () => {
  const tools = getToolsForOpenAI();

  it('maps every tool to the OpenAI function-calling format', () => {
    const anthropic = getToolsAsJsonSchema();
    expect(tools).toHaveLength(anthropic.length);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('emits { type: "function", function: { name, description, parameters } }', () => {
    for (const tool of tools) {
      expect(tool.type).toBe('function');
      expect(typeof tool.function.name).toBe('string');
      expect(tool.function.name.length).toBeGreaterThan(0);
      expect(typeof tool.function.description).toBe('string');
      expect(tool.function.parameters.type).toBe('object');
      expect(typeof tool.function.parameters.properties).toBe('object');
    }
  });

  it('does not leak Anthropic-only keys (input_schema / additionalProperties)', () => {
    for (const tool of tools) {
      expect(tool.function.parameters).not.toHaveProperty('input_schema');
      expect(tool.function.parameters).not.toHaveProperty(
        'additionalProperties'
      );
      expect(tool.function).not.toHaveProperty('input_schema');
    }
  });

  it('preserves required fields for a tool that declares them', () => {
    const suggest = tools.find((t) => t.function.name === 'suggest_savings');
    expect(suggest).toBeDefined();
    expect(suggest!.function.parameters.required).toContain('target_amount');
    expect(suggest!.function.parameters.properties).toHaveProperty(
      'target_amount'
    );
  });
});
