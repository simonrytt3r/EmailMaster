import { NextRequest, NextResponse } from 'next/server';
import {
  readCacheStore,
  saveCacheSettings,
  deleteCacheEntry,
  clearCacheEntries,
} from '@/lib/research-cache';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action } = body;

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // ── READ ─────────────────────────────────────────────────────────────────
    if (action === 'read') {
      const store = readCacheStore();
      return NextResponse.json({ success: true, ...store });
    }

    // ── UPDATE SETTINGS ──────────────────────────────────────────────────────
    if (action === 'update-settings') {
      const { allowUserRefresh, cacheDays } = body as {
        allowUserRefresh?: boolean;
        cacheDays?: number;
      };
      const updated = saveCacheSettings({
        ...(allowUserRefresh !== undefined && { allowUserRefresh }),
        ...(cacheDays !== undefined && { cacheDays: Math.max(1, Math.min(365, cacheDays)) }),
      });
      return NextResponse.json({ success: true, settings: updated });
    }

    // ── DELETE ONE ───────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { key } = body as { key: string };
      deleteCacheEntry(key);
      return NextResponse.json({ success: true });
    }

    // ── CLEAR ALL ────────────────────────────────────────────────────────────
    if (action === 'clear') {
      clearCacheEntries();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
