// Local details of the instruction activity, not military specialties or qualifications.
export const INSTRUCTION_ACTIVITIES = {
  received_training: 'Recibía instrucción o formación',
  practiced_exercises: 'Participaba en ejercicios y prácticas',
  demonstrated: 'Realizaba demostraciones para apoyar al instructor',
  explained_to_peers: 'Explicaba procedimientos o contenidos a compañeros',
  prepared_and_delivered: 'Preparaba y explicaba contenidos o prácticas',
} as const;

export type InstructionActivity = keyof typeof INSTRUCTION_ACTIVITIES;
