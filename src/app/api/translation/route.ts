import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    feature: 'translation',
    message: 'Endpoint pendiente de implementación',
  });
}
