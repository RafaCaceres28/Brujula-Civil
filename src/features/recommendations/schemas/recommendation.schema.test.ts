import { describe, expect, it } from 'vitest';
import { recommendationOutputFixture } from '../server/__fixtures__/recommendation-fixtures';
import { recommendationOutputSchema } from './recommendation.schema';

describe('recommendationOutputSchema', () => {
  it('accepts a shortlist with 3 to 5 routes and non-empty reason summaries', () => {
    const parsed = recommendationOutputSchema.safeParse({
      ...recommendationOutputFixture,
      routes: [
        ...recommendationOutputFixture.routes,
        {
          routeId: 'route-4',
          roleId: 'training-specialist',
          sectorId: 'training',
          reasonSummary: 'Tu experiencia en instruccion es transferible a formacion civil.',
          matchedSignals: ['training_instruction'],
        },
        {
          routeId: 'route-5',
          roleId: 'security-manager',
          sectorId: 'defense_security',
          reasonSummary: 'Tu experiencia en seguridad operacional encaja con proteccion civil.',
          matchedSignals: ['security_protocols'],
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects shortlist outside the 3 to 5 range and invalid reason summaries', () => {
    const parsed = recommendationOutputSchema.safeParse({
      ...recommendationOutputFixture,
      routes: [
        {
          ...recommendationOutputFixture.routes[0],
          reasonSummary: 'corto',
        },
        recommendationOutputFixture.routes[1],
      ],
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const issuePaths = parsed.error.issues.map((issue) => issue.path.join('.'));

    expect(issuePaths).toContain('routes');
    expect(issuePaths).toContain('routes.0.reasonSummary');
  });
});
