'use client';

import { Button } from '@/components/ui/button';

export function PrintCvButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Guardar como PDF
    </Button>
  );
}
