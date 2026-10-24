export const MAINTENANCE_MATERIALS = {
  light_vehicles: 'Vehículos ligeros',
  heavy_vehicles: 'Vehículos pesados',
  armoured_vehicles: 'Vehículos blindados',
  communications_equipment: 'Equipos de comunicaciones',
} as const;

export type MaintenanceMaterial = keyof typeof MAINTENANCE_MATERIALS;

const VEHICLES = ['light_vehicles', 'heavy_vehicles', 'armoured_vehicles'] as const;
const COMMUNICATIONS = ['communications_equipment'] as const;

export const MAINTENANCE_OPERATIONS = {
  levels_functioning: {
    label: 'Comprobación de niveles y elementos de funcionamiento',
    category: 'inspect',
    materials: VEHICLES,
  },
  vehicle_cleaning: {
    label: 'Limpieza y conservación',
    category: 'conserve',
    materials: VEHICLES,
  },
  consumables_lubrication: {
    label: 'Reposición de consumibles y lubricación',
    category: 'conserve',
    materials: VEHICLES,
  },
  periodic_checks: {
    label: 'Comprobaciones periódicas de componentes',
    category: 'inspect',
    materials: VEHICLES,
  },
  communications_cleaning: {
    label: 'Limpieza y mantenimiento básico',
    category: 'conserve',
    materials: COMMUNICATIONS,
  },
  batteries: {
    label: 'Carga y comprobación de baterías',
    category: 'conserve',
    materials: COMMUNICATIONS,
  },
  coaxial_repair: {
    label: 'Reparación de cableado coaxial',
    category: 'repair',
    materials: COMMUNICATIONS,
  },
  antenna_repair: {
    label: 'Reparación de antenas',
    category: 'repair',
    materials: COMMUNICATIONS,
  },
  report_faults: {
    label: 'Comunicación y derivación de averías',
    category: 'report',
    materials: [...VEHICLES, ...COMMUNICATIONS],
  },
} as const satisfies Record<
  string,
  { label: string; category: string; materials: readonly MaintenanceMaterial[] }
>;

export type MaintenanceOperation = keyof typeof MAINTENANCE_OPERATIONS;

export function isMaintenanceOperationApplicable(
  material: MaintenanceMaterial,
  operation: MaintenanceOperation,
): boolean {
  return (MAINTENANCE_OPERATIONS[operation].materials as readonly MaintenanceMaterial[]).includes(
    material,
  );
}
