import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD environment variable is not set.' },
        { status: 500 }
      );
    }

    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
