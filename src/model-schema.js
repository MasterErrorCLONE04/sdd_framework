/**
 * SDD Project Model v2 — Especificación Formal, Esquemas y Normalizadores
 * Única Fuente de Verdad (Single Source of Truth) para planificación y desarrollo AI-Native.
 */

export const STAGES = [
  'discovery',
  'product',
  'requirements',
  'flows',
  'architecture',
  'database',
  'api',
  'ux',
  'execution',
  'validation',
  'ready'
]

/**
 * Genera el estado inicial canónico del Project Model v2.
 */
export function createDefaultProjectModel(projectName = 'Nuevo Proyecto', options = {}) {
  const timestamp = new Date().toISOString()
  const slug = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')

  return {
    version: '2.0.0',
    meta: {
      id: slug,
      name: projectName,
      tagline: options.tagline || 'Proyecto gobernado por Spec-Driven Development (SDD)',
      description: options.description || '',
      status: 'planning',
      stage: 'discovery',
      progress: 5,
      completedStages: [],
      createdAt: timestamp,
      lastUpdated: timestamp,
      author: options.author || 'SDD Studio'
    },
    core: {
      constitution: {
        title: 'Constitución de Ingeniería & Invariantes Técnicos',
        version: '1.0.0',
        principles: [
          {
            id: 'const-1',
            category: 'Code Quality',
            name: 'Tipado Estricto & Cero Dependencias Invasivas',
            rule: 'El código debe ser modular, tipado y evitar librerías invasivas sin justificación explícita.',
            severity: 'mandatory',
            status: 'active'
          },
          {
            id: 'const-2',
            category: 'Testing & Convergence',
            name: 'Criterios Gherkin Ejecutables',
            rule: 'Toda funcionalidad debe acompañarse de verificación de criterios Dado-Cuando-Entonces antes del cierre.',
            severity: 'mandatory',
            status: 'active'
          },
          {
            id: 'const-3',
            category: 'Scope Isolation',
            name: 'Escudo de Deriva (Scope Shield)',
            rule: 'Los agentes de IA tienen estrictamente prohibido modificar archivos fuera de los declarados en scopeFiles.',
            severity: 'mandatory',
            status: 'active'
          },
          {
            id: 'const-4',
            category: 'Architecture',
            name: 'Separación Limpia de Capas',
            rule: 'La lógica de negocio debe residir en servicios desacoplados de la presentación visual y del transporte HTTP.',
            severity: 'mandatory',
            status: 'active'
          },
          {
            id: 'const-5',
            category: 'Security & Resilience',
            name: 'Manejo Defensivo de Datos & Secretos',
            rule: 'Nunca quemar claves API o credenciales en código ni en artefactos expuestos al cliente.',
            severity: 'mandatory',
            status: 'active'
          }
        ]
      },
      decisions: []
    },
    product: {
      vision: {
        problem: '',
        targetAudience: '',
        valueProposition: '',
        coreGoals: [],
        successMetrics: []
      },
      scope: {
        inScopeV1: [],
        explicitNonGoals: ['App móvil nativa en V1', 'Arquitectura distribuida innecesaria inicial'],
        futureBacklog: []
      },
      actors: [
        {
          id: 'actor-user',
          name: 'Usuario Estándar',
          role: 'user',
          description: 'Usuario principal que interactúa con la aplicación.'
        },
        {
          id: 'actor-admin',
          name: 'Administrador',
          role: 'admin',
          description: 'Gestor del sistema con permisos globales de configuración.'
        }
      ],
      modules: []
    },
    requirements: {
      epics: [],
      userStories: [],
      businessRules: []
    },
    flows: {
      userFlows: [],
      businessFlows: []
    },
    architecture: {
      topology: {
        services: [
          {
            id: 'app-core',
            label: 'Aplicación Principal',
            type: 'Backend / Web',
            tech: 'Node.js',
            status: 'online',
            healthPercent: 100,
            description: 'Servicio base del sistema.',
            submodules: []
          }
        ]
      },
      stack: {
        frontend: { framework: 'Vanilla / Web', language: 'JavaScript / TypeScript' },
        backend: { framework: 'Node.js', runtime: 'Node >= 18' },
        database: { engine: 'PostgreSQL / SQLite', orm: 'Prisma / SQL' },
        deployment: { target: 'Docker / Cloud' }
      },
      decisions: []
    },
    database: {
      tables: [],
      relationships: []
    },
    api: {
      endpoints: [],
      contracts: []
    },
    sequences: [],
    uiUx: {
      screens: [],
      components: [],
      wireframes: [],
      designSystem: {
        theme: 'modern-clean',
        primaryColor: '#7c3aed',
        accentColor: '#10b981',
        fontFamily: 'Inter, sans-serif'
      }
    },
    execution: {
      phases: [
        { id: 'phase-1', name: 'Fase 1: Fundación & Modelos', order: 1, status: 'planned', taskIds: [] },
        { id: 'phase-2', name: 'Fase 2: Lógica & API', order: 2, status: 'planned', taskIds: [] },
        { id: 'phase-3', name: 'Fase 3: Interfaz & UX', order: 3, status: 'planned', taskIds: [] },
        { id: 'phase-4', name: 'Fase 4: Verificación & Cierre', order: 4, status: 'planned', taskIds: [] }
      ],
      tasks: [],
      activeTask: null
    },
    governance: {
      qualityGates: [
        { id: 'gate-problem', name: 'Definición de Problema & Valor', stage: 'discovery', status: 'pending' },
        { id: 'gate-scope', name: 'Límites de Alcance & Non-Goals', stage: 'product', status: 'pending' },
        { id: 'gate-requirements', name: 'Historias con Criterios Gherkin', stage: 'requirements', status: 'pending' },
        { id: 'gate-architecture', name: 'Topología & Base de Datos', stage: 'architecture', status: 'pending' },
        { id: 'gate-tasks', name: 'Plan de Tareas con Scope Shield', stage: 'execution', status: 'pending' }
      ]
    }
  }
}

/**
 * Normaliza y valida una Regla de Negocio (BR-XXX)
 */
export function normalizeBusinessRule(br, index = 0) {
  const code = br.code || br.id || `BR-${String(index + 1).padStart(3, '0')}`
  return {
    id: br.id || code,
    code,
    title: br.title || br.rule?.slice(0, 60) || `Regla de Negocio ${index + 1}`,
    rule: br.rule || br.statement || br.description || '',
    category: br.category || 'Business Logic',
    severity: br.severity || 'mandatory',
    enforcedAt: Array.isArray(br.enforcedAt) && br.enforcedAt.length > 0 ? br.enforcedAt : ['api', 'ui'],
    relatedStories: Array.isArray(br.relatedStories) ? br.relatedStories : [],
    relatedFlows: Array.isArray(br.relatedFlows) ? br.relatedFlows : [],
    status: br.status || 'active'
  }
}

/**
 * Normaliza y valida un Flujo de Usuario (Ruta cognitiva y navegación por pantallas)
 */
export function normalizeUserFlow(uf, index = 0) {
  const id = uf.id || `uf-${String(index + 1).padStart(2, '0')}`
  return {
    id,
    name: uf.name || uf.title || `Flujo de Usuario ${index + 1}`,
    actorId: uf.actorId || uf.actor || 'actor-user',
    actor: uf.actor || 'Usuario',
    startScreen: uf.startScreen || '/',
    endScreen: uf.endScreen || '/dashboard',
    description: uf.description || `Recorrido de interacción para ${uf.name || 'el usuario'}.`,
    steps: Array.isArray(uf.steps) && uf.steps.length > 0
      ? uf.steps.map((st, i) => ({
          order: st.order || i + 1,
          screen: st.screen || '/',
          action: st.action || 'Interacción',
          outcome: st.outcome || 'Confirmación'
        }))
      : [
          { order: 1, screen: '/', action: 'Ingreso al sistema', outcome: 'Carga de pantalla principal' }
        ]
  }
}

/**
 * Normaliza y valida un Flujo de Negocio (Pipeline transaccional y servicios del backend)
 */
export function normalizeBusinessFlow(bf, index = 0) {
  const id = bf.id || `flow-${String(index + 1).padStart(2, '0')}`
  return {
    id,
    name: bf.name || bf.title || `Proceso de Negocio ${index + 1}`,
    description: bf.description || 'Pipeline transaccional del sistema.',
    priority: bf.priority || 'P0',
    progress: typeof bf.progress === 'number' ? bf.progress : 0,
    origin: bf.origin || 'spec',
    trigger: bf.trigger || 'Petición o evento disparador del sistema',
    nodes: Array.isArray(bf.nodes) ? bf.nodes : [],
    edges: Array.isArray(bf.edges) ? bf.edges : [],
    relatedStories: Array.isArray(bf.relatedStories) ? bf.relatedStories : [],
    relatedRules: Array.isArray(bf.relatedRules) ? bf.relatedRules : []
  }
}

/**
 * Normaliza y valida el Stack Tecnológico formal del proyecto
 */
export function normalizeTechStack(st = {}) {
  const isObj = (v) => typeof v === 'object' && v !== null
  return {
    frontend: {
      framework: (isObj(st.frontend) ? st.frontend.framework : st.frontend) || 'Vanilla / Modern Web',
      language: (isObj(st.frontend) ? st.frontend.language : null) || 'JavaScript / TypeScript',
      styling: (isObj(st.frontend) ? st.frontend.styling : null) || 'Vanilla CSS / Tailwind',
      stateManagement: (isObj(st.frontend) ? st.frontend.stateManagement : null) || 'Native Reactive State'
    },
    backend: {
      framework: (isObj(st.backend) ? st.backend.framework : st.backend) || 'Node.js REST API',
      runtime: (isObj(st.backend) ? st.backend.runtime : null) || 'Node >= 18',
      architecturePattern: (isObj(st.backend) ? st.backend.architecturePattern : null) || 'Layered Services'
    },
    database: {
      engine: (isObj(st.database) ? st.database.engine : st.database) || 'PostgreSQL / SQLite',
      orm: (isObj(st.database) ? st.database.orm : null) || 'Prisma / SQL'
    },
    auth: {
      strategy: (isObj(st.auth) ? st.auth.strategy : st.auth) || 'JWT / Session Bearer',
      rbac: isObj(st.auth) && st.auth.rbac !== undefined ? Boolean(st.auth.rbac) : true
    },
    deployment: {
      target: (isObj(st.deployment) ? st.deployment.target : st.deployment) || 'Docker / Cloud',
      ciCd: (isObj(st.deployment) ? st.deployment.ciCd : null) || 'GitHub Actions'
    }
  }
}

/**
 * Normaliza y valida un Endpoint de API Declarativo
 */
export function normalizeEndpoint(ep, index = 0) {
  const id = ep.id || `api-${String(index + 1).padStart(2, '0')}`
  const method = (ep.method || 'GET').toUpperCase()
  return {
    id,
    method,
    path: ep.path || ep.route || `/api/v1/resource-${index + 1}`,
    summary: ep.summary || ep.description || `Operación ${method} sobre ${ep.path || 'el recurso'}`,
    actor: ep.actor || ep.requiredRole || 'user',
    authRequired: ep.authRequired !== undefined ? Boolean(ep.authRequired) : (ep.actor !== 'public'),
    requestDto: ep.requestDto || (method !== 'GET' ? 'PayloadDTO' : null),
    responseDto: ep.responseDto || 'ResponseDTO',
    statusCodes: Array.isArray(ep.statusCodes) && ep.statusCodes.length > 0 ? ep.statusCodes : (method === 'POST' ? [201, 400, 401, 500] : [200, 400, 401, 404, 500]),
    relatedRuleIds: Array.isArray(ep.relatedRuleIds) ? ep.relatedRuleIds : (ep.ruleId ? [ep.ruleId] : []),
    relatedStoryIds: Array.isArray(ep.relatedStoryIds) ? ep.relatedStoryIds : (ep.storyId ? [ep.storyId] : [])
  }
}

/**
 * Normaliza y valida un Contrato DTO de API
 */
export function normalizeApiContract(c, index = 0) {
  const id = c.id || `dto-${String(index + 1).padStart(2, '0')}`
  const rawProps = c.properties || c.fields || c.schema || []
  let properties = []
  if (Array.isArray(rawProps)) {
    properties = rawProps.map(p => ({
      name: p.name || p.field || 'field',
      type: p.type || 'string',
      required: p.required !== undefined ? Boolean(p.required) : true,
      description: p.description || ''
    }))
  } else if (typeof rawProps === 'object' && rawProps !== null) {
    properties = Object.entries(rawProps).map(([name, def]) => ({
      name,
      type: typeof def === 'string' ? def : (def.type || 'string'),
      required: typeof def === 'object' && def !== null && def.required !== undefined ? Boolean(def.required) : true,
      description: typeof def === 'object' && def !== null ? def.description || '' : ''
    }))
  }

  return {
    id,
    name: c.name || `ModelDTO${index + 1}`,
    type: c.type || 'object',
    description: c.description || `Modelo de transferencia de datos para ${c.name || 'la API'}`,
    properties: properties.length > 0 ? properties : [
      { name: 'id', type: 'string', required: true, description: 'Identificador único' }
    ]
  }
}

/**
 * Normaliza y valida una Tabla del Modelo ERD
 */
export function normalizeDatabaseTable(t, index = 0) {
  const table = t.table || t.name || `table_${index + 1}`
  const id = t.id || `tbl-${String(index + 1).padStart(2, '0')}`
  const rawCols = t.columns || t.fields || t.attributes || []
  const columns = Array.isArray(rawCols) && rawCols.length > 0
    ? rawCols.map(c => ({
        name: c.name || c.field || c.column || 'col',
        type: c.type || 'TEXT',
        isPk: Boolean(c.isPk || c.isId || c.primaryKey),
        notNull: c.notNull !== undefined ? Boolean(c.notNull) : Boolean(c.isPk || c.isId),
        unique: Boolean(c.unique),
        default: c.default !== undefined ? c.default : null,
        description: c.description || ''
      }))
    : [
        { name: 'id', type: 'UUID/TEXT', isPk: true, notNull: true, unique: true, default: 'gen_random_uuid()' },
        { name: 'created_at', type: 'TIMESTAMP', isPk: false, notNull: true, default: 'NOW()' }
      ]

  return {
    id,
    table,
    description: t.description || `Tabla de almacenamiento para ${table}`,
    primaryKey: t.primaryKey || columns.find(c => c.isPk)?.name || 'id',
    columns,
    foreignKeys: Array.isArray(t.foreignKeys) ? t.foreignKeys : []
  }
}

/**
 * Normaliza y valida una Relación entre Tablas de Base de Datos
 */
export function normalizeDatabaseRelationship(r, index = 0) {
  return {
    id: r.id || `rel-${String(index + 1).padStart(2, '0')}`,
    fromTable: r.fromTable || r.from || '',
    fromColumn: r.fromColumn || r.fromField || 'id',
    toTable: r.toTable || r.to || '',
    toColumn: r.toColumn || r.toField || 'id',
    type: r.type || r.cardinality || '1:N', // '1:1' | '1:N' | 'N:M'
    onDelete: r.onDelete || 'CASCADE',
    description: r.description || `Relación ${r.type || '1:N'} entre ${r.fromTable || 'origen'} y ${r.toTable || 'destino'}`
  }
}

/**
 * Normaliza y valida una Pantalla UI/UX Enriquecida
 */
export function normalizeScreen(sc, index = 0) {
  const id = sc.id || `SCR-${String(index + 1).padStart(2, '0')}`
  const name = sc.name || sc.title || `Pantalla ${index + 1}`
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const isRootCandidate = index === 0 && (!sc.name || sc.name.toLowerCase().includes('dashboard') || sc.name.toLowerCase().includes('inicio') || sc.name.toLowerCase().includes('home'))
  const route = sc.route || (isRootCandidate ? '/' : `/${slug}`)
  const isDynamic = Boolean(sc.isDynamic || (route && (route.includes('[') || route.includes(':'))))

  const rawStates = sc.states && typeof sc.states === 'object' ? sc.states : {}
  const states = {
    loading: rawStates.loading || 'Skeleton loader activo durante la obtención de datos.',
    empty: rawStates.empty || 'Sin registros disponibles. Mostrar botón para crear primer elemento.',
    error: rawStates.error || 'Mensaje de error descriptivo con opción de reintento.',
    success: rawStates.success || 'Contenido principal renderizado e interactivo.'
  }

  return {
    id,
    name,
    route,
    actor: sc.actor || sc.requiredRole || 'Usuario',
    purpose: sc.purpose || sc.description || `Permitir al usuario interactuar con la vista ${name}.`,
    components: Array.isArray(sc.components) ? sc.components : (sc.component ? [sc.component] : []),
    states,
    dataRequired: Array.isArray(sc.dataRequired) ? sc.dataRequired : (sc.entities ? sc.entities : []),
    relatedFlows: Array.isArray(sc.relatedFlows) ? sc.relatedFlows : (sc.flowId ? [sc.flowId] : []),
    relatedStories: Array.isArray(sc.relatedStories) ? sc.relatedStories : (sc.storyId ? [sc.storyId] : []),
    isDynamic,
    framework: sc.framework || 'Web',
    filePath: sc.filePath || sc.file || sc.sourceFile || '',
    layout: sc.layout || 'standard-app',
    healthPercent: typeof sc.healthPercent === 'number' ? sc.healthPercent : 100,
    status: sc.status || 'planned'
  }
}

/**
 * Normaliza y valida un Wireframe Declarativo
 */
export function normalizeWireframe(wf, index = 0) {
  const id = wf.id || `WF-${String(index + 1).padStart(2, '0')}`
  const title = wf.title || wf.name || `Wireframe ${index + 1}`
  const layout = wf.layout || 'dashboard' // 'dashboard' | 'split' | 'single-column' | 'form-center' | 'table-list'

  let blocks = []
  if (Array.isArray(wf.blocks)) {
    blocks = wf.blocks.map((b, bIdx) => ({
      id: b.id || `blk-${bIdx + 1}`,
      type: b.type || 'card',
      title: b.title || b.label || '',
      description: b.description || '',
      properties: typeof b.properties === 'object' && b.properties !== null ? b.properties : { ...b }
    }))
  } else {
    blocks = [
      { id: 'blk-1', type: 'navbar', title: 'Barra de Navegación', properties: { brand: 'App', links: ['Inicio', 'Módulos'] } },
      { id: 'blk-2', type: 'stats-grid', title: 'Métricas Clave', properties: { items: [{ label: 'Métrica 1', value: '100' }, { label: 'Métrica 2', value: '95%' }] } },
      { id: 'blk-3', type: 'table', title: 'Registros', properties: { columns: ['ID', 'Nombre', 'Estado', 'Fecha'] } }
    ]
  }

  return {
    id,
    screenId: wf.screenId || wf.screen || `SCR-${String(index + 1).padStart(2, '0')}`,
    title,
    layout,
    blocks,
    notes: wf.notes || wf.description || ''
  }
}

/**
 * Normaliza y valida el Design System Tokens
 */
export function normalizeDesignSystem(ds = {}) {
  const isObj = (v) => typeof v === 'object' && v !== null
  const colors = isObj(ds.colors) ? ds.colors : {}
  const typography = isObj(ds.typography) ? ds.typography : {}
  const radius = isObj(ds.radius) ? ds.radius : {}
  const spacing = isObj(ds.spacing) ? ds.spacing : {}

  return {
    theme: ds.theme || 'modern-clean',
    colors: {
      primary: colors.primary || '#7c3aed',
      secondary: colors.secondary || '#4f46e5',
      accent: colors.accent || '#10b981',
      background: colors.background || '#09090b',
      surface: colors.surface || '#18181b',
      text: colors.text || '#f4f4f5',
      border: colors.border || '#27272a',
      muted: colors.muted || '#71717a',
      ...colors
    },
    typography: {
      fontFamily: typography.fontFamily || 'Inter, sans-serif',
      headingFont: typography.headingFont || 'Inter, sans-serif',
      monoFont: typography.monoFont || 'JetBrains Mono, monospace',
      sizes: typography.sizes || { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem' },
      ...typography
    },
    radius: {
      sm: radius.sm || '0.375rem',
      md: radius.md || '0.5rem',
      lg: radius.lg || '0.75rem',
      full: radius.full || '9999px',
      ...radius
    },
    spacing: {
      base: spacing.base || '1rem',
      container: spacing.container || '1280px',
      ...spacing
    }
  }
}

/**
 * Normaliza y valida una Fase del Plan de Ejecución
 */
export function normalizeExecutionPhase(ph, index = 0) {
  const id = ph.id || `phase-${index + 1}`
  const order = typeof ph.order === 'number' ? ph.order : (index + 1)
  return {
    id,
    name: ph.name || `Fase ${order}: ${ph.title || 'Ejecución'}`,
    order,
    status: ph.status || 'planned', // 'planned' | 'in_progress' | 'done' | 'blocked'
    description: ph.description || '',
    qualityGateId: ph.qualityGateId || `gate-${id}`,
    taskIds: Array.isArray(ph.taskIds) ? ph.taskIds : []
  }
}

/**
 * Normaliza y valida una Tarea Atómica de Ejecución con Scope Shield
 */
export function normalizeExecutionTask(t, index = 0) {
  const id = t.id || `TASK-${String(index + 1).padStart(2, '0')}`
  const rawScope = t.scopeFiles || t.scope || []
  const scopeFiles = Array.isArray(rawScope) && rawScope.length > 0 ? rawScope : ['src/**']

  const rawDiff = t.difficulty || t.estimatedDifficulty
  let difficulty = 'M'
  if (rawDiff) {
    const dUpper = String(rawDiff).toUpperCase()
    if (['XS', 'S', 'M', 'L', 'XL'].includes(dUpper)) difficulty = dUpper
    else if (dUpper === 'LOW') difficulty = 'S'
    else if (dUpper === 'HIGH') difficulty = 'L'
    else difficulty = dUpper
  }

  return {
    id,
    title: t.title || t.name || `Tarea ${index + 1}`,
    description: t.description || '',
    storyId: t.storyId || (t.id && t.id.startsWith('US-') ? t.id : ''),
    phaseId: t.phaseId || 'phase-1',
    status: t.status || 'planned', // 'planned' | 'in_progress' | 'done' | 'blocked'
    scopeFiles,
    difficulty,
    dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
    acceptanceCriteria: Array.isArray(t.acceptanceCriteria) ? t.acceptanceCriteria : (Array.isArray(t.criteria) ? t.criteria : []),
    assignedTo: t.assignedTo || null,
    dispatchedAt: t.dispatchedAt || null,
    completedAt: t.completedAt || null
  }
}

/**
 * Normaliza y valida el Grafo de Dependencias entre Tareas
 */
export function normalizeDependencyGraph(depGraph = {}, tasks = []) {
  const nodes = Array.isArray(depGraph?.nodes) && depGraph.nodes.length > 0
    ? depGraph.nodes
    : tasks.map(t => t.id)

  const edges = Array.isArray(depGraph?.edges) ? [...depGraph.edges] : []

  // Sincronizar aristas a partir de t.dependencies
  tasks.forEach(t => {
    if (Array.isArray(t.dependencies)) {
      t.dependencies.forEach(depId => {
        const exists = edges.some(e => e.from === depId && e.to === t.id)
        if (!exists) {
          edges.push({ from: depId, to: t.id, type: 'blocks' })
        }
      })
    }
  })

  return {
    nodes,
    edges
  }
}

/**
 * Normaliza y valida una Compuerta de Calidad (Quality Gate)
 */
export function normalizeQualityGate(g, index = 0) {
  const id = g.id || `gate-${index + 1}`
  return {
    id,
    name: g.name || `Compuerta ${index + 1}`,
    stage: g.stage || 'discovery',
    status: g.status || 'pending', // 'pending' | 'approved' | 'blocked'
    criteria: Array.isArray(g.criteria) ? g.criteria : [],
    description: g.description || `Compuerta de control de calidad para la etapa ${g.stage || 'discovery'}.`,
    approvedAt: g.approvedAt || null,
    approvedBy: g.approvedBy || null
  }
}

/**
 * Normaliza y fusiona datos provenientes de versiones anteriores de .sdd/
 * asegurando retrocompatibilidad total sin pérdida de información.
 */
export function normalizeProjectModel(raw = {}) {
  const base = createDefaultProjectModel(raw.project?.name || raw.meta?.name || 'sdd')

  // 1. Meta / Identidad
  if (raw.project) {
    base.meta.name = raw.project.name || base.meta.name
    base.meta.tagline = raw.project.tagline || base.meta.tagline
    base.meta.description = raw.project.description || base.meta.description || ''
    base.meta.stage = raw.project.stage || raw.stage || base.meta.stage
    base.meta.progress = typeof raw.project.progress === 'number' ? raw.project.progress : base.meta.progress
    base.meta.completedStages = Array.isArray(raw.project.completedStages) ? raw.project.completedStages : base.meta.completedStages
  }

  // 2. Core & Constitución
  if (raw.core?.constitution?.principles) {
    base.core.constitution = raw.core.constitution
  } else if (raw.constitution?.principles) {
    base.core.constitution = raw.constitution
  }

  // 3. Product: Visión y Alcance (mapeo retrocompatible de problem.json, target-user.json, scope-boundaries.json)
  if (raw.product?.vision) {
    base.product.vision = { ...base.product.vision, ...raw.product.vision }
  } else if (raw.core?.problem || raw.core?.targetUsers) {
    base.product.vision.problem = raw.core.problem?.statement || raw.core.problem?.description || ''
    base.product.vision.targetAudience = raw.core.targetUsers?.primaryPersona?.role || raw.core.targetUsers?.description || ''
    base.product.vision.coreGoals = raw.core.problem?.targetPainPoints || []
  }

  if (raw.product?.scope) {
    base.product.scope = { ...base.product.scope, ...raw.product.scope }
  } else if (raw.core?.scopeBoundaries) {
    base.product.scope.inScopeV1 = raw.core.scopeBoundaries.inScopeV1 || []
    base.product.scope.explicitNonGoals = raw.core.scopeBoundaries.explicitNonGoals || []
    base.product.scope.futureBacklog = raw.core.scopeBoundaries.futureBacklog || []
  }

  if (Array.isArray(raw.product?.actors) && raw.product.actors.length > 0) {
    base.product.actors = raw.product.actors
  }

  if (Array.isArray(raw.product?.modules)) {
    base.product.modules = raw.product.modules
  }

  // 4. Requirements: Épicas, Historias y Reglas de Negocio
  if (raw.requirements) {
    base.requirements.epics = Array.isArray(raw.requirements.epics) ? raw.requirements.epics : []
    base.requirements.userStories = Array.isArray(raw.requirements.userStories) ? raw.requirements.userStories : []
    base.requirements.businessRules = Array.isArray(raw.requirements.businessRules)
      ? raw.requirements.businessRules.map(normalizeBusinessRule)
      : []
  }

  // 5. Flows: User Flows y Business Flows
  if (raw.flows) {
    if (Array.isArray(raw.flows)) {
      // Formato antiguo: lista plana de flujos
      base.flows.businessFlows = raw.flows.map(normalizeBusinessFlow)
    } else {
      base.flows.userFlows = Array.isArray(raw.flows.userFlows) ? raw.flows.userFlows.map(normalizeUserFlow) : []
      base.flows.businessFlows = Array.isArray(raw.flows.businessFlows) ? raw.flows.businessFlows.map(normalizeBusinessFlow) : []
    }
  }

  // 6. Architecture & Stack
  if (raw.architecture) {
    if (Array.isArray(raw.architecture.services)) {
      base.architecture.topology.services = raw.architecture.services
    } else if (raw.architecture.topology?.services) {
      base.architecture.topology.services = raw.architecture.topology.services
    }
    if (raw.architecture.stack) {
      base.architecture.stack = normalizeTechStack(raw.architecture.stack)
    }
  } else if (raw.stack) {
    base.architecture.stack = normalizeTechStack(raw.stack)
  }

  // 7. Database (ERD Tables & Relationships)
  if (raw.database) {
    const rawTables = Array.isArray(raw.database.tables) ? raw.database.tables : (Array.isArray(raw.database.models) ? raw.database.models : (Array.isArray(raw.database) ? raw.database : []))
    base.database.tables = rawTables.map(normalizeDatabaseTable)

    const rawRels = Array.isArray(raw.database.relationships) ? raw.database.relationships : (Array.isArray(raw.relationships) ? raw.relationships : [])
    base.database.relationships = rawRels.map(normalizeDatabaseRelationship)
  } else if (raw.tables) {
    base.database.tables = (Array.isArray(raw.tables) ? raw.tables : []).map(normalizeDatabaseTable)
  }

  // 8. API (Endpoints & DTO Contracts)
  if (raw.api) {
    base.api.endpoints = (Array.isArray(raw.api.endpoints) ? raw.api.endpoints : (Array.isArray(raw.api) ? raw.api : [])).map(normalizeEndpoint)
    base.api.contracts = (Array.isArray(raw.api.contracts) ? raw.api.contracts : (Array.isArray(raw.contracts) ? raw.contracts : [])).map(normalizeApiContract)
  } else if (raw.endpoints) {
    base.api.endpoints = (Array.isArray(raw.endpoints) ? raw.endpoints : []).map(normalizeEndpoint)
  }

  // 9. Sequences
  if (Array.isArray(raw.sequences)) {
    base.sequences = raw.sequences
  }

  // 10. UI/UX
  const rawScreens = Array.isArray(raw.uiUx?.screens) ? raw.uiUx.screens : (Array.isArray(raw.screens) ? raw.screens : [])
  base.uiUx.screens = rawScreens.map(normalizeScreen)

  const rawWireframes = Array.isArray(raw.uiUx?.wireframes) ? raw.uiUx.wireframes : (Array.isArray(raw.wireframes) ? raw.wireframes : [])
  base.uiUx.wireframes = rawWireframes.map(normalizeWireframe)

  const rawComponents = Array.isArray(raw.uiUx?.components) ? raw.uiUx.components : (Array.isArray(raw.components) ? raw.components : [])
  base.uiUx.components = rawComponents

  base.uiUx.designSystem = normalizeDesignSystem(raw.uiUx?.designSystem || raw.designSystem || {})

  // 11. Execution & Tasks
  const rawPhases = Array.isArray(raw.execution?.phases) ? raw.execution.phases : (Array.isArray(raw.phases) ? raw.phases : base.execution.phases)
  base.execution.phases = rawPhases.map(normalizeExecutionPhase)

  const rawTasks = Array.isArray(raw.execution?.tasks) ? raw.execution.tasks : (Array.isArray(raw.tasks) ? raw.tasks : [])
  base.execution.tasks = rawTasks.map(normalizeExecutionTask)

  base.execution.dependencies = normalizeDependencyGraph(raw.execution?.dependencies || raw.dependencies, base.execution.tasks)
  base.execution.activeTask = raw.execution?.activeTask || raw.activeTask || null

  // 12. Governance & Quality Gates
  const rawGates = Array.isArray(raw.governance?.qualityGates) ? raw.governance.qualityGates : (Array.isArray(raw.qualityGates) ? raw.qualityGates : base.governance.qualityGates)
  base.governance.qualityGates = rawGates.map(normalizeQualityGate)

  base.governance.agentContext = raw.governance?.agentContext || raw.agentContext || null

  // Calcular etapa y progreso si no están definidos
  const progressInfo = calculateProjectProgress(base)
  base.meta.stage = base.meta.stage || progressInfo.stage
  base.meta.progress = progressInfo.progress
  base.meta.completedStages = progressInfo.completedStages

  return base
}

/**
 * Calcula dinámicamente la etapa actual, progreso % y etapas completadas
 * de acuerdo con la existencia real de artefactos en el Project Model.
 */
export function calculateProjectProgress(model) {
  const completed = []
  let totalScore = 0

  // 1. Discovery
  if (model.product?.vision?.problem && model.product?.vision?.targetAudience) {
    completed.push('discovery')
    totalScore += 15
  }

  // 2. Product
  if (model.product?.scope?.inScopeV1?.length > 0 && model.product?.scope?.explicitNonGoals?.length > 0) {
    completed.push('product')
    totalScore += 15
  }

  // 3. Requirements
  if (model.requirements?.userStories?.length > 0) {
    completed.push('requirements')
    totalScore += 15
  }

  // 4. Flows
  if (model.flows?.businessFlows?.length > 0 || model.flows?.userFlows?.length > 0) {
    completed.push('flows')
    totalScore += 10
  }

  // 5. Architecture
  if (model.architecture?.topology?.services?.length > 0) {
    completed.push('architecture')
    totalScore += 15
  }

  // 6. Database / API
  if (model.database?.tables?.length > 0 || model.api?.endpoints?.length > 0) {
    completed.push('database')
    completed.push('api')
    totalScore += 10
  }

  // 7. UX
  if (model.uiUx?.screens?.length > 0) {
    completed.push('ux')
    totalScore += 10
  }

  // 8. Execution
  if (model.execution?.tasks?.length > 0 || model.execution?.activeTask) {
    completed.push('execution')
    totalScore += 10
  }

  // Determinar la etapa activa siguiente
  let stage = 'discovery'
  for (const st of STAGES) {
    if (!completed.includes(st)) {
      stage = st
      break
    }
  }

  if (completed.length >= 7) {
    stage = 'ready'
  }

  return {
    stage,
    progress: Math.min(100, Math.max(5, totalScore)),
    completedStages: completed
  }
}
