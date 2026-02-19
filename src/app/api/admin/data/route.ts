import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { KNOWLEDGE_BASE_VERSION } from '@/lib/knowledge-base';

export const runtime = 'nodejs';

const LOG_PATH = join(process.cwd(), 'src/lib/update-log.json');
const KB_PATH = join(process.cwd(), 'src/lib/knowledge-base.ts');

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Read the full knowledge base file
    const kbFileContent = readFileSync(KB_PATH, 'utf-8');

    // Extract just the knowledge base string content for display
    const match = kbFileContent.match(/export const KNOWLEDGE_BASE = `([\s\S]*?)`;/);
    const kbContent = match ? match[1].trim() : '';

    // Build table of contents with word counts
    const sections = kbContent
      .split('\n')
      .filter((line) => line.startsWith('## '))
      .map((line) => {
        const heading = line.replace('## ', '').trim();
        // Find the content for this section
        const sectionStart = kbContent.indexOf(line);
        const nextHeadingMatch = kbContent.slice(sectionStart + line.length).match(/\n## /);
        const sectionEnd = nextHeadingMatch
          ? sectionStart + line.length + kbContent.slice(sectionStart + line.length).indexOf('\n## ')
          : kbContent.length;
        const sectionContent = kbContent.slice(sectionStart, sectionEnd);
        const wordCount = sectionContent
          .split(/\s+/)
          .filter((w) => w.length > 0).length;
        return { heading, wordCount };
      });

    // Read update log
    let updateLog: { updates: object[] } = { updates: [] };
    try {
      const logContent = readFileSync(LOG_PATH, 'utf-8');
      updateLog = JSON.parse(logContent);
    } catch {
      // log file may not exist yet
    }

    const totalWords = kbContent.split(/\s+/).filter((w) => w.length > 0).length;

    return NextResponse.json({
      success: true,
      version: KNOWLEDGE_BASE_VERSION,
      kbContent,
      sections,
      totalWords,
      updateLog: updateLog.updates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
