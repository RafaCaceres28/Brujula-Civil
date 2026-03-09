import { routes } from '@/lib/constants/routes';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(new URL(routes.app.dashboard, 'http://localhost:3000'));
}
