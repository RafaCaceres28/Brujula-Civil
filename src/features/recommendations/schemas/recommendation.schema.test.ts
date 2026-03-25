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
          explanation: {
            reasonSummary: 'Tu experiencia en instruccion es transferible a formacion civil.',
            fitLabel: 'medio',
            fitScore: 64,
            explanationKeywords: ['training_instruction'],
            decisionGuidance: 'Elige esta ruta si quieres trabajar formando equipos operativos.',
          },
        },
        {
          routeId: 'route-5',
          roleId: 'security-manager',
          sectorId: 'defense_security',
          reasonSummary: 'Tu experiencia en seguridad operacional encaja con proteccion civil.',
          matchedSignals: ['security_protocols'],
          explanation: {
            reasonSummary: 'Tu experiencia en seguridad operacional encaja con proteccion civil.',
            fitLabel: 'alto',
            fitScore: 88,
            explanationKeywords: ['security_protocols'],
            decisionGuidance: 'Priorizala si te interesa continuidad en entornos de seguridad.',
          },
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

  it('rejects invalid explanation labels and empty keywords', () => {
    const parsed = recommendationOutputSchema.safeParse({
      ...recommendationOutputFixture,
      routes: [
        {
          ...recommendationOutputFixture.routes[0],
          explanation: {
            ...recommendationOutputFixture.routes[0].explanation,
            fitLabel: 'invalido',
            explanationKeywords: [],
          },
        },
        recommendationOutputFixture.routes[1],
        recommendationOutputFixture.routes[2],
      ],
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const issuePaths = parsed.error.issues.map((issue) => issue.path.join('.'));

    expect(issuePaths).toContain('routes.0.explanation.fitLabel');
    expect(issuePaths).toContain('routes.0.explanation.explanationKeywords');
  });
});
