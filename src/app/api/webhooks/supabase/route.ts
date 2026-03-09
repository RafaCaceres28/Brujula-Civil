import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    feature: 'supabase-webhooks',
    message: 'Endpoint pendiente de implementación',
  });
}
