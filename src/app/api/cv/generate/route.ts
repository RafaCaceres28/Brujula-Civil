import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    feature: 'cv-generate',
    message: 'Endpoint pendiente de implementación',
  });
}
