import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, parseJSON } from '@/lib/anthropic';
import { SYSTEM_PROMPT, buildGenerationPrompt, buildRefinementPrompt } from '@/lib/prompts';
import { GenerateRequest, GenerateResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest & { refine?: { email: string; instructions: string } } = await request.json();

    if (!body.emailType || !body.offering || !body.targetPersona) {
      if (!body.refine) {
        return NextResponse.json(
          { error: 'emailType, offering, and targetPersona are required' },
          { status: 400 }
        );
      }
    }

    const client = getAnthropicClient();

    let userPrompt: string;
    let isRefinement = false;

    if (body.refine) {
      isRefinement = true;
      userPrompt = buildRefinementPrompt(
        `Subject: ${body.refine.email}`,
        body.refine.instructions
      );
    } else {
      userPrompt = buildGenerationPrompt({
        emailType: body.emailType,
        offering: body.offering,
        targetPersona: body.targetPersona,
        industry: body.industry,
        painPoints: body.painPoints,
        differentiator: body.differentiator,
        desiredCTA: body.desiredCTA,
        tone: body.tone,
        mustInclude: body.mustInclude,
        previousEmail: body.previousEmail,
        personalizationHooks: body.personalizationHooks,
      });
    }

    const encoder = new TextEncoder();
    let buffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
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

          // Parse final result
          try {
            let result;
            if (isRefinement) {
              const refinedData = parseJSON<{ subject: string; body: string; scores: GenerateResult }>(buffer);
              result = { refined: refinedData };
            } else {
              result = parseJSON<GenerateResult>(buffer);
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, result })}\n\n`
              )
            );
          } catch {
            // Retry with explicit JSON instruction
            const retryPrompt = userPrompt + '\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a valid JSON object, nothing else.';
            const retryStream = client.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
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

            let retryResult;
            if (isRefinement) {
              const refinedData = parseJSON<{ subject: string; body: string; scores: GenerateResult }>(buffer);
              retryResult = { refined: refinedData };
            } else {
              retryResult = parseJSON<GenerateResult>(buffer);
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, result: retryResult })}\n\n`
              )
            );
          }

          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
