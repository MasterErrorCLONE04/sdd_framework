import fs from 'fs'
import path from 'path'
import { scanProject, scanProjectViews } from './scanner.js'

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

  // 4.5 ui-ux/screens.json
  const screensPath = path.join(sddDir, 'ui-ux', 'screens.json')
  if (!fs.existsSync(screensPath)) {
    const screens = scanned?.detectedScreens || scanProjectViews(projectRoot)
    fs.writeFileSync(screensPath, JSON.stringify(screens, null, 2), 'utf-8')
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

  // 4.10 execution/ (tasks.json, phases.json)
  const execPhasesPath = path.join(sddDir, 'execution', 'phases.json')
  if (!fs.existsSync(execPhasesPath)) {
    fs.writeFileSync(execPhasesPath, JSON.stringify([
      { id: 'phase-1', name: 'Fase 1: Configuración & Modelos', order: 1, status: 'planned', taskIds: [] },
      { id: 'phase-2', name: 'Fase 2: Lógica Central & API', order: 2, status: 'planned', taskIds: [] },
      { id: 'phase-3', name: 'Fase 3: Interfaz & UX', order: 3, status: 'planned', taskIds: [] }
    ], null, 2), 'utf-8')
  }

  const execTasksPath = path.join(sddDir, 'execution', 'tasks.json')
  if (!fs.existsSync(execTasksPath)) {
    fs.writeFileSync(execTasksPath, JSON.stringify([], null, 2), 'utf-8')
  }

  // 4.11 governance/quality-gates.json
  const gatesPath = path.join(sddDir, 'governance', 'quality-gates.json')
  if (!fs.existsSync(gatesPath)) {
    fs.writeFileSync(gatesPath, JSON.stringify([
      { id: 'gate-problem', name: 'Definición de Problema & Valor', stage: 'discovery', status: 'pending' },
      { id: 'gate-scope', name: 'Límites de Alcance & Non-Goals', stage: 'product', status: 'pending' },
      { id: 'gate-requirements', name: 'Historias con Criterios Gherkin', stage: 'requirements', status: 'pending' },
      { id: 'gate-architecture', name: 'Topología & Base de Datos', stage: 'architecture', status: 'pending' },
      { id: 'gate-tasks', name: 'Plan de Tareas con Scope Shield', stage: 'execution', status: 'pending' }
    ], null, 2), 'utf-8')
  }

  // 5. AGENTS.md rulebook
  if (!fs.existsSync(agentsMdPath)) {
    const agentsRuleContent = `# Protocolo SDD (Spec-Driven Development) — "Single Source of Truth"

El desarrollo, las especificaciones y las tareas de este proyecto se gestionan formalmente en \`.sdd/\`.
Cualquier agente de IA (Antigravity, Cursor, Windsurf, Claude Code, etc.) DEBE acatar estrictamente las siguientes reglas:

0. **Constitución e Invariantes del Proyecto:**
   - Lee \`.sdd/core/constitution.json\`: Cumple rigurosamente con los invariantes de calidad, tipado y arquitectura.
   - Lee \`.sdd/core/scope-boundaries.json\`: NUNCA programes features listadas en \`explicitNonGoals\`.
   - Consulta \`.sdd/project.json\` para entender el propósito y compuertas de calidad.

1. **Lectura Previa Obligatoria:**
   - Antes de escribir código, consulta la Historia en \`.sdd/requirements/stories/<US-ID>.json\` o el nodo en \`.sdd/flows/<flujo>.json\`.
   - Identifica el objetivo técnico y la lista blanca de archivos \`scopeFiles\`.

2. **Aislamiento de Alcance (Scope Protection):**
   - NO modifiques archivos que no estén listados en \`scopeFiles\` del nodo o historia activa. Está prohibido alterar código fuera de alcance.

3. **Criterios de Aceptación Gherkin (Dado-Cuando-Entonces):**
   - Cada Historia de Usuario define criterios de aceptación específicos.
   - Verifica cada uno contra el código real y cambia \`"done": false\` a \`"done": true\` en el archivo de la historia.

4. **Actualización Atómica del Estado (1 Archivo por Entidad):**
   - Trabaja sobre el archivo individual de la entidad para evitar conflictos de merge.
   - Cuando todas las tareas estén completadas, actualiza \`"status": "done"\` y firma en \`"assignedTo": "NombreAgente"\`.

5. **Bucle de Convergencia (Spec Convergence):**
   - Verifica que el código satisfaga el 100% de la especificación sin introducir regresiones ni archivos fuera de scope.
`
    fs.writeFileSync(agentsMdPath, agentsRuleContent, 'utf-8')
  }

  return {
    success: true,
    scanned: scanned ? true : false,
    sddPath: sddDir,
    agentsPath: agentsMdPath
  }
}
