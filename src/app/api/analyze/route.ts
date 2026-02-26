import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, parseJSON } from '@/lib/anthropic';
import { buildSystemPrompt, buildAnalysisPrompt } from '@/lib/prompts';
import { AnalysisResult, AnalyzeRequest } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();

    if (!body.email || body.email.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      );
    }

    const client = getAnthropicClient();
    const contextMap = body.context
      ? {
          'Target Persona': body.context.targetPersona,
          'Industry/Vertical': body.context.industry,
          'Company Size': body.context.companySize,
          'Email Goal': body.context.emailGoal,
          'Email Type': body.context.emailType,
          'Additional Context': body.context.additionalContext,
        }
      : {};

    const userPrompt = buildAnalysisPrompt(body.email, contextMap as Record<string, string>);

    const encoder = new TextEncoder();
    let buffer = '';
    let parseAttempt = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: buildSystemPrompt(),
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

          // Parse and validate final JSON
          try {
            const result = parseJSON<AnalysisResult>(buffer);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, result })}\n\n`
              )
            );
          } catch {
            // Retry with explicit JSON instruction
            if (parseAttempt === 0) {
              parseAttempt++;
              const retryPrompt = userPrompt + '\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a valid JSON object, nothing else.';
              const retryStream = client.messages.stream({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: buildSystemPrompt(),
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

              const retryResult = parseJSON<AnalysisResult>(buffer);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ done: true, result: retryResult })}\n\n`
                )
              );
            }
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
