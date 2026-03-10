export const WIZARD_IMPLEMENTATION_NOTES = {
  currentMvpFlow: ['militar', 'experiencia', 'competencias', 'objetivos', 'resumen'],
  databaseEnumFlow: [
    'welcome',
    'personal_info',
    'military_background',
    'missions_achievements',
    'skills_tools',
    'education_certifications',
    'preferences',
    'civil_translation',
    'cv_customization',
    'linkedin_customization',
    'review',
    'completed',
  ],
  note: `
La UI actual implementa una subsecuencia del wizard total definido en base de datos.
El mapeo oficial está centralizado en wizard-steps.ts.
No usar slugs de UI como step_key persistido en Supabase.
Siempre mapear slug -> dbKey.
`.trim(),
} as const;
