import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const KB_PATH = join(process.cwd(), 'src/lib/knowledge-base.ts');
const LOG_PATH = join(process.cwd(), 'src/lib/update-log.json');

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function readKnowledgeBaseFile(): string {
  return readFileSync(KB_PATH, 'utf-8');
}

function readUpdateLog(): { updates: object[] } {
  try {
    const content = readFileSync(LOG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { updates: [] };
  }
}

function writeUpdateLog(log: { updates: object[] }): void {
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf-8');
}

export async function POST(request: NextRequest) {
  try {
    const { password, updateType, updateData } = await request.json();

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY environment variable is not set.' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });
    const today = getTodayDate();
    const currentFileContent = readKnowledgeBaseFile();

    // Ask Claude to integrate the update into the knowledge base
    const integrationPrompt = `You are editing a cold email knowledge base file. Here is the current file content:

<current_file>
${currentFileContent}
</current_file>

You need to integrate the following update into the appropriate section of the knowledge base string (the content between the backtick template literal). The update type is: ${updateType}

Update data:
${JSON.stringify(updateData, null, 2)}

Instructions:
1. Find the most appropriate section in the KNOWLEDGE_BASE template literal to update or add to
2. For benchmark updates: update the numbers/data in the BENCHMARK DATA section
3. For deliverability changes: update the DELIVERABILITY & SPAM AVOIDANCE section
4. For new frameworks: add to the appropriate section (CORE PHILOSOPHY, BODY COPY, etc.)
5. For updated best practices: update the relevant section
6. Also update the "LAST UPDATED" line at the top of the template literal to: ${today}
7. Also update the KNOWLEDGE_BASE_VERSION constant to: '${today}'
8. Keep all other content exactly as-is
9. Return the COMPLETE updated TypeScript file content — the entire file, not just the changed parts

Return ONLY the complete file content. No markdown code blocks, no explanatory text. Just the raw TypeScript file content starting with the comment block.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [{ role: 'user', content: integrationPrompt }],
    });

    const updatedContent = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.Messages.TextBlock).text)
      .join('');

    if (!updatedContent || updatedContent.length < 1000) {
      return NextResponse.json(
        { error: 'Claude returned an unexpectedly short response. Update not applied.' },
        { status: 500 }
      );
    }

    // Write the updated file
    writeFileSync(KB_PATH, updatedContent, 'utf-8');

    // Append to update log
    const log = readUpdateLog();
    log.updates.unshift({
      id: Date.now(),
      date: today,
      updateType,
      summary:
        updateType === 'benchmarkUpdate'
          ? `Updated benchmark: ${updateData.metric}`
          : updateType === 'deliverabilityChange'
            ? `Deliverability change: ${updateData.change?.slice(0, 80)}`
            : updateType === 'newFramework'
              ? `New framework: ${updateData.name}`
              : `Updated best practice: ${updateData.practice?.slice(0, 80)}`,
      data: updateData,
    });
    writeUpdateLog(log);

    return NextResponse.json({ success: true, newDate: today });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
