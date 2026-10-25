import { describe, expect, it } from 'vitest';
import { structuredExperienceSchema } from './structured-experience.schema';

const base = { id: 'other-tasks', activity: 'analysis' };
const task = { description: 'Revisaba documentos', target: 'Documentación administrativa' };

describe('optional canonical otherTasks', () => {
  it('keeps old experiences unchanged and accepts trimmed tasks for any activity', () => {
    expect(structuredExperienceSchema.parse(base)).toEqual(base);
    for (const activity of ['analysis', 'instruction', 'op_maintenance']) {
      expect(
        structuredExperienceSchema.parse({
          ...base,
          activity,
          otherTasks: [{ description: ' Revisaba documentos ', target: ' Documentación ' }],
        }).otherTasks,
      ).toEqual([{ description: 'Revisaba documentos', target: 'Documentación' }]);
    }
    expect(
      structuredExperienceSchema.safeParse({ ...base, otherTasks: Array(5).fill(task) }).success,
    ).toBe(true);
    expect(
      structuredExperienceSchema.safeParse({
        ...base,
        otherTasks: [{ description: 'a'.repeat(200), target: 'b'.repeat(200) }],
      }).success,
    ).toBe(true);
  });

  it.each(
    [
      null,
      [],
      [{}],
      [{ description: ' ', target: 'Documentos' }],
      [{ description: 'Revisaba', target: '' }],
      [{ ...task, target: null }],
      [{ ...task, description: 'a'.repeat(201) }],
      [{ ...task, target: 'b'.repeat(201) }],
      [{ ...task, competency: 'inferred' }],
      Array(6).fill(task),
    ].map((value) => [value]),
  )('rejects malformed or oversized tasks: %j', (otherTasks) => {
    expect(structuredExperienceSchema.safeParse({ ...base, otherTasks }).success).toBe(false);
  });
});
