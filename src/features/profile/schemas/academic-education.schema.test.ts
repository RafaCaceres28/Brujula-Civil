import { describe, expect, it } from 'vitest';
import {
  academicEducationSchema,
  academicStudySchema,
  saveAcademicEducationSchema,
} from './academic-education.schema';

const study = { id: 'study-1', title: ' Estudios propios ', status: 'in_progress' };

describe('academic education canonical boundary', () => {
  it('normalizes only declared data without inventing a year, institution or completed status', () => {
    expect(academicStudySchema.parse(study)).toEqual({
      ...study,
      title: 'Estudios propios',
      institution: null,
      year: null,
    });
    expect(
      academicStudySchema.parse({ ...study, institution: ' Centro ', year: 2030 }),
    ).toMatchObject({ institution: 'Centro', year: 2030, status: 'in_progress' });
    expect(
      academicStudySchema.parse({ ...study, institution: ' ', year: null }).institution,
    ).toBeNull();
  });
  it.each([
    { title: ' ' },
    { title: 'a'.repeat(201) },
    { institution: 'a'.repeat(201) },
    { year: 999 },
    { year: 10000 },
    { year: 2025.5 },
    { year: '2025' },
    { status: undefined },
    { status: 'obtained' },
    { id: 'bad id' },
    { diploma: true },
  ])('rejects invalid or unknown data: %j', (patch) => {
    expect(academicStudySchema.safeParse({ ...study, ...patch }).success).toBe(false);
  });
  it('preserves null versus explicit empty, order and stable unique IDs', () => {
    expect(saveAcademicEducationSchema.parse({ expected: null, academicEducation: [] })).toEqual({
      expected: null,
      academicEducation: [],
    });
    expect(
      academicEducationSchema
        .parse([study, { ...study, id: 'study-2', status: 'completed' }])
        .map(({ id }) => id),
    ).toEqual(['study-1', 'study-2']);
    expect(academicEducationSchema.safeParse([study, study]).success).toBe(false);
    expect(
      saveAcademicEducationSchema.safeParse({
        expected: [],
        academicEducation: [],
        userId: 'foreign',
      }).success,
    ).toBe(false);
  });
});
