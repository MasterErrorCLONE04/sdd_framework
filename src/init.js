import fs from 'fs'
import path from 'path'
import { scanProject, scanProjectViews } from './scanner.js'
import { normalizeScreen, normalizeWireframe, normalizeDesignSystem, normalizeExecutionPhase, normalizeExecutionTask, normalizeDependencyGraph, normalizeQualityGate } from './model-schema.js'
import { compileAgentContext } from './agent-context.js'

export function initializeSdd(projectRoot = process.cwd(), options = {}) {
  const sddDir = path.join(projectRoot, '.sdd')
  const agentsMdPath = path.join(projectRoot, 'AGENTS.md')
  const isScan = options.scan || false

  let scanned = null
  if (isScan) {
    scanned = scanProject(projectRoot)
  }

  // Create folder structure v2
  const subdirs = [
    'core',
    'product',
    'requirements',
    'requirements/stories',
    'flows',
    'architecture',
    'database',
    'api',
    'sequences',
    'ui-ux',
    'execution',
    'governance',
    'discovery',
    'qa'
  ]

  for (const sub of subdirs) {
    const full = path.join(sddDir, sub)
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true })
    }
  }

  // 1. project.json (con tracking de etapas de Génesis)
  const projectJsonPath = path.join(sddDir, 'project.json')
  if (!fs.existsSync(projectJsonPath)) {
    const projectName = path.basename(projectRoot) || 'New Project'
    const initialProject = {
      name: projectName,
      tagline: scanned?.framework ? `Proyecto ${scanned.framework} gobernado por SDD` : 'Especificación inicial del proyecto',
      purpose: 'comercial',
      depth: 'serio',
      version: '1.0.0',
      status: 'planning',
      stage: 'discovery',
      progress: 10,
      completedStages: [],
      activeSprint: 'Sprint 1',
      lastUpdated: new Date().toISOString(),
      qualityGates: {
        problemDefined: false,
        userTargetDefined: false,
        boundariesEstablished: false,
        successMetricsDefined: false,
        storiesReady: false
      }
    }
    fs.writeFileSync(projectJsonPath, JSON.stringify(initialProject, null, 2), 'utf-8')
  }

  // 2. core/problem.json
  const problemPath = path.join(sddDir, 'core', 'problem.json')
  if (!fs.existsSync(problemPath)) {
    const initialProblem = {
      statement: '',
      urgency: 'alta',
      targetPainPoints: [],
      currentWorkarounds: '',
      costOfInaction: ''
    }
    fs.writeFileSync(problemPath, JSON.stringify(initialProblem, null, 2), 'utf-8')
  }

  // 3. core/scope-boundaries.json
  const boundariesPath = path.join(sddDir, 'core', 'scope-boundaries.json')
  if (!fs.existsSync(boundariesPath)) {
    const initialBoundaries = {
      inScopeV1: ['Funcionalidad mínima viable'],
      explicitNonGoals: ['App móvil nativa en V1', 'Arquitectura multi-tenant compleja inicial'],
      futureBacklog: []
    }
    fs.writeFileSync(boundariesPath, JSON.stringify(initialBoundaries, null, 2), 'utf-8')
  }

  // 3.5 core/constitution.json (Invariantes de Ingeniería)
  const constitutionPath = path.join(sddDir, 'core', 'constitution.json')
  if (!fs.existsSync(constitutionPath)) {
    const initialConstitution = {
      title: 'Constitución de Ingeniería & Invariantes Técnicos',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
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
    }
    fs.writeFileSync(constitutionPath, JSON.stringify(initialConstitution, null, 2), 'utf-8')
  }

  // 4. architecture.json
  const archPath = path.join(sddDir, 'architecture.json')
  if (!fs.existsSync(archPath)) {
    const services = scanned?.inferredArchitecture?.services || [
      {
        id: 'main-app',
        label: 'Aplicación Principal',
        type: 'Fullstack / Monolith',
        status: 'online',
        tech: 'Node / Web',
        healthPercent: 100,
        description: 'Servicio base inicial'
      }
    ]
    fs.writeFileSync(archPath, JSON.stringify({
      services,
      origin: isScan ? 'inferred' : 'manual'
    }, null, 2), 'utf-8')
  }

  // 4.5 ui-ux/ (screens.json, wireframes.json, design-system.json, components.json)
  const screensPath = path.join(sddDir, 'ui-ux', 'screens.json')
  if (!fs.existsSync(screensPath)) {
    const rawScreens = scanned?.detectedScreens || scanProjectViews(projectRoot) || []
    const screens = (Array.isArray(rawScreens) && rawScreens.length > 0)
      ? rawScreens.map(normalizeScreen)
      : [
          normalizeScreen({
            id: 'SCR-01',
            name: 'Dashboard Principal',
            route: '/',
            actor: 'Usuario',
            purpose: 'Vista principal y centro de control del sistema.',
            components: ['Navbar', 'Sidebar', 'MetricCard', 'DataTable'],
            dataRequired: ['user_profile', 'summary_metrics'],
            relatedFlows: ['01-flujo-principal']
          })
        ]
    fs.writeFileSync(screensPath, JSON.stringify(screens, null, 2), 'utf-8')
  }

  const wireframesPath = path.join(sddDir, 'ui-ux', 'wireframes.json')
  if (!fs.existsSync(wireframesPath)) {
    const initialWireframes = [
      normalizeWireframe({
        id: 'WF-01',
        screenId: 'SCR-01',
        title: 'Wireframe: Dashboard Principal',
        layout: 'dashboard',
        blocks: [
          { id: 'blk-nav', type: 'navbar', title: 'Navegación Superior', properties: { brand: 'SDD App', links: ['Dashboard', 'Registros', 'Ajustes'] } },
          { id: 'blk-side', type: 'sidebar', title: 'Barra Lateral', properties: { items: ['Inicio', 'Módulos', 'Historial'] } },
          { id: 'blk-kpis', type: 'stats-grid', title: 'Tarjetas de Métricas', properties: { items: [{ label: 'Actividad Total', value: '1,280', change: '+12%' }, { label: 'Disponibilidad', value: '99.9%', change: '+0.1%' }] } },
          { id: 'blk-tbl', type: 'table', title: 'Actividad Reciente', properties: { columns: ['ID', 'Descripción', 'Estado', 'Fecha'] } }
        ]
      })
    ]
    fs.writeFileSync(wireframesPath, JSON.stringify(initialWireframes, null, 2), 'utf-8')
  }

  const dsPath = path.join(sddDir, 'ui-ux', 'design-system.json')
  if (!fs.existsSync(dsPath)) {
    fs.writeFileSync(dsPath, JSON.stringify(normalizeDesignSystem(), null, 2), 'utf-8')
  }

  const compsPath = path.join(sddDir, 'ui-ux', 'components.json')
  if (!fs.existsSync(compsPath)) {
    fs.writeFileSync(compsPath, JSON.stringify([
      { id: 'CMP-01', name: 'Navbar', type: 'layout', description: 'Barra superior con navegación y perfil.' },
      { id: 'CMP-02', name: 'Sidebar', type: 'layout', description: 'Menú de navegación lateral.' },
      { id: 'CMP-03', name: 'MetricCard', type: 'display', description: 'Tarjeta con valor numérico y tendencia.' },
      { id: 'CMP-04', name: 'DataTable', type: 'data', description: 'Tabla con paginación, filtros y ordenación.' }
    ], null, 2), 'utf-8')
  }

  // 4.6 product/ (vision.json, scope.json, actors.json, modules.json)
  const visionPath = path.join(sddDir, 'product', 'vision.json')
  if (!fs.existsSync(visionPath)) {
    fs.writeFileSync(visionPath, JSON.stringify({
      problem: '',
      targetAudience: '',
      valueProposition: '',
      coreGoals: [],
      successMetrics: []
    }, null, 2), 'utf-8')
  }

  const productScopePath = path.join(sddDir, 'product', 'scope.json')
  if (!fs.existsSync(productScopePath)) {
    fs.writeFileSync(productScopePath, JSON.stringify({
      inScopeV1: ['Funcionalidad mínima viable'],
      explicitNonGoals: ['App móvil nativa en V1', 'Arquitectura distribuida innecesaria inicial'],
      futureBacklog: []
    }, null, 2), 'utf-8')
  }

  const actorsPath = path.join(sddDir, 'product', 'actors.json')
  if (!fs.existsSync(actorsPath)) {
    fs.writeFileSync(actorsPath, JSON.stringify([
      { id: 'actor-user', name: 'Usuario Principal', role: 'user', description: 'Usuario que interactúa con la aplicación.' }
    ], null, 2), 'utf-8')
  }

  const modulesPath = path.join(sddDir, 'product', 'modules.json')
  if (!fs.existsSync(modulesPath)) {
    fs.writeFileSync(modulesPath, JSON.stringify([], null, 2), 'utf-8')
  }

  // 4.7 requirements/business-rules.json & epics.json
  const brPath = path.join(sddDir, 'requirements', 'business-rules.json')
  if (!fs.existsSync(brPath)) {
    fs.writeFileSync(brPath, JSON.stringify([], null, 2), 'utf-8')
  }

  const epicsPath = path.join(sddDir, 'requirements', 'epics.json')
  if (!fs.existsSync(epicsPath)) {
    fs.writeFileSync(epicsPath, JSON.stringify([
      { id: 'EPIC-01', title: 'Fundación & MVP', description: 'Capacidades centrales de la primera versión', moduleId: 'mod-1', priority: 'P0', status: 'planned', storyIds: [] }
    ], null, 2), 'utf-8')
  }

  // 4.75 flows/ (user-flows.json, business-flows.json)
  const userFlowsPath = path.join(sddDir, 'flows', 'user-flows.json')
  if (!fs.existsSync(userFlowsPath)) {
    fs.writeFileSync(userFlowsPath, JSON.stringify([], null, 2), 'utf-8')
  }

  const businessFlowsPath = path.join(sddDir, 'flows', 'business-flows.json')
  if (!fs.existsSync(businessFlowsPath)) {
    fs.writeFileSync(businessFlowsPath, JSON.stringify([], null, 2), 'utf-8')
  }

  // 4.8 architecture/stack.json
  const stackPath = path.join(sddDir, 'architecture', 'stack.json')
  if (!fs.existsSync(stackPath)) {
    fs.writeFileSync(stackPath, JSON.stringify({
      frontend: { framework: scanned?.framework || 'HTML5 / Web', language: scanned?.language || 'JavaScript', styling: 'Vanilla CSS / Tailwind' },
      backend: { framework: scanned?.framework || 'Node.js', runtime: 'Node >= 18', architecturePattern: 'Layered Services' },
      database: { engine: scanned?.database || 'SQLite / PostgreSQL', orm: 'Prisma / SQL' },
      auth: { strategy: 'JWT / Session Bearer', rbac: true },
      deployment: { target: 'Local / Docker', ciCd: 'GitHub Actions' }
    }, null, 2), 'utf-8')
  }

  // 4.9 api/endpoints.json & api/contracts.json
  const apiPath = path.join(sddDir, 'api', 'endpoints.json')
  if (!fs.existsSync(apiPath)) {
    const detectedEndpoints = scanned?.detectedRoutes ? scanned.detectedRoutes.map((r, i) => ({
      id: `api-${i + 1}`,
      method: r.method || 'GET',
      path: r.path || r.route,
      summary: `Ruta detectada en ${r.filePath || 'código fuente'}`
    })) : []
    fs.writeFileSync(apiPath, JSON.stringify(detectedEndpoints, null, 2), 'utf-8')
  }

  const contractsPath = path.join(sddDir, 'api', 'contracts.json')
  if (!fs.existsSync(contractsPath)) {
    fs.writeFileSync(contractsPath, JSON.stringify([], null, 2), 'utf-8')
  }

  // 4.95 database/ (schema-erd.json, relationships.json)
  const dbSchemaPath = path.join(sddDir, 'database', 'schema-erd.json')
  if (!fs.existsSync(dbSchemaPath)) {
    fs.writeFileSync(dbSchemaPath, JSON.stringify({ tables: [], relationships: [] }, null, 2), 'utf-8')
  }

  const dbRelsPath = path.join(sddDir, 'database', 'relationships.json')
  if (!fs.existsSync(dbRelsPath)) {
    fs.writeFileSync(dbRelsPath, JSON.stringify([], null, 2), 'utf-8')
  }

  // 4.96 sequences/sequences.json
  const seqPath = path.join(sddDir, 'sequences', 'sequences.json')
  if (!fs.existsSync(seqPath)) {
    fs.writeFileSync(seqPath, JSON.stringify([], null, 2), 'utf-8')
  }

  // 4.10 execution/ (phases.json, tasks.json, dependencies.json)
  const execPhasesPath = path.join(sddDir, 'execution', 'phases.json')
  if (!fs.existsSync(execPhasesPath)) {
    const initialPhases = [
      normalizeExecutionPhase({ id: 'phase-1', name: 'Fase 1: Configuración & Modelos Base', order: 1, status: 'planned', taskIds: ['TASK-01'] }, 0),
      normalizeExecutionPhase({ id: 'phase-2', name: 'Fase 2: Lógica Central & Endpoints API', order: 2, status: 'planned', taskIds: ['TASK-02'] }, 1),
      normalizeExecutionPhase({ id: 'phase-3', name: 'Fase 3: Interfaz & Experiencia UX', order: 3, status: 'planned', taskIds: ['TASK-03'] }, 2),
      normalizeExecutionPhase({ id: 'phase-4', name: 'Fase 4: Verificación & Cierre SDD', order: 4, status: 'planned', taskIds: [] }, 3)
    ]
    fs.writeFileSync(execPhasesPath, JSON.stringify(initialPhases, null, 2), 'utf-8')
  }

  const execTasksPath = path.join(sddDir, 'execution', 'tasks.json')
  if (!fs.existsSync(execTasksPath)) {
    const initialTasks = [
      normalizeExecutionTask({
        id: 'TASK-01',
        storyId: 'US-01',
        phaseId: 'phase-1',
        title: 'Fundación del Modelo y Esquemas de Base de Datos',
        description: 'Crear entidades, tipos y migraciones base respetando el diseño ERD.',
        scopeFiles: ['src/db/**', 'src/models/**', 'package.json'],
        dependencies: [],
        estimatedDifficulty: 'low',
        acceptanceCriteria: [
          { id: 'crit-1-1', scenario: 'Esquema validado', text: 'Esquema inicial y modelos tipados sin errores de compilación.', done: false }
        ]
      }, 0),
      normalizeExecutionTask({
        id: 'TASK-02',
        storyId: 'US-02',
        phaseId: 'phase-2',
        title: 'Servicios de Negocio y Contratos de API REST',
        description: 'Implementar controladores, servicios desacoplados y validación de reglas de negocio.',
        scopeFiles: ['src/services/**', 'src/api/**', 'src/routes/**'],
        dependencies: ['TASK-01'],
        estimatedDifficulty: 'medium',
        acceptanceCriteria: [
          { id: 'crit-2-1', scenario: 'Endpoints funcionando', text: 'Endpoints retornan códigos HTTP esperados y validan payloads DTO.', done: false }
        ]
      }),
      normalizeExecutionTask({
        id: 'TASK-03',
        storyId: 'US-03',
        phaseId: 'phase-3',
        title: 'Vistas e Interfaz de Usuario Declarativa',
        description: 'Renderizar pantallas y componentes con estados reactivos según wireframes.',
        scopeFiles: ['ui/**', 'src/views/**'],
        dependencies: ['TASK-02'],
        estimatedDifficulty: 'medium',
        acceptanceCriteria: [
          { id: 'crit-3-1', scenario: 'UI interactiva', text: 'Pantallas renderizan correctamente según Design System tokens.', done: false }
        ]
      })
    ]
    fs.writeFileSync(execTasksPath, JSON.stringify(initialTasks, null, 2), 'utf-8')
  }

  const execDepsPath = path.join(sddDir, 'execution', 'dependencies.json')
  if (!fs.existsSync(execDepsPath)) {
    const tasks = fs.existsSync(execTasksPath) ? JSON.parse(fs.readFileSync(execTasksPath, 'utf-8')) : []
    const initialDeps = normalizeDependencyGraph({}, tasks)
    fs.writeFileSync(execDepsPath, JSON.stringify(initialDeps, null, 2), 'utf-8')
  }

  // 4.11 governance/ (quality-gates.json, agent-context.json)
  const gatesPath = path.join(sddDir, 'governance', 'quality-gates.json')
  if (!fs.existsSync(gatesPath)) {
    const initialGates = [
      normalizeQualityGate({ id: 'gate-problem', name: 'Definición de Problema & Valor', stage: 'discovery', status: 'pending' }, 0),
      normalizeQualityGate({ id: 'gate-scope', name: 'Límites de Alcance & Non-Goals', stage: 'product', status: 'pending' }, 1),
      normalizeQualityGate({ id: 'gate-requirements', name: 'Historias con Criterios Gherkin', stage: 'requirements', status: 'pending' }, 2),
      normalizeQualityGate({ id: 'gate-architecture', name: 'Topología & Base de Datos', stage: 'architecture', status: 'pending' }, 3),
      normalizeQualityGate({ id: 'gate-tasks', name: 'Plan de Tareas con Scope Shield', stage: 'execution', status: 'pending' }, 4),
      normalizeQualityGate({ id: 'gate-phase-1', name: 'Compuerta Fase 1: Modelos Base', stage: 'phase-1', status: 'pending' }, 5),
      normalizeQualityGate({ id: 'gate-phase-2', name: 'Compuerta Fase 2: Lógica & API', stage: 'phase-2', status: 'pending' }, 6),
      normalizeQualityGate({ id: 'gate-phase-3', name: 'Compuerta Fase 3: Interfaz & UX', stage: 'phase-3', status: 'pending' }, 7),
      normalizeQualityGate({ id: 'gate-phase-4', name: 'Compuerta Fase 4: Verificación & Cierre', stage: 'phase-4', status: 'pending' }, 8)
    ]
    fs.writeFileSync(gatesPath, JSON.stringify(initialGates, null, 2), 'utf-8')
  }

  // 5. Compilar Contexto Agéntico y generar AGENTS.md dinámicamente
  compileAgentContext(projectRoot)

  return {
    success: true,
    scanned: scanned ? true : false,
    sddPath: sddDir,
    agentsPath: agentsMdPath
  }
}
