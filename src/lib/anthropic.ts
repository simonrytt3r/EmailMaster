import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

export async function streamClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  let fullText = '';

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      fullText += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }

  return fullText;
}

export function parseJSON<T>(text: string): T {
  // Strip markdown code blocks if present
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(cleaned) as T;
}

export async function callClaudeWithRetry<T>(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 2
): Promise<{ result: T; stream: ReadableStream }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let accumulated = '';
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const stream = client.messages.stream({
              model: MODEL,
              max_tokens: MAX_TOKENS,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
            });

            for await (const chunk of stream) {
              if (
                chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta'
              ) {
                accumulated += chunk.delta.text;
                controller.enqueue(encoder.encode(chunk.delta.text));
              }
            }

            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return { result: {} as T, stream: readable };
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}
