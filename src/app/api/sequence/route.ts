import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, parseJSON } from '@/lib/anthropic';
import { SYSTEM_PROMPT, buildSequencePrompt } from '@/lib/prompts';
import { SequenceRequest, SequenceResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: SequenceRequest = await request.json();

    if (!body.offering || !body.targetPersona || !body.sequenceLength) {
      return NextResponse.json(
        { error: 'offering, targetPersona, and sequenceLength are required' },
        { status: 400 }
      );
    }

    const client = getAnthropicClient();
    const userPrompt = buildSequencePrompt(body);

    const encoder = new TextEncoder();
    let buffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          });

          for await (const chunk of messageStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              buffer += chunk.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`
                )
              );
            }
          }

          try {
            const result = parseJSON<SequenceResult>(buffer);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, result })}\n\n`
              )
            );
          } catch {
            // Retry with explicit JSON instruction
            const retryPrompt =
              userPrompt +
              '\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a valid JSON object, nothing else.';
            const retryStream = client.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 8192,
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: retryPrompt }],
            });

            buffer = '';
            for await (const chunk of retryStream) {
              if (
                chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta'
              ) {
                buffer += chunk.delta.text;
              }
            }

            const retryResult = parseJSON<SequenceResult>(buffer);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, result: retryResult })}\n\n`
              )
            );
          }

          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
