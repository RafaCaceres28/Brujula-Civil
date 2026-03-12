export type CatalogOption = {
  value: string;
  label: string;
};

export type RoleOption = {
  slug: string;
  label: string;
};

export const BRANCH_OPTIONS: CatalogOption[] = [
  { value: 'army', label: 'Ejército de Tierra' },
  //{ value: 'navy', label: 'Armada' },
  //{ value: 'air_force', label: 'Ejército del Aire y del Espacio' },
  //{ value: 'guardia_civil', label: 'Guardia Civil' },
  { value: 'common_corps', label: 'Cuerpos Comunes de las FAS' },
  { value: 'other', label: 'Otro' },
];

export const CORPS_OPTIONS: CatalogOption[] = [
  // ARMAS Y CUERPOS DE COMBATE / OPERACIONES
  { value: 'infantry', label: 'Infantería (Ligera / Acorazada)' },
  { value: 'artillery', label: 'Artillería (Campaña / Antiaérea)' },
  { value: 'engineers', label: 'Ingenieros y Zapadores' },
  { value: 'cavalry', label: 'Caballería' },
  { value: 'signals', label: 'Transmisiones / Telecomunicaciones' },

  // CUERPOS LOGÍSTICOS Y TÉCNICOS
  { value: 'logistics', label: 'Logística, Abastecimiento y Transporte' },
  { value: 'maintenance', label: 'Mantenimiento y Especialidades Técnicas' },
  { value: 'security', label: 'Seguridad, Vigilancia y Policía Militar' },
  { value: 'intelligence', label: 'Inteligencia y Guerra Electrónica' },

  // CUERPOS COMUNES Y SERVICIOS
  { value: 'health', label: 'Sanidad y Asistencia Sanitaria' },
  { value: 'administration', label: 'Administración y Gestión Documental' },
  { value: 'training', label: 'Instrucción, Formación y Enseñanza' },
  { value: 'hostelry', label: 'Hostelería y Alimentación' },
  { value: 'music', label: 'Músicas Militares' },

  // OTROS
  { value: 'emergency_response', label: 'Emergencias y Protección Civil (UME)' },
  { value: 'other', label: 'Otras especialidades / Cuerpos Comunes' },
];

export const RANK_OPTIONS: CatalogOption[] = [
  { value: 'soldier', label: 'Soldado' },
  { value: 'corporal', label: 'Cabo' },
  { value: 'p_corporal', label: 'Cabo 1º' },
  { value: 'sergeant', label: 'Sargento' },
  { value: 'p_sergeant', label: 'Sargento 1º' },
  { value: 'staff_sergeant', label: 'Brigada' },
  { value: 'warrant_officer', label: 'Subteniente' },
  { value: 'lieutenant', label: 'Teniente' },
  { value: 'captain', label: 'Capitán' },
  { value: 'major', label: 'Comandante' },
];

export const SPECIALTY_OPTIONS: CatalogOption[] = [
  { value: 'combat_ops', label: 'Operaciones de combate' },
  { value: 'logistics_support', label: 'Logística y apoyo' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'communications', label: 'Comunicaciones / Sistemas' },
  { value: 'cybersecurity', label: 'Ciberseguridad' },
  { value: 'training_instruction', label: 'Formación / Instrucción' },
  { value: 'security_protection', label: 'Seguridad / Protección' },
  { value: 'intelligence_analysis', label: 'Inteligencia / Análisis' },
  { value: 'administration_hr', label: 'Administración / RR. HH.' },
  { value: 'healthcare', label: 'Sanidad' },
  { value: 'emergency_response', label: 'Respuesta a Emergencias' },
  { value: 'other', label: 'Otra' },
];

export const DESTINATION_CONTEXT_OPTIONS: CatalogOption[] = [
  { value: 'ops_unit', label: 'Unidad Operativa (Fuerza)' },
  { value: 'hq_staff', label: 'Estado Mayor / Órgano de Gestión' },
  { value: 'logistics_center', label: 'Centro Logístico / Abastecimiento' },
  { value: 'maintenance_center', label: 'Centro de Mantenimiento Industrial / Escalón' },
  { value: 'training_academy', label: 'Academia / Centro de Formación' },
  { value: 'base_services', label: 'Gestión de Infraestructuras y Servicios (USBA)' },
  { value: 'int_deployment', label: 'Destino / Estructura Internacional (No misión)' },
];

export const LEADERSHIP_LEVEL_OPTIONS: CatalogOption[] = [
  // NIVELES DE MANDO (OFICIALES / SUBOFICIALES)
  { value: 'unit_commander', label: 'Mando de Unidad (Compañía / Batería / Escuadrón)' },
  { value: 'section_lead', label: 'Mando de Sección / Pelotón' },
  { value: 'area_department_lead', label: 'Responsable de Negociado o Área Técnica' },

  // NIVELES OPERATIVOS (CABOS 1º / CABOS / TROPA VETERANA)
  { value: 'small_team_lead', label: 'Jefe de Escuadra / Equipo / Pieza' },
  { value: 'technical_coordination', label: 'Coordinador de Servicios o Talleres' },
  { value: 'shift_lead', label: 'Jefe de Retén / Responsable de Turno' },

  // NIVELES DE EJECUCIÓN (TROPA)
  { value: 'specialist_autonomy', label: 'Especialista con autonomía (sin personal a cargo)' },
  { value: 'individual_contributor', label: 'Ejecución de cometidos y tareas operativas' },
];

export const TEAM_SIZE_OPTIONS: CatalogOption[] = [
  { value: '0', label: '0 personas' },
  { value: '1_5', label: '1 a 5 personas' },
  { value: '6_15', label: '6 a 15 personas' },
  { value: '16_40', label: '16 a 40 personas' },
  { value: '41_100', label: '41 a 100 personas' },
  { value: '100_plus', label: 'Más de 100 personas' },
];

export const RESPONSIBILITY_AREA_OPTIONS: CatalogOption[] = [
  { value: 'operations', label: 'Operaciones y Ejecución' },
  { value: 'logistics', label: 'Logística y Almacén' },
  { value: 'security', label: 'Seguridad y Vigilancia' },
  { value: 'planning', label: 'Planificación y Turnos' },
  { value: 'training', label: 'Formación e Instrucción' },
  { value: 'maintenance', label: 'Mantenimiento Técnico' },
  { value: 'team_management', label: 'Gestión de Equipos' },
  { value: 'compliance', label: 'Cumplimiento de Normativa y Protocolos' },
  { value: 'communications', label: 'Comunicaciones y Sistemas' },
  { value: 'administration', label: 'Administración y Gestión Documental' },
];

export const MISSION_TYPE_OPTIONS: CatalogOption[] = [
  { value: 'intl_stability', label: 'Misión Internacional: Seguridad y Estabilidad' },
  { value: 'intl_humanitarian', label: 'Misión Internacional: Asistencia Humanitaria' },
  { value: 'intl_mentoring', label: 'Misión Internacional: Formación y Consultoría (LTT)' },
  { value: 'emergency_response', label: 'Intervención en Emergencias y Catástrofes' },
  { value: 'homeland_security', label: 'Operaciones de Seguridad y Vigilancia Nacional' },
  { value: 'high_intensity_exercise', label: 'Ejercicios de Certificación (Alta Intensidad)' },
  { value: 'logistics_projection', label: 'Despliegues Logísticos y Proyección de Fuerza' },
  { value: 'intelligence_ops', label: 'Operaciones de Inteligencia y Análisis' },
  { value: 'support_national', label: 'Apoyo Operativo en Territorio Nacional' },
];

export const FUNCTION_TYPE_OPTIONS: CatalogOption[] = [
  { value: 'op_maintenance', label: 'Mantenimiento y Puesta a Punto' },
  { value: 'logistics_supply', label: 'Recepción y Distribución de Material' },
  { value: 'team_supervision', label: 'Control y Supervisión de Personal' },
  { value: 'technical_instruction', label: 'Instrucción y Adiestramiento Técnico' },
  { value: 'facility_security', label: 'Protección y Control de Accesos' },
  { value: 'emergency_first_aid', label: 'Intervención y Primeros Auxilios' },
  { value: 'administrative_support', label: 'Gestión Documental y de Personal' },
  { value: 'equipment_operation', label: 'Operación de Equipos y Maquinaria' },
  { value: 'coordination', label: 'Coordinación' },
  { value: 'execution', label: 'Ejecución operativa' },
  { value: 'supervision', label: 'Supervisión' },
  { value: 'instruction', label: 'Instrucción' },
  { value: 'analysis', label: 'Análisis' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'resource_management', label: 'Gestión de recursos' },
  { value: 'incident_management', label: 'Gestión de incidencias' },
];

export const TOOL_OPTIONS: CatalogOption[] = [
  { value: 'office_suite', label: 'Paquete Office (Excel, Word)' },
  { value: 'erp', label: 'Software de Gestión (ERP/SIPERDEF)' },
  { value: 'radio_comms', label: 'Equipos de Radio y Transmisiones' },
  { value: 'tracking_systems', label: 'Sistemas de Seguimiento y GPS' },
  { value: 'security_systems', label: 'Sistemas de Seguridad y CCTV' },
  { value: 'maintenance_tools', label: 'Herramientas de Diagnóstico y Mecánica' },
  { value: 'data_analysis', label: 'Herramientas de Registro de Datos' },
];

export const LEADERSHIP_SCOPE_OPTIONS: CatalogOption[] = [
  // MANDO Y DIRECCIÓN (OFICIALES Y SUBOFICIALES)
  { value: 'strategic_direction', label: 'Dirección estratégica y mando de grandes unidades' },
  {
    value: 'operational_planning',
    label: 'Planificación operativa y gestión de recursos críticos',
  },
  {
    value: 'institutional_coordination',
    label: 'Coordinación con organismos externos e instituciones',
  },
  { value: 'project_management', label: 'Dirección de proyectos, programas y presupuestos' },
  {
    value: 'unit_leadership',
    label: 'Mando y dirección de unidad operativa (Pelotón/Sección/Cía)',
  },
  { value: 'process_optimization', label: 'Responsable de mejora de procesos y normativa' },
  {
    value: 'resource_administration',
    label: 'Administración de personal y gestión de expedientes',
  },

  // SUPERVISIÓN Y COORDINACIÓN TÉCNICA (CABOS 1º Y SUBOFICIALES)
  { value: 'technical_supervision', label: 'Supervisión técnica y control de calidad de trabajos' },
  { value: 'team_supervision', label: 'Supervisión de pequeños equipos (Escuadra / Equipo)' },
  {
    value: 'facility_coordination',
    label: 'Coordinación de servicios y mantenimiento de instalaciones',
  },
  { value: 'training_instruction', label: 'Instrucción y adiestramiento de personal subordinado' },

  // AUTONOMÍA Y RESPONSABILIDAD OPERATIVA (CABOS Y SOLDADOS VETERANOS)
  { value: 'material_custody', label: 'Responsabilidad de material, cargo y activos de la unidad' },
  { value: 'warehouse_management', label: 'Gestión operativa de almacén, suministros y repuestos' },
  { value: 'autonomous_specialist', label: 'Especialista técnico con autonomía en la ejecución' },
  {
    value: 'vehicle_fleet_responsibility',
    label: 'Responsable de mantenimiento y operatividad de flota',
  },
  { value: 'security_protocol_lead', label: 'Responsable de retén o equipo de seguridad física' },

  // EJECUCIÓN Y TAREAS TÉCNICAS (SOLDADOS)
  { value: 'task_verification', label: 'Verificación de estándares de seguridad y procedimientos' },
  { value: 'technical_execution', label: 'Ejecución técnica especializada (Sistemas / Mecánica)' },
  { value: 'logistics_operator', label: 'Operador de logística, carga y distribución' },
  { value: 'operational_execution', label: 'Ejecución técnica de tareas bajo directrices' },
  { value: 'individual_autonomy', label: 'Autonomía técnica y cumplimiento de cometidos' },
];

export const TECHNICAL_SKILL_OPTIONS: CatalogOption[] = [
  { value: 'industrial_maintenance', label: 'Mantenimiento preventivo y correctivo' },
  { value: 'warehouse_inventory', label: 'Gestión de almacén e inventariado' },
  { value: 'security_protocols', label: 'Aplicación de protocolos de seguridad física' },
  { value: 'machinery_ops', label: 'Operación de maquinaria y vehículos pesados' },
  { value: 'logistics_distribution', label: 'Carga, estiba y distribución logística' },
  { value: 'administrative_support', label: 'Gestión administrativa y ofimática básica' },
  { value: 'emergency_first_response', label: 'Primer interviniente en emergencias' },
  { value: 'operations_management', label: 'Gestión de operaciones' },
  { value: 'logistics_management', label: 'Gestión logística' },
  { value: 'process_improvement', label: 'Mejora de procesos' },
  { value: 'team_coordination', label: 'Coordinación de equipos' },
  { value: 'risk_management', label: 'Gestión de riesgos' },
  { value: 'incident_response', label: 'Respuesta a incidencias' },
  { value: 'documentation', label: 'Documentación / reporting' },
  { value: 'training_delivery', label: 'Impartición de formación' },
  { value: 'systems_usage', label: 'Uso de sistemas y herramientas' },
  { value: 'data_tracking', label: 'Seguimiento de datos / KPIs' },
];

export const SOFT_SKILL_OPTIONS: CatalogOption[] = [
  { value: 'leadership', label: 'Liderazgo y Dirección' },
  { value: 'discipline', label: 'Disciplina y Compromiso' },
  { value: 'adaptability', label: 'Adaptabilidad al Entorno' },
  { value: 'decision_making', label: 'Toma de Decisiones' },
  { value: 'communication', label: 'Comunicación Efectiva' },
  { value: 'resilience', label: 'Resiliencia y Trabajo bajo Presión' },
  { value: 'teamwork', label: 'Trabajo en Equipo' },
  { value: 'problem_solving', label: 'Resolución de Problemas' },
  { value: 'accountability', label: 'Sentido de la Responsabilidad' },
  { value: 'attention_to_detail', label: 'Atención al Detalle / Rigor' },
];

export const CERTIFICATION_OPTIONS: CatalogOption[] = [
  // SEGURIDAD Y PREVENCIÓN
  { value: 'prl_basico', label: 'Prevención de Riesgos Laborales (Básico/Recurso)' },
  { value: 'tip_seguridad', label: 'Habilitación Seguridad Privada (TIP)' },
  {
    value: 'seguridad_quimica_nbq',
    label: 'Especialista en Protección NBQ / Sustancias Peligrosas',
  },

  // SANIDAD
  { value: 'sanitario_emergencias', label: 'Soporte Vital Básico y Desfibrilador (DESA)' },
  { value: 'first_aid_advanced', label: 'Primeros Auxilios Avanzados / Socorrismo' },

  // TÉCNICOS Y MAQUINARIA
  { value: 'maquinaria_especial', label: 'Operador de Maquinaria Pesada (Movimiento de tierras)' },
  { value: 'forklift_operator', label: 'Operador de Carretillas Elevadoras' },
  { value: 'piloto_drones', label: 'Licencia de Piloto de Drones (AESA/Militar)' },
  {
    value: 'mantenimiento_tecnico',
    label: 'Certificado de Profesionalidad (Mantenimiento/Mecánica)',
  },

  // IDIOMAS Y ACADÉMICO
  { value: 'slp_ingles', label: 'Acreditación de Idiomas (SLP / Marco Europeo)' },
  { value: 'tecnico_militar_fp', label: 'Título de Técnico Militar (Equivalencia FP)' },

  // GESTIÓN
  { value: 'quality_iso', label: 'Gestión de Calidad e ISO' },
  { value: 'project_management_cert', label: 'Certificación en Gestión de Proyectos' },
  { value: 'other', label: 'Otras certificaciones oficiales' },
];

export const DRIVING_LICENSE_OPTIONS: CatalogOption[] = [
  // MOTOCICLETAS
  { value: 'a1', label: 'Permiso A1 (Motocicletas hasta 125cc)' },
  { value: 'a2', label: 'Permiso A2 (Motocicletas hasta 35kW)' },
  { value: 'a', label: 'Permiso A (Motocicletas sin límite)' },

  // TURISMOS Y REMOLQUES LIGEROS
  { value: 'b', label: 'Permiso B (Turismos)' },
  { value: 'be', label: 'Permiso BE (Turismo con remolque pesado)' },

  // CAMIONES (FUNDAMENTAL PARA LOGÍSTICA MILITAR)
  { value: 'c1', label: 'Permiso C1 (Camión ligero 3.5t - 7.5t)' },
  { value: 'c', label: 'Permiso C (Camión pesado)' },
  { value: 'ce', label: 'Permiso CE (Tráiler / Vehículo articulado)' },

  // AUTOBUSES
  { value: 'd1', label: 'Permiso D1 (Microbús)' },
  { value: 'd', label: 'Permiso D (Autobús)' },
  { value: 'de', label: 'Permiso DE (Autobús con remolque)' },

  // CERTIFICACIONES PROFESIONALES ASOCIADAS
  { value: 'cap_mercancias', label: 'CAP Mercancías (En vigor)' },
  { value: 'cap_viajeros', label: 'CAP Viajeros (En vigor)' },
  { value: 'adr_basico', label: 'ADR Básico (Mercancías Peligrosas)' },
  { value: 'adr_cisternas', label: 'ADR Cisternas' },
  { value: 'adr_explosivos', label: 'ADR Explosivos (Muy común en ET)' },
];

export const LANGUAGE_OPTIONS: CatalogOption[] = [
  { value: 'spanish', label: 'Español' },
  { value: 'english', label: 'Inglés' },
  { value: 'french', label: 'Francés' },
  { value: 'german', label: 'Alemán' },
  { value: 'italian', label: 'Italiano' },
  { value: 'portuguese', label: 'Portugués' },
  { value: 'other', label: 'Otro' },
];

export const LANGUAGE_LEVEL_OPTIONS: CatalogOption[] = [
  { value: 'basic', label: 'Básico' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
  { value: 'bilingual', label: 'Bilingüe / profesional' },
];

export const OFFICE_TOOL_OPTIONS: CatalogOption[] = [
  { value: 'windows', label: 'Sistemas Operativos (Windows / Linux)' },
  { value: 'word', label: 'Procesadores de Texto (Word / Documentos)' },
  { value: 'excel', label: 'Hojas de Cálculo (Excel / Gestión de Datos)' },
  { value: 'powerpoint', label: 'Presentaciones (PowerPoint / Informes)' },
  { value: 'email', label: 'Gestión de Correo y Calendarios (Outlook)' },
  { value: 'collaboration_tools', label: 'Herramientas de Trabajo en Equipo (Teams / Meet)' },
  { value: 'reporting_tools', label: 'Gestión Documental y Reportes' },
  {
    value: 'specialized_management',
    label: 'Software de Gestión Específica (ERP / Bases de Datos)',
  },
];

export const TARGET_ROLE_OPTIONS: RoleOption[] = [
  { slug: 'project-manager', label: 'Gestor de Proyectos y Operaciones' },
  { slug: 'operations-coordinator', label: 'Coordinador de Operaciones y Logística' },
  { slug: 'logistics-specialist', label: 'Especialista en Logística y Almacén' },
  { slug: 'security-manager', label: 'Responsable de Seguridad y Protección' },
  { slug: 'training-specialist', label: 'Especialista en Formación y Capacitación' },
  { slug: 'team-lead', label: 'Jefe de Equipo / Supervisor' },
  { slug: 'compliance-technician', label: 'Técnico de Cumplimiento y Normativa' },
  { slug: 'administrative-coordinator', label: 'Coordinador Administrativo y de Personal' },
  { slug: 'jefe-equipo-mantenimiento', label: 'Jefe de Equipo / Responsable de Mantenimiento' },
  { slug: 'encargado-logistica-almacen', label: 'Encargado de Logística y Almacén' },
  { slug: 'tecnico-seguridad-activos', label: 'Técnico de Seguridad y Protección de Activos' },
  {
    slug: 'coordinador-servicios-generales',
    label: 'Coordinador de Servicios Generales (Facility)',
  },
  { slug: 'supervisor-operaciones-campo', label: 'Supervisor de Operaciones y Montajes' },
  { slug: 'instructor-formacion-tecnica', label: 'Instructor de Formación Técnica / PRL' },
  { slug: 'tecnico-emergencias-proteccion', label: 'Técnico de Emergencias y Protección Civil' },
  {
    slug: 'conductor-transporte-especializado',
    label: 'Conductor de Transporte Especializado / Flotas',
  },
  { slug: 'jefe-equipo-seguridad-privada', label: 'Jefe de Equipo de Seguridad Privada' },
  { slug: 'gestor-inventario-suministros', label: 'Gestor de Inventario y Suministros' },
  {
    slug: 'tecnico-mantenimiento-electromecanico',
    label: 'Técnico de Mantenimiento Electromecánico',
  },
  { slug: 'coordinador-logistica-ultima-milla', label: 'Coordinador de Logística y Distribución' },
  {
    slug: 'operador-centro-control-emergencias',
    label: 'Operador de Centro de Control y Emergencias',
  },
  {
    slug: 'especialista-proteccion-incendios',
    label: 'Especialista en Prevención y Protección de Incendios',
  },
  {
    slug: 'encargado-obra-civil-instalaciones',
    label: 'Encargado de Obra y Mantenimiento de Instalaciones',
  },
  { slug: 'tecnico-gestion-flotas-vehiculos', label: 'Técnico en Gestión de Flotas de Vehículos' },
  {
    slug: 'auxiliar-administrativo-oficialia',
    label: 'Auxiliar Administrativo / Gestión Documental',
  },
  { slug: 'monitor-actividades-aire-libre', label: 'Monitor de Actividades Técnicas / Aire Libre' },
];

export const TARGET_SECTOR_OPTIONS: CatalogOption[] = [
  { value: 'logistics', label: 'Logística y Transporte' },
  { value: 'industry', label: 'Industria y Fabricación' },
  { value: 'defense_security', label: 'Seguridad Privada y Defensa' },
  { value: 'transport', label: 'Transporte de Mercancías/Viajeros' },
  { value: 'technology', label: 'IT y Telecomunicaciones' },
  { value: 'training', label: 'Educación y Formación' },
  { value: 'public_sector', label: 'Administración Pública / Oposiciones' },
  { value: 'consulting', label: 'Servicios de Consultoría' },
];

export const WORK_MODEL_OPTIONS: CatalogOption[] = [
  { value: 'onsite', label: 'Presencial' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'remote', label: 'Remoto' },
];

export const SENIORITY_OPTIONS: CatalogOption[] = [
  { value: 'junior', label: 'Nivel Inicial (Junior)' },
  { value: 'mid', label: 'Nivel Intermedio' },
  { value: 'senior', label: 'Nivel Especialista (Senior)' },
  { value: 'manager', label: 'Responsable / Jefe de Equipo' },
];

export const LOCATION_OPTIONS: CatalogOption[] = [
  { value: 'alava', label: 'Álava' },
  { value: 'albacete', label: 'Albacete' },
  { value: 'alicante', label: 'Alicante' },
  { value: 'almeria', label: 'Almería' },
  { value: 'asturias', label: 'Asturias' },
  { value: 'avila', label: 'Ávila' },
  { value: 'badajoz', label: 'Badajoz' },
  { value: 'barcelona', label: 'Barcelona' },
  { value: 'burgos', label: 'Burgos' },
  { value: 'caceres', label: 'Cáceres' },
  { value: 'cadiz', label: 'Cádiz' },
  { value: 'cantabria', label: 'Cantabria' },
  { value: 'castellon', label: 'Castellón' },
  { value: 'ciudad_real', label: 'Ciudad Real' },
  { value: 'cordoba', label: 'Córdoba' },
  { value: 'cuenca', label: 'Cuenca' },
  { value: 'girona', label: 'Girona' },
  { value: 'granada', label: 'Granada' },
  { value: 'guadalajara', label: 'Guadalajara' },
  { value: 'gipuzkoa', label: 'Gipuzkoa' },
  { value: 'huelva', label: 'Huelva' },
  { value: 'huesca', label: 'Huesca' },
  { value: 'illes_balears', label: 'Illes Balears' },
  { value: 'jaen', label: 'Jaén' },
  { value: 'a_coruna', label: 'A Coruña' },
  { value: 'la_rioja', label: 'La Rioja' },
  { value: 'las_palmas', label: 'Las Palmas' },
  { value: 'leon', label: 'León' },
  { value: 'lleida', label: 'Lleida' },
  { value: 'lugo', label: 'Lugo' },
  { value: 'madrid', label: 'Madrid' },
  { value: 'malaga', label: 'Málaga' },
  { value: 'murcia', label: 'Murcia' },
  { value: 'navarra', label: 'Navarra' },
  { value: 'ourense', label: 'Ourense' },
  { value: 'palencia', label: 'Palencia' },
  { value: 'pontevedra', label: 'Pontevedra' },
  { value: 'salamanca', label: 'Salamanca' },
  { value: 'santa_cruz_de_tenerife', label: 'Santa Cruz de Tenerife' },
  { value: 'segovia', label: 'Segovia' },
  { value: 'sevilla', label: 'Sevilla' },
  { value: 'soria', label: 'Soria' },
  { value: 'tarragona', label: 'Tarragona' },
  { value: 'teruel', label: 'Teruel' },
  { value: 'toledo', label: 'Toledo' },
  { value: 'valencia', label: 'Valencia' },
  { value: 'valladolid', label: 'Valladolid' },
  { value: 'bizkaia', label: 'Bizkaia' },
  { value: 'zamora', label: 'Zamora' },
  { value: 'zaragoza', label: 'Zaragoza' },
  { value: 'ceuta', label: 'Ceuta' },
  { value: 'melilla', label: 'Melilla' },
  { value: 'remote_anywhere', label: 'Remoto / cualquier ubicación' },
];
