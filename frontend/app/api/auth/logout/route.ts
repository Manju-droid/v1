import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();

  // Clear auth cookie
  cookieStore.delete('v_auth');

  return NextResponse.json({ ok: true });
}
