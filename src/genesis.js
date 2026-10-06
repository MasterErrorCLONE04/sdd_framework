import fs from 'fs'
import path from 'path'
import { extractJsonFromAi } from './flows-ai.js'
import { normalizeProjectModel, calculateProjectProgress, normalizeBusinessRule, normalizeUserFlow, normalizeBusinessFlow, normalizeTechStack, normalizeEndpoint, normalizeApiContract, normalizeDatabaseTable, normalizeDatabaseRelationship, normalizeScreen, normalizeWireframe, normalizeDesignSystem, normalizeExecutionPhase, normalizeExecutionTask, normalizeDependencyGraph, normalizeQualityGate, STAGES } from './model-schema.js'
import { compileAgentContext } from './agent-context.js'

/**
 * Construcción de especificación de las 12 perspectivas
 * a partir de la respuesta generada por la IA de OpenRouter con datos reales.
 */
export function buildSpecFromAi(aiData, rawText = '', existingSpec = null) {
  const projName = aiData.projectName || existingSpec?.project?.name || existingSpec?.meta?.name || 'NuevoProyecto'
  const purpose = aiData.purpose || existingSpec?.project?.purpose || 'comercial'
  const depth = aiData.depth || existingSpec?.project?.depth || 'serio'
  const currentPhase = Number(aiData.currentPhase || existingSpec?.currentPhase || (aiData.stage === 'product' ? 2 : (aiData.stage === 'requirements' ? 3 : (aiData.stage === 'ux' ? 4 : (aiData.stage === 'architecture' ? 5 : (aiData.stage === 'execution' || aiData.stage === 'ready' ? 6 : 1))))))
  const stage = aiData.stage || existingSpec?.stage || (currentPhase === 1 ? 'discovery' : (currentPhase === 2 ? 'product' : (currentPhase === 3 ? 'requirements' : (currentPhase === 4 ? 'ux' : (currentPhase === 5 ? 'architecture' : 'execution')))))

  // 0. Problema y Dolores identificados o heredados
  const existingProblem = existingSpec?.core?.problem || existingSpec?.product?.vision?.problem
  const problemStatement = aiData.problem?.statement || (typeof aiData.problem === 'string' ? aiData.problem : (existingProblem?.statement || (typeof existingProblem === 'string' ? existingProblem : `Resolver la automatización de ${projName}.`)))
  const problemPainPoints = (Array.isArray(aiData.problem?.painPoints) && aiData.problem.painPoints.length > 0)
    ? aiData.problem.painPoints.map((p, i) => ({
        id: p.id || `p-${i + 1}`,
        pain: p.pain || (typeof p === 'string' ? p : 'Dolor operacional no resuelto'),
        severity: p.severity || 'alta',
        evidence: p.evidence || 'Impacto operacional',
        solution: p.solution || 'Flujo digitalizado directo'
      }))
    : (Array.isArray(existingProblem?.painPoints) && existingProblem.painPoints.length > 0
        ? existingProblem.painPoints
        : [
            { id: 'p-1', pain: 'Fricción en procesos no automatizados', severity: 'alta', evidence: 'Pérdida de conversión', solution: 'Flujo digitalizado directo' }
          ])

  // 1. Non-Goals definidos por la IA o heredados de etapas anteriores
  const existingNonGoals = existingSpec?.product?.scope?.explicitNonGoals || existingSpec?.core?.scopeBoundaries?.explicitNonGoals || []
  const nonGoals = Array.isArray(aiData.nonGoals) && aiData.nonGoals.length > 0
    ? aiData.nonGoals.map((ng, i) => ({
        id: `ng-${i + 1}`,
        feature: ng.feature || ng,
        rationale: ng.rationale || 'Congelado para V2 para evitar sobre-alcance'
      }))
    : (existingNonGoals.length > 0
        ? existingNonGoals.map((ng, i) => (typeof ng === 'string' ? { id: `ng-${i + 1}`, feature: ng, rationale: 'Congelado para V2' } : ng))
        : [])

  // 2. Servicios de Arquitectura definidos por la IA o heredados
  const existingServices = existingSpec?.architecture?.services || []
  const services = Array.isArray(aiData.services) && aiData.services.length > 0
    ? aiData.services.map((s, i) => ({
        id: `svc-${i + 1}`,
        label: s.label || s.name || `Servicio ${i + 1}`,
        tech: s.tech || 'Node.js / TypeScript',
        type: s.type || 'Service',
        status: 'online',
        healthPercent: 100
      }))
    : (existingServices.length > 0
        ? existingServices
        : [
            { id: 'svc-1', label: 'Web Application & API', tech: 'Next.js 15 / TypeScript', type: 'Frontend / API', status: 'online', healthPercent: 100 },
            { id: 'svc-2', label: 'Base de Datos Principal', tech: 'PostgreSQL 16', type: 'Database', status: 'online', healthPercent: 100 }
          ])

  // 3. Historias de Usuario Jira con Gherkin definidas por la IA o heredadas
  const existingStories = existingSpec?.requirements?.userStories || []
  const stories = Array.isArray(aiData.stories) && aiData.stories.length > 0
    ? aiData.stories.map((st, i) => ({
        id: st.id || `US-00${i + 1}`,
        epicId: st.epicId || 'EPIC-01',
        title: st.title || `Historia ${i + 1}`,
        role: st.role || 'usuario',
        action: st.action || 'ejecutar la funcionalidad correspondiente',
        benefit: st.benefit || 'cumplir con el objetivo del negocio',
        points: st.points || 3,
        priority: st.priority || 'P0',
        status: 'backlog',
        origin: 'ai',
        scopeFiles: Array.isArray(st.scopeFiles) && st.scopeFiles.length > 0 ? st.scopeFiles : ['src/**', 'app/**'],
        businessRuleIds: Array.isArray(st.businessRuleIds) ? st.businessRuleIds : (i === 0 ? ['BR-001'] : []),
        acceptanceCriteria: Array.isArray(st.acceptanceCriteria) && st.acceptanceCriteria.length > 0
          ? st.acceptanceCriteria.map((c, ci) => ({
              id: c.id || `c-${ci + 1}`,
              scenario: c.scenario || 'Escenario de verificación',
              given: c.given || 'el usuario en la aplicación',
              when: c.when || 'ejecuta la acción requerida',
              then: c.then || 'el sistema responde con éxito',
              done: false
            }))
          : [
              { id: 'c-1', scenario: 'Verificación de requerimiento', given: 'el usuario en el sistema', when: 'opera la función', then: 'el sistema confirma', done: false }
            ]
      }))
    : (existingStories.length > 0
        ? existingStories
        : [
            {
              id: 'US-001',
              epicId: 'EPIC-01',
              title: `Configuración y Acceso a ${projName}`,
              role: 'usuario autenticado',
              action: 'acceder de forma segura a mi espacio de trabajo',
              benefit: 'operar la plataforma de forma protegida',
              points: 3,
              priority: 'P0',
              status: 'backlog',
              origin: 'ai',
              scopeFiles: ['app/**', 'src/**'],
              businessRuleIds: ['BR-001'],
              acceptanceCriteria: [
                { id: 'c-1', scenario: 'Acceso seguro', given: 'un usuario con credenciales', when: 'inicia sesión', then: 'accede al dashboard principal', done: false }
              ]
            }
          ])

  // 4. Personas / Usuarios Objetivo definidos por la IA o heredados
  const existingPersonas = existingSpec?.product?.actors || existingSpec?.core?.targetUsers?.personas || []
  const personas = Array.isArray(aiData.targetUsers) && aiData.targetUsers.length > 0
    ? aiData.targetUsers.map((u, i) => ({
        id: u.id || `usr-${i + 1}`,
        role: u.role || 'Usuario',
        need: u.need || 'Operar el sistema con alta eficiencia',
        frequency: u.frequency || 'Diaria'
      }))
    : (existingPersonas.length > 0
        ? existingPersonas
        : [
            { id: 'usr-1', role: 'Usuario Final / Cliente', need: 'Acceder rápidamente al servicio', frequency: 'Recurrente' },
            { id: 'usr-2', role: 'Administrador', need: 'Gestionar la operación y configuraciones', frequency: 'Diaria' }
          ])

  // 5. Modelo ERD / Base de Datos definido por la IA o heredado
  const existingTables = existingSpec?.database?.tables || []
  const rawTables = (Array.isArray(aiData.database?.tables) && aiData.database.tables.length > 0)
    ? aiData.database.tables
    : (Array.isArray(aiData.database) && aiData.database.length > 0
        ? aiData.database
        : (existingTables.length > 0
            ? existingTables
            : [
                {
                  id: 'tbl-01',
                  table: 'users',
                  description: 'Usuarios y credenciales del sistema',
                  columns: [
                    { name: 'id', type: 'UUID', isPk: true, notNull: true, unique: true },
                    { name: 'email', type: 'VARCHAR(255)', notNull: true, unique: true },
                    { name: 'role', type: 'VARCHAR(50)', notNull: true, default: "'user'" },
                    { name: 'created_at', type: 'TIMESTAMP', notNull: true }
                  ]
                },
                {
                  id: 'tbl-02',
                  table: 'items',
                  description: `Entidad operativa principal de ${projName}`,
                  columns: [
                    { name: 'id', type: 'UUID', isPk: true, notNull: true, unique: true },
                    { name: 'user_id', type: 'UUID', notNull: true },
                    { name: 'title', type: 'VARCHAR(255)', notNull: true },
                    { name: 'status', type: 'VARCHAR(50)', notNull: true, default: "'active'" },
                    { name: 'created_at', type: 'TIMESTAMP', notNull: true }
                  ],
                  foreignKeys: [
                    { column: 'user_id', referencedTable: 'users', referencedColumn: 'id' }
                  ]
                }
              ]))
  const tables = rawTables.map(normalizeDatabaseTable)

  const relationships = (Array.isArray(aiData.database?.relationships) && aiData.database.relationships.length > 0
    ? aiData.database.relationships
    : (Array.isArray(aiData.relationships) && aiData.relationships.length > 0 ? aiData.relationships : (
        tables.length > 1 ? [
          {
            id: 'rel-01',
            fromTable: tables[1].table,
            fromColumn: 'user_id',
            toTable: tables[0].table,
            toColumn: 'id',
            type: '1:N',
            onDelete: 'CASCADE',
            description: `Relación 1:N entre ${tables[0].table} y ${tables[1].table}`
          }
        ] : []
      ))).map(normalizeDatabaseRelationship)

  // 6. Nodos de Flujo Conectados
  const flowNodes = services.map((s, i) => ({
    id: `node-${s.id}`,
    serviceId: s.id,
    label: s.label,
    tech: s.tech,
    scopeFiles: ['src/**', 'app/**'],
    order: i + 1
  }))

  const flowEdges = []
  for (let i = 0; i < flowNodes.length - 1; i++) {
    flowEdges.push({
      id: `edge-${i + 1}`,
      source: flowNodes[i].id,
      target: flowNodes[i + 1].id,
      label: 'Invoca / Conecta'
    })
  }

  // 7. Secuencia UML
  const participants = services.map(s => s.label)
  const mermaidLines = ['sequenceDiagram', 'autonumber']
  participants.forEach(p => mermaidLines.push(`    participant ${p.replace(/[^a-zA-Z0-9]/g, '')} as ${p}`))
  if (participants.length >= 2) {
    const p1 = participants[0].replace(/[^a-zA-Z0-9]/g, '')
    const p2 = participants[1].replace(/[^a-zA-Z0-9]/g, '')
    mermaidLines.push(`    ${p1}->>${p2}: 1. Solicitud de operación`)
    mermaidLines.push(`    ${p2}-->>${p1}: 2. Respuesta y confirmación`)
  }

  return {
    rawIdea: rawText,
    project: {
      name: projName,
      tagline: aiData.tagline || `Plataforma ${projName} gobernada bajo protocolo SDD`,
      purpose,
      depth,
      targetLaunchWeeks: 4,
      qualityGates: {
        requireGherkin: true,
        enforceScopeFiles: true,
        blockDriftOnCommit: true,
        minTestCoveragePercent: 80
      }
    },
    core: {
      problem: {
        statement: problemStatement,
        painPoints: problemPainPoints
      },
      scopeBoundaries: {
        explicitNonGoals: nonGoals
      },
      targetUsers: {
        personas
      },
      successCriteria: {
        metrics: [
          { id: 'm-1', name: 'Tiempo de respuesta en API', target: '< 200ms', baseline: 'Manual' },
          { id: 'm-2', name: 'Tasa de finalización exitosa', target: '> 90%', baseline: '0%' }
        ]
      },
      risks: {
        risks: [
          { id: 'r-1', risk: 'Deriva de alcance durante el desarrollo', severity: 'alta', mitigation: 'Aislamiento de scopeFiles con SDD Scope Shield' }
        ]
      }
    },
    requirements: {
      epics: Array.isArray(aiData.epics) && aiData.epics.length > 0 ? aiData.epics : [
        { id: 'EPIC-01', title: 'Funcionalidades Centrales de la V1', status: 'in_progress', targetSprint: 'Sprint 1', moduleId: 'mod-1', storyIds: stories.map(s => s.id) }
      ],
      userStories: stories,
      businessRules: Array.isArray(aiData.businessRules) && aiData.businessRules.length > 0
        ? aiData.businessRules.map((br, i) => normalizeBusinessRule(br, i))
        : [
            normalizeBusinessRule({
              id: 'BR-001',
              code: 'BR-001',
              title: `Integridad de Datos en ${projName}`,
              rule: 'Toda petición que modifique estado debe validar esquemas y autenticación antes de persistir.',
              category: 'Validation & Security',
              severity: 'mandatory',
              enforcedAt: ['api', 'ui'],
              relatedStories: stories.slice(0, 2).map(s => s.id)
            }, 0)
          ]
    },
    userFlows: Array.isArray(aiData.userFlows) && aiData.userFlows.length > 0
      ? aiData.userFlows.map(normalizeUserFlow)
      : [
          normalizeUserFlow({
            id: 'uf-01',
            name: `Recorrido de ${personas[0]?.role || 'Usuario'} en ${projName}`,
            actorId: personas[0]?.id || 'actor-user',
            actor: personas[0]?.role || 'Usuario',
            startScreen: '/',
            endScreen: '/dashboard',
            description: `Ruta principal de interacción para ${personas[0]?.role || 'el usuario'} en la V1.`,
            steps: [
              { order: 1, screen: '/', action: 'Ingreso al sistema y visualización de opciones', outcome: 'Carga de dashboard' },
              { order: 2, screen: '/', action: `Ejecuta acción principal de ${projName}`, outcome: 'Procesamiento de datos' },
              { order: 3, screen: '/dashboard', action: 'Confirma resultado', outcome: 'Confirmación visual exitosa' }
            ]
          }, 0)
        ],
    businessFlows: Array.isArray(aiData.businessFlows) && aiData.businessFlows.length > 0
      ? aiData.businessFlows.map(normalizeBusinessFlow)
      : [
          normalizeBusinessFlow({
            id: 'bf-01',
            name: `Pipeline Operativo — ${projName}`,
            description: 'Recorrido transaccional del backend de punta a punta.',
            priority: 'P0',
            progress: 0,
            origin: 'spec',
            trigger: 'Solicitud del usuario o webhook externo',
            nodes: flowNodes,
            edges: flowEdges,
            relatedStories: stories.map(s => s.id),
            relatedRules: ['BR-001']
          }, 0)
        ],
    flows: [
      {
        id: '01-flujo-principal',
        title: `Flujo Principal — ${projName}`,
        description: 'Recorrido de punta a punta entre el usuario y los servicios.',
        nodes: flowNodes,
        edges: flowEdges
      }
    ],
    architecture: {
      services
    },
    database: {
      tables,
      relationships
    },
    currentPhase: aiData.currentPhase || 1,
    phaseTitle: aiData.phaseTitle || 'Estructuración de Requerimientos',
    suggestedActions: Array.isArray(aiData.suggestedActions) && aiData.suggestedActions.length > 0
      ? aiData.suggestedActions
      : ['Aprobar y continuar con la siguiente fase', 'Añadir más detalles al alcance'],
    sequences: [
      {
        id: 'seq-01-flujo-principal',
        flowId: '01-flujo-principal',
        title: `Secuencia UML: ${projName}`,
        mermaid: (typeof aiData.sequenceUml === 'string' && aiData.sequenceUml.includes('sequenceDiagram'))
          ? aiData.sequenceUml
          : `sequenceDiagram\n    autonumber\n    actor U as 👤 ${(stories[0]?.role || 'Usuario')}\n    participant FE as 🖥️ ${(services[0]?.label || 'Frontend Web')}\n    participant BE as ⚡ ${(services[1]?.label || 'Backend API')}\n    participant DB as 🐘 ${(tables[0]?.table ? `DB (${tables[0].table})` : 'Base de Datos')}\n\n    U->>FE: 1. Inicia acción en la interfaz\n    FE->>BE: 2. Petición autenticada con payload protegido\n    BE->>DB: 3. Operación transaccional y validación de reglas\n    DB-->>BE: 4. Confirmación de datos persistidos\n    BE-->>FE: 5. Respuesta JSON (200 OK)\n    FE-->>U: 6. Actualización reactiva de estado en pantalla`
      }
    ],
    stateMachines: [
      {
        id: 'fsm-01-ciclo-vida',
        title: `Máquina de Estados: ${projName}`,
        entity: 'Operacion',
        mermaid: (typeof aiData.stateMachine === 'string' && aiData.stateMachine.includes('stateDiagram'))
          ? aiData.stateMachine
          : `stateDiagram-v2\n    [*] --> Borrador: Creación inicial\n    Borrador --> Validado: Verificación de reglas\n    Validado --> EnProceso: Autorizado para ejecución\n    EnProceso --> Completado: Cumplimiento exitoso\n    EnProceso --> Fallido: Excepción o rechazo\n    Completado --> [*]\n    Fallido --> [*]`
      }
    ],
    uiUx: {
      screens: Array.isArray(aiData.screens) && aiData.screens.length > 0
        ? aiData.screens.map((sc, i) => normalizeScreen({
            id: sc.id || `SCR-${String(i + 1).padStart(2, '0')}`,
            name: sc.name || `Pantalla ${i + 1}`,
            route: sc.route || (i === 0 ? '/' : `/${(sc.name || `pantalla-${i + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
            actor: sc.actor || personas[0]?.role || 'Usuario',
            purpose: sc.purpose || sc.description || `Vista estructurada de interfaz para ${sc.name || 'la aplicación'}`,
            components: Array.isArray(sc.components) ? sc.components : ['Header', 'MainContent', 'Footer'],
            states: sc.states || {
              loading: 'Skeleton loader activo durante la obtención de datos.',
              empty: 'Sin datos disponibles. Sugerir acción inicial.',
              error: 'Mensaje de error y botón de reintento.',
              success: 'Vista interactiva y datos cargados.'
            },
            dataRequired: Array.isArray(sc.dataRequired) ? sc.dataRequired : (tables[0]?.table ? [tables[0].table] : []),
            relatedFlows: Array.isArray(sc.relatedFlows) ? sc.relatedFlows : ['01-flujo-principal'],
            relatedStories: Array.isArray(sc.relatedStories) ? sc.relatedStories : (stories[0]?.id ? [stories[0].id] : []),
            layout: sc.layout || 'standard-app'
          }, i))
        : ((existingSpec?.uiUx?.screens?.length > 0)
            ? existingSpec.uiUx.screens
            : [
                normalizeScreen({
                  id: 'SCR-01',
                  name: 'Dashboard Principal',
                  route: '/',
                  actor: personas[0]?.role || 'Usuario',
                  purpose: `Centro de control interactivo para ${projName}.`,
                  components: ['Navbar', 'Sidebar', 'MetricCard', 'DataTable'],
                  states: {
                    loading: 'Skeleton de métricas cargando.',
                    empty: 'Sin registros iniciales.',
                    error: 'Error al conectar con la API central.',
                    success: 'Panel principal activo.'
                  },
                  dataRequired: tables.map(t => t.table).slice(0, 2),
                  relatedFlows: ['01-flujo-principal'],
                  relatedStories: stories.slice(0, 2).map(s => s.id)
                }, 0)
              ]),
      wireframes: Array.isArray(aiData.wireframes) && aiData.wireframes.length > 0
        ? aiData.wireframes.map(normalizeWireframe)
        : ((existingSpec?.uiUx?.wireframes?.length > 0)
            ? existingSpec.uiUx.wireframes
            : [
                normalizeWireframe({
                  id: 'WF-01',
                  screenId: 'SCR-01',
                  title: `Wireframe: Dashboard de ${projName}`,
                  layout: 'dashboard',
                  blocks: [
                    { id: 'blk-nav', type: 'navbar', title: 'Barra Superior', properties: { brand: projName, links: ['Inicio', 'Módulos', 'Ajustes'] } },
                    { id: 'blk-side', type: 'sidebar', title: 'Menú Lateral', properties: { items: ['Dashboard', 'Operaciones', 'Historial'] } },
                    { id: 'blk-stats', type: 'stats-grid', title: 'Métricas Clave', properties: { items: [{ label: 'Total', value: '1,280' }, { label: 'Salud', value: '100%' }] } },
                    { id: 'blk-table', type: 'table', title: 'Registros Recientes', properties: { columns: ['ID', 'Nombre', 'Estado', 'Fecha'] } },
                    { id: 'blk-act', type: 'actions', title: 'Acciones Rápidas', properties: { buttons: ['Crear Registro', 'Exportar'] } }
                  ]
                }, 0)
              ]),
      designSystem: normalizeDesignSystem(aiData.designSystem || existingSpec?.uiUx?.designSystem || {}),
      components: Array.isArray(aiData.components) ? aiData.components : (existingSpec?.uiUx?.components || [
        'Navbar', 'Sidebar', 'MetricCard', 'DataTable', 'ModalDialog', 'ToastNotification'
      ])
    },
    discovery: {
      interviewSessions: buildDiscoveryInterviews(projName, purpose, depth, services)
    },
    product: {
      vision: {
        problem: aiData.problem?.statement || (typeof aiData.problem === 'string' ? aiData.problem : (existingSpec?.core?.problem?.statement || existingSpec?.product?.vision?.problem || `Resolver la automatización de ${projName}.`)),
        targetAudience: personas[0]?.role || 'Usuarios principales del sistema',
        valueProposition: aiData.tagline || existingSpec?.product?.vision?.valueProposition || `Plataforma ${projName} gobernada bajo protocolo SDD`,
        coreGoals: Array.isArray(aiData.problem?.painPoints) && aiData.problem.painPoints.length > 0 ? aiData.problem.painPoints.map(p => p.pain || p) : (existingSpec?.product?.vision?.coreGoals || []),
        successMetrics: Array.isArray(aiData.successCriteria?.metrics) ? aiData.successCriteria.metrics : (existingSpec?.product?.vision?.successMetrics || [])
      },
      scope: {
        inScopeV1: (Array.isArray(aiData.inScopeV1) && aiData.inScopeV1.length > 0) ? aiData.inScopeV1 : (existingSpec?.product?.scope?.inScopeV1 || ['Funcionalidad mínima viable para V1']),
        explicitNonGoals: nonGoals.map(ng => ng.feature || ng),
        futureBacklog: Array.isArray(aiData.futureBacklog) ? aiData.futureBacklog : (existingSpec?.product?.scope?.futureBacklog || [])
      },
      actors: personas,
      modules: (Array.isArray(aiData.modules) && aiData.modules.length > 0) ? aiData.modules : (existingSpec?.product?.modules || [
        { id: 'mod-1', name: 'Gestión Principal', description: `Núcleo de operaciones de ${projName}` }
      ])
    },
    businessRules: (Array.isArray(aiData.businessRules) && aiData.businessRules.length > 0) ? aiData.businessRules.map((br, i) => ({
      id: br.id || `BR-${String(i + 1).padStart(3, '0')}`,
      code: br.code || `BR-${String(i + 1).padStart(3, '0')}`,
      rule: br.rule || br.title || br.description,
      category: br.category || 'Business Logic',
      enforcedAt: br.enforcedAt || ['api', 'ui']
    })) : (existingSpec?.businessRules || []),
    stack: normalizeTechStack(aiData.stack || existingSpec?.stack || {
      frontend: { framework: 'Modern Web / Vanilla / Vite', language: 'JavaScript / TypeScript', styling: 'Vanilla CSS / Tailwind' },
      backend: { framework: 'Node.js REST API', runtime: 'Node >= 18', architecturePattern: 'Layered Services' },
      database: { engine: 'PostgreSQL 16 / SQLite', orm: 'Prisma / SQL' },
      auth: { strategy: 'JWT / Session Bearer', rbac: true },
      deployment: { target: 'Local / Docker', ciCd: 'GitHub Actions' }
    }),
    api: {
      endpoints: ((Array.isArray(aiData.endpoints) && aiData.endpoints.length > 0) ? aiData.endpoints : (existingSpec?.api?.endpoints || [
        { id: 'api-01', method: 'GET', path: '/api/v1/health', summary: 'Healthcheck del servicio', actor: 'public', statusCodes: [200] },
        { id: 'api-02', method: 'GET', path: '/api/v1/items', summary: `Listar elementos de ${projName}`, actor: 'user', requestDto: null, responseDto: 'ItemsListDTO', relatedStoryIds: stories.slice(0, 1).map(s => s.id) },
        { id: 'api-03', method: 'POST', path: '/api/v1/items', summary: `Crear elemento en ${projName}`, actor: 'user', requestDto: 'CreateItemDTO', responseDto: 'ItemDetailDTO', relatedRuleIds: ['BR-001'], relatedStoryIds: stories.slice(0, 1).map(s => s.id) }
      ])).map(normalizeEndpoint),
      contracts: ((Array.isArray(aiData.apiContracts || aiData.contracts) && (aiData.apiContracts || aiData.contracts).length > 0) ? (aiData.apiContracts || aiData.contracts) : (existingSpec?.api?.contracts || [
        {
          id: 'dto-01',
          name: 'CreateItemDTO',
          description: `Cuerpo de petición para crear un registro en ${projName}`,
          properties: [
            { name: 'title', type: 'string', required: true, description: 'Título o nombre' },
            { name: 'description', type: 'string', required: false, description: 'Detalle opcional' }
          ]
        },
        {
          id: 'dto-02',
          name: 'ItemDetailDTO',
          description: `Representación de un registro en ${projName}`,
          properties: [
            { name: 'id', type: 'string', required: true, description: 'Identificador único' },
            { name: 'title', type: 'string', required: true, description: 'Título' },
            { name: 'status', type: 'string', required: true, description: 'Estado actual' },
            { name: 'createdAt', type: 'string', required: true, description: 'Marca temporal ISO' }
          ]
        }
      ])).map(normalizeApiContract)
    },
    execution: {
      phases: ((Array.isArray(aiData.phases) && aiData.phases.length > 0) ? aiData.phases : (existingSpec?.execution?.phases || [
        normalizeExecutionPhase({ id: 'phase-1', name: 'Fase 1: Configuración & Modelos Base', order: 1, status: 'planned', taskIds: stories.slice(0, 1).map(s => `task-${s.id}`) }, 0),
        normalizeExecutionPhase({ id: 'phase-2', name: 'Fase 2: Lógica Central & Endpoints API', order: 2, status: 'planned', taskIds: stories.slice(1, 3).map(s => `task-${s.id}`) }, 1),
        normalizeExecutionPhase({ id: 'phase-3', name: 'Fase 3: Interfaz & Experiencia UX', order: 3, status: 'planned', taskIds: stories.slice(3).map(s => `task-${s.id}`) }, 2),
        normalizeExecutionPhase({ id: 'phase-4', name: 'Fase 4: Verificación & Cierre SDD', order: 4, status: 'planned', taskIds: [] }, 3)
      ])),
      tasks: ((Array.isArray(aiData.tasks) && aiData.tasks.length > 0) ? aiData.tasks : (existingSpec?.execution?.tasks || stories.map((st, i) => normalizeExecutionTask({
        id: `task-${st.id}`,
        storyId: st.id,
        phaseId: i === 0 ? 'phase-1' : (i < 3 ? 'phase-2' : 'phase-3'),
        title: st.title,
        status: 'planned',
        scopeFiles: st.scopeFiles || ['src/**'],
        dependencies: i > 0 ? [`task-${stories[i - 1].id}`] : [],
        acceptanceCriteria: st.acceptanceCriteria || [],
        estimatedDifficulty: i === 0 ? 'low' : (i < 3 ? 'medium' : 'high')
      }, i)))),
      dependencies: normalizeDependencyGraph({}, stories.map((st, i) => ({
        id: `task-${st.id}`,
        dependencies: i > 0 ? [`task-${stories[i - 1].id}`] : []
      })))
    },
    governance: {
      qualityGates: [
        normalizeQualityGate({ id: 'gate-problem', name: 'Definición de Problema & Valor', stage: 'discovery', status: 'approved' }, 0),
        normalizeQualityGate({ id: 'gate-scope', name: 'Límites de Alcance & Non-Goals', stage: 'product', status: 'approved' }, 1),
        normalizeQualityGate({ id: 'gate-requirements', name: 'Historias con Criterios Gherkin', stage: 'requirements', status: 'approved' }, 2),
        normalizeQualityGate({ id: 'gate-architecture', name: 'Topología & Base de Datos', stage: 'architecture', status: 'approved' }, 3),
        normalizeQualityGate({ id: 'gate-tasks', name: 'Plan de Tareas con Scope Shield', stage: 'execution', status: 'approved' }, 4)
      ]
    },
    stage,
    currentPhase,
    phaseTitle: aiData.phaseTitle || `Etapa ${currentPhase}: ${stage}`,
    readyToScaffold: Boolean(aiData.readyToScaffold || currentPhase >= 6 || stage === 'ready')
  }
}

/**
 * Estructura las 7 fases de entrevistas pre-código SDD
 */
export function buildDiscoveryInterviews(projectName, purpose, depth, services = []) {
  const techList = services.map(s => s.tech).join(', ')
  return [
    {
      id: 'PHASE-01',
      category: 'Fase 1: El Problema Real & La Audiencia',
      title: 'Fase 1: El Problema Real & La Audiencia',
      badge: 'El Por Qué',
      questions: [
        {
          id: 'q-problem-statement',
          question: `¿Cuál es el dolor principal que resuelve ${projectName}?`,
          answer: `Proveer una solución técnica y moderna que elimine fricciones y automatice el flujo de ${projectName}.`,
          status: 'answered'
        },
        {
          id: 'q-target-users',
          question: '¿Quiénes son los usuarios prioritarios de la V1?',
          answer: 'Clientes finales y administradores de la plataforma.',
          status: 'answered'
        }
      ]
    },
    {
      id: 'PHASE-02',
      category: 'Fase 2: Alcance & Non-Goals V1',
      title: 'Fase 2: Alcance & Non-Goals V1',
      badge: 'El Hasta Dónde',
      questions: [
        {
          id: 'q-v1-boundaries',
          question: '¿Qué funcionalidades quedan estrictamente congeladas para la V2 para evitar dispersión?',
          answer: 'Se congelan aplicaciones móviles nativas y multi-región compleja para asegurar la entrega de la V1.',
          status: 'answered'
        }
      ]
    },
    {
      id: 'PHASE-03',
      category: 'Fase 3: Stack Tecnológico & Arquitectura',
      title: 'Fase 3: Stack Tecnológico & Arquitectura',
      badge: 'El Con Qué',
      questions: [
        {
          id: 'q-tech-stack',
          question: '¿Cuáles son las tecnologías seleccionadas para Frontend, Backend y Base de Datos?',
          answer: techList || 'Next.js 15, TypeScript y PostgreSQL.',
          status: 'answered'
        }
      ]
    },
    {
      id: 'PHASE-04',
      category: 'Fase 4: Modelo de Datos & Estados',
      title: 'Fase 4: Modelo de Datos & Estados',
      badge: 'El Qué Maneja',
      questions: [
        {
          id: 'q-database-erd',
          question: '¿Cómo se garantiza la consistencia transaccional y el ciclo de vida de los estados?',
          answer: 'Transacciones ACID respaldadas por PostgreSQL y máquina de estados finita determinista.',
          status: 'answered'
        }
      ]
    },
    {
      id: 'PHASE-05',
      category: 'Fase 5: Flujo de Usuario & Casos Críticos',
      title: 'Fase 5: Flujo de Usuario & Casos Críticos',
      badge: 'El Cómo Funciona',
      questions: [
        {
          id: 'q-happy-path',
          question: '¿Cuál es el recorrido óptimo del usuario desde el inicio hasta el objetivo?',
          answer: 'El usuario accede, realiza su acción en 1 flujo claro y recibe comprobante inmediato.',
          status: 'answered'
        }
      ]
    },
    {
      id: 'PHASE-06',
      category: 'Fase 6: Integraciones & Dependencias Externas',
      title: 'Fase 6: Integraciones & Dependencias Externas',
      badge: 'Las Dependencias',
      questions: [
        {
          id: 'q-integrations',
          question: '¿Qué servicios externos se integran y cómo se maneja la idempotencia?',
          answer: 'Verificación criptográfica de webhooks y claves de idempotencia para prevenir duplicados.',
          status: 'answered'
        }
      ]
    },
    {
      id: 'PHASE-07',
      category: 'Fase 7: Criterios Gherkin & Calidad',
      title: 'Fase 7: Criterios Gherkin & Calidad',
      badge: 'El Cómo Validamos',
      questions: [
        {
          id: 'q-quality-gates',
          question: '¿Qué compuertas de calidad son obligatorias antes de autorizar código?',
          answer: 'Criterios Dado-Cuando-Entonces verificados contra tests reales y política de Scope Protection en AGENTS.md.',
          status: 'answered'
        }
      ]
    }
  ]
}

/**
 * Análisis heurístico y semántico de impacto ante cambios introducidos por el usuario
 */
export function analyzeImpact(message = '', currentPreview = null) {
  const text = (message || '').toLowerCase()
  const impacts = []
  const affectedDomains = []
  const suggestedAdjustments = []

  // Heurísticas de impacto en alcance / eliminación
  if (text.includes('no quiero') || text.includes('sin') || text.includes('eliminar') || text.includes('quitar') || text.includes('remover') || text.includes('cancelar')) {
    if (text.includes('movil') || text.includes('móvil') || text.includes('app') || text.includes('ios') || text.includes('android')) {
      affectedDomains.push('product.scope', 'uiUx.screens', 'architecture.topology')
      impacts.push('Exclusión de aplicación móvil de la V1')
      suggestedAdjustments.push('Añadir "App móvil nativa en V1" a explicitNonGoals en scope.json')
      suggestedAdjustments.push('Focalizar arquitectura en Web Responsive (Next.js / Vite)')
    }
    if (text.includes('pago') || text.includes('cobro') || text.includes('stripe') || text.includes('tarjeta') || text.includes('monetiza')) {
      affectedDomains.push('product.scope', 'requirements.stories', 'api.endpoints')
      impacts.push('Postergación del módulo de procesamiento de pagos')
      suggestedAdjustments.push('Mover integración de pasarela de pago a futureBacklog')
    }
    if (text.includes('auth') || text.includes('login') || text.includes('registro') || text.includes('contraseña')) {
      affectedDomains.push('product.actors', 'requirements.stories', 'architecture.stack')
      impacts.push('Simplificación del mecanismo de autenticación')
      suggestedAdjustments.push('Adoptar acceso por enlace mágico o permitir navegación anónima en V1')
    }
  }

  // Heurísticas de impacto en expansión / adición
  if (text.includes('agregar') || text.includes('incluir') || text.includes('añadir') || text.includes('también') || text.includes('necesito') || text.includes('quiero que')) {
    if (text.includes('reporte') || text.includes('dashboard') || text.includes('analítica') || text.includes('estadística') || text.includes('grafic')) {
      affectedDomains.push('product.modules', 'uiUx.screens', 'requirements.stories')
      impacts.push('Incorporación de Módulo de Métricas y Analítica')
      suggestedAdjustments.push('Crear módulo "Métricas & Reportes" con vista SCR-Analytics')
    }
    if (text.includes('notific') || text.includes('email') || text.includes('correo') || text.includes('whatsapp') || text.includes('sms')) {
      affectedDomains.push('architecture.topology', 'requirements.stories', 'flows.businessFlows')
      impacts.push('Incorporación de Servicio de Mensajería / Notificaciones')
      suggestedAdjustments.push('Añadir servicio de notificaciones asíncrono y tareas de integración')
    }
    if (text.includes('rol') || text.includes('permiso') || text.includes('supervisor') || text.includes('mesero') || text.includes('cajero') || text.includes('repartidor')) {
      affectedDomains.push('product.actors', 'requirements.rolesMatrix', 'uiUx.screens')
      impacts.push('Ampliación de roles de usuario y permisos RBAC')
      suggestedAdjustments.push('Registrar nuevos actores en product/actors.json con permisos específicos')
    }
  }

  return {
    hasImpact: impacts.length > 0,
    detectedChange: impacts.join('; ') || 'Ajuste de especificación en diálogo con el usuario',
    affectedDomains: Array.from(new Set(affectedDomains)),
    suggestedAdjustments
  }
}

/**
 * Persistencia atómica de artefactos por cada etapa de Génesis
 */
export function persistGenesisStage(projectRoot, stage, stageData = {}) {
  const sddDir = path.join(projectRoot, '.sdd')
  const productDir = path.join(sddDir, 'product')
  const reqDir = path.join(sddDir, 'requirements')
  const flowsDir = path.join(sddDir, 'flows')
  const archDir = path.join(sddDir, 'architecture')
  const apiDir = path.join(sddDir, 'api')
  const execDir = path.join(sddDir, 'execution')
  const govDir = path.join(sddDir, 'governance')
  const uiDir = path.join(sddDir, 'ui-ux')

  // Asegurar carpetas
  ;[sddDir, productDir, reqDir, flowsDir, archDir, apiDir, execDir, govDir, uiDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
  })

  const projFile = path.join(sddDir, 'project.json')
  let project = {}
  try {
    if (fs.existsSync(projFile)) project = JSON.parse(fs.readFileSync(projFile, 'utf-8'))
  } catch {}

  const completed = Array.isArray(project.completedStages) ? [...project.completedStages] : []
  if (!completed.includes(stage)) completed.push(stage)

  switch (stage) {
    case 'discovery': {
      if (stageData.vision) {
        fs.writeFileSync(path.join(productDir, 'vision.json'), JSON.stringify(stageData.vision, null, 2), 'utf-8')
      }
      if (stageData.actors) {
        fs.writeFileSync(path.join(productDir, 'actors.json'), JSON.stringify(stageData.actors, null, 2), 'utf-8')
      }
      if (stageData.projectName) project.name = stageData.projectName
      if (stageData.tagline) project.tagline = stageData.tagline
      project.stage = 'product'
      project.progress = Math.max(project.progress || 0, 25)
      break
    }

    case 'product': {
      if (stageData.scope) {
        fs.writeFileSync(path.join(productDir, 'scope.json'), JSON.stringify(stageData.scope, null, 2), 'utf-8')
      }
      if (stageData.modules) {
        fs.writeFileSync(path.join(productDir, 'modules.json'), JSON.stringify(stageData.modules, null, 2), 'utf-8')
      }
      project.stage = 'requirements'
      project.progress = Math.max(project.progress || 0, 45)
      break
    }

    case 'requirements': {
      if (stageData.stories) {
        const storiesDir = path.join(reqDir, 'stories')
        if (!fs.existsSync(storiesDir)) fs.mkdirSync(storiesDir, { recursive: true })
        stageData.stories.forEach(st => {
          fs.writeFileSync(path.join(storiesDir, `${st.id}.json`), JSON.stringify(st, null, 2), 'utf-8')
        })
        fs.writeFileSync(path.join(reqDir, 'user-stories.json'), JSON.stringify(stageData.stories, null, 2), 'utf-8')
      }
      if (stageData.epics) {
        fs.writeFileSync(path.join(reqDir, 'epics.json'), JSON.stringify(stageData.epics, null, 2), 'utf-8')
      }
      if (stageData.businessRules) {
        fs.writeFileSync(path.join(reqDir, 'business-rules.json'), JSON.stringify(stageData.businessRules, null, 2), 'utf-8')
      }
      if (stageData.userFlows) {
        fs.writeFileSync(path.join(flowsDir, 'user-flows.json'), JSON.stringify(stageData.userFlows, null, 2), 'utf-8')
      }
      if (stageData.businessFlows) {
        fs.writeFileSync(path.join(flowsDir, 'business-flows.json'), JSON.stringify(stageData.businessFlows, null, 2), 'utf-8')
      }
      project.stage = 'architecture'
      project.progress = Math.max(project.progress || 0, 65)
      break
    }

    case 'architecture': {
      if (stageData.architecture) {
        fs.writeFileSync(path.join(sddDir, 'architecture.json'), JSON.stringify(stageData.architecture, null, 2), 'utf-8')
        fs.writeFileSync(path.join(archDir, 'architecture.json'), JSON.stringify(stageData.architecture, null, 2), 'utf-8')
      }
      if (stageData.stack) {
        fs.writeFileSync(path.join(archDir, 'stack.json'), JSON.stringify(normalizeTechStack(stageData.stack), null, 2), 'utf-8')
      }
      if (stageData.database) {
        fs.writeFileSync(path.join(sddDir, 'database', 'schema-erd.json'), JSON.stringify(stageData.database, null, 2), 'utf-8')
        if (stageData.database.relationships) {
          fs.writeFileSync(path.join(sddDir, 'database', 'relationships.json'), JSON.stringify(stageData.database.relationships, null, 2), 'utf-8')
        }
      }
      if (stageData.relationships) {
        fs.writeFileSync(path.join(sddDir, 'database', 'relationships.json'), JSON.stringify(stageData.relationships, null, 2), 'utf-8')
      }
      if (stageData.endpoints) {
        fs.writeFileSync(path.join(apiDir, 'endpoints.json'), JSON.stringify(stageData.endpoints.map(normalizeEndpoint), null, 2), 'utf-8')
      }
      if (stageData.contracts) {
        fs.writeFileSync(path.join(apiDir, 'contracts.json'), JSON.stringify(stageData.contracts.map(normalizeApiContract), null, 2), 'utf-8')
      }
      project.stage = 'ux'
      project.progress = Math.max(project.progress || 0, 80)
      break
    }

    case 'ux': {
      if (stageData.screens) {
        fs.writeFileSync(path.join(uiDir, 'screens.json'), JSON.stringify(stageData.screens.map(normalizeScreen), null, 2), 'utf-8')
      }
      if (stageData.wireframes) {
        fs.writeFileSync(path.join(uiDir, 'wireframes.json'), JSON.stringify(stageData.wireframes.map(normalizeWireframe), null, 2), 'utf-8')
      }
      if (stageData.designSystem) {
        fs.writeFileSync(path.join(uiDir, 'design-system.json'), JSON.stringify(normalizeDesignSystem(stageData.designSystem), null, 2), 'utf-8')
      }
      if (stageData.components) {
        fs.writeFileSync(path.join(uiDir, 'components.json'), JSON.stringify(stageData.components, null, 2), 'utf-8')
      }
      project.stage = 'execution'
      project.progress = Math.max(project.progress || 0, 90)
      break
    }

    case 'execution': {
      if (stageData.phases) {
        fs.writeFileSync(path.join(execDir, 'phases.json'), JSON.stringify(stageData.phases.map(normalizeExecutionPhase), null, 2), 'utf-8')
      }
      if (stageData.tasks) {
        fs.writeFileSync(path.join(execDir, 'tasks.json'), JSON.stringify(stageData.tasks.map(normalizeExecutionTask), null, 2), 'utf-8')
      }
      if (stageData.dependencies) {
        fs.writeFileSync(path.join(execDir, 'dependencies.json'), JSON.stringify(normalizeDependencyGraph(stageData.dependencies, stageData.tasks || []), null, 2), 'utf-8')
      }
      if (stageData.qualityGates) {
        fs.writeFileSync(path.join(govDir, 'quality-gates.json'), JSON.stringify(stageData.qualityGates.map(normalizeQualityGate), null, 2), 'utf-8')
      }
      compileAgentContext(projectRoot)
      project.stage = 'ready'
      project.progress = 100
      break
    }
  }

  project.completedStages = completed
  project.lastUpdated = new Date().toISOString()
  fs.writeFileSync(projFile, JSON.stringify(project, null, 2), 'utf-8')

  return {
    success: true,
    savedStage: stage,
    nextStage: project.stage,
    progress: project.progress,
    completedStages: completed
  }
}

/**
 * Escribe atómicamente el resultado de Génesis en disco (.sdd/ y AGENTS.md)
 * Poblando tanto las entidades canónicas v2 como los archivos de retrocompatibilidad.
 */
export function scaffoldGenesis(projectRoot, genesisPayload) {
  const sddDir = path.join(projectRoot, '.sdd')
  const coreDir = path.join(sddDir, 'core')
  const productDir = path.join(sddDir, 'product')
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')
  const dbDir = path.join(sddDir, 'database')
  const flowsDir = path.join(sddDir, 'flows')
  const archDir = path.join(sddDir, 'architecture')
  const apiDir = path.join(sddDir, 'api')
  const execDir = path.join(sddDir, 'execution')
  const govDir = path.join(sddDir, 'governance')
  const discDir = path.join(sddDir, 'discovery')
  const qaDir = path.join(sddDir, 'qa')
  const seqDir = path.join(sddDir, 'sequences')
  const uiDir = path.join(sddDir, 'ui-ux')

  // Crear carpetas
  const dirs = [sddDir, coreDir, productDir, reqDir, storiesDir, dbDir, flowsDir, archDir, apiDir, execDir, govDir, discDir, qaDir, seqDir, uiDir]
  dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
  })

  // 1. project.json (V2 con stage tracking)
  const proj = genesisPayload.project || genesisPayload || {}
  const projectData = {
    name: proj.name || path.basename(projectRoot),
    tagline: proj.tagline || '',
    purpose: proj.purpose || '',
    depth: proj.depth || 'mvp',
    targetLaunchWeeks: proj.targetLaunchWeeks || 4,
    version: '1.0.0',
    status: 'ready',
    stage: 'ready',
    progress: 100,
    completedStages: ['discovery', 'product', 'requirements', 'flows', 'architecture', 'database', 'api', 'ux', 'execution', 'validation', 'ready'],
    activeSprint: 'Sprint 1',
    lastUpdated: new Date().toISOString(),
    qualityGates: proj.qualityGates || []
  }
  fs.writeFileSync(path.join(sddDir, 'project.json'), JSON.stringify(projectData, null, 2), 'utf-8')

  // 1.5 product/ (vision.json, scope.json, actors.json, modules.json)
  const visionData = genesisPayload.product?.vision || {
    problem: genesisPayload.core?.problem?.statement || '',
    targetAudience: genesisPayload.core?.targetUsers?.personas?.[0]?.role || '',
    valueProposition: genesisPayload.project?.tagline || '',
    coreGoals: (genesisPayload.core?.problem?.painPoints || []).map(p => p.pain || p),
    successMetrics: genesisPayload.core?.successCriteria?.metrics || []
  }
  fs.writeFileSync(path.join(productDir, 'vision.json'), JSON.stringify(visionData, null, 2), 'utf-8')

  const scopeData = genesisPayload.product?.scope || {
    inScopeV1: genesisPayload.core?.scopeBoundaries?.inScopeV1 || ['Funcionalidad mínima viable'],
    explicitNonGoals: (genesisPayload.core?.scopeBoundaries?.explicitNonGoals || []).map(ng => typeof ng === 'string' ? ng : ng.feature || ng.title),
    futureBacklog: genesisPayload.core?.scopeBoundaries?.futureBacklog || []
  }
  fs.writeFileSync(path.join(productDir, 'scope.json'), JSON.stringify(scopeData, null, 2), 'utf-8')

  const actorsData = genesisPayload.product?.actors || genesisPayload.core?.targetUsers?.personas || [
    { id: 'actor-user', name: 'Usuario Principal', role: 'user' }
  ]
  fs.writeFileSync(path.join(productDir, 'actors.json'), JSON.stringify(actorsData, null, 2), 'utf-8')

  const modulesData = genesisPayload.product?.modules || [
    { id: 'mod-1', name: 'Módulo Principal', description: `Núcleo de operaciones de ${proj.name}` }
  ]
  fs.writeFileSync(path.join(productDir, 'modules.json'), JSON.stringify(modulesData, null, 2), 'utf-8')

  // 2. core/problem.json
  fs.writeFileSync(path.join(coreDir, 'problem.json'), JSON.stringify(genesisPayload.core?.problem || { statement: proj.purpose || '' }, null, 2), 'utf-8')

  // 3. core/scope-boundaries.json
  fs.writeFileSync(path.join(coreDir, 'scope-boundaries.json'), JSON.stringify(genesisPayload.core?.scopeBoundaries || { inScope: ['MVP V1'], outOfScope: [] }, null, 2), 'utf-8')

  // 4. core/target-user.json
  fs.writeFileSync(path.join(coreDir, 'target-user.json'), JSON.stringify(genesisPayload.core?.targetUsers || { personas: [{ role: 'Usuario' }] }, null, 2), 'utf-8')

  // 5. core/success-criteria.json
  fs.writeFileSync(path.join(coreDir, 'success-criteria.json'), JSON.stringify(genesisPayload.core?.successCriteria || { criteria: [] }, null, 2), 'utf-8')

  // 6. core/risks.json
  fs.writeFileSync(path.join(coreDir, 'risks.json'), JSON.stringify(genesisPayload.core?.risks || {}, null, 2), 'utf-8')

  // 7. requirements/stories/US-*.json (1 archivo por historia)
  const stories = genesisPayload.requirements?.userStories || []
  stories.forEach(st => {
    fs.writeFileSync(path.join(storiesDir, `${st.id}.json`), JSON.stringify(st, null, 2), 'utf-8')
  })

  // 7.5 requirements/business-rules.json
  const brData = genesisPayload.requirements?.businessRules || genesisPayload.businessRules || []
  fs.writeFileSync(path.join(reqDir, 'business-rules.json'), JSON.stringify(brData, null, 2), 'utf-8')

  // 8. requirements/epics.json
  fs.writeFileSync(path.join(reqDir, 'epics.json'), JSON.stringify(genesisPayload.requirements?.epics || [], null, 2), 'utf-8')

  // 9. requirements/user-stories.json (agrupado)
  fs.writeFileSync(path.join(reqDir, 'user-stories.json'), JSON.stringify(stories, null, 2), 'utf-8')

  // 10. flows/ (user-flows.json, business-flows.json y flujos individuales)
  const userFlows = genesisPayload.userFlows || genesisPayload.flows?.userFlows || []
  fs.writeFileSync(path.join(flowsDir, 'user-flows.json'), JSON.stringify(userFlows, null, 2), 'utf-8')

  const businessFlows = genesisPayload.businessFlows || genesisPayload.flows?.businessFlows || (Array.isArray(genesisPayload.flows) ? genesisPayload.flows : [])
  fs.writeFileSync(path.join(flowsDir, 'business-flows.json'), JSON.stringify(businessFlows, null, 2), 'utf-8')

  const flows = Array.isArray(genesisPayload.flows) ? genesisPayload.flows : businessFlows
  flows.forEach(fl => {
    if (fl && fl.id) {
      fs.writeFileSync(path.join(flowsDir, `${fl.id}.json`), JSON.stringify(fl, null, 2), 'utf-8')
    }
  })

  // 11. architecture.json & architecture/stack.json
  fs.writeFileSync(path.join(sddDir, 'architecture.json'), JSON.stringify(genesisPayload.architecture || {}, null, 2), 'utf-8')
  const stackData = normalizeTechStack(genesisPayload.architecture?.stack || genesisPayload.stack)
  fs.writeFileSync(path.join(archDir, 'stack.json'), JSON.stringify(stackData, null, 2), 'utf-8')
  fs.writeFileSync(path.join(archDir, 'architecture.json'), JSON.stringify(genesisPayload.architecture || {}, null, 2), 'utf-8')

  // 11.5 api/endpoints.json & api/contracts.json
  const endpointsData = (genesisPayload.api?.endpoints || genesisPayload.endpoints || [
    { id: 'api-01', method: 'GET', path: '/api/v1/health', summary: 'Healthcheck del servicio' }
  ]).map(normalizeEndpoint)
  fs.writeFileSync(path.join(apiDir, 'endpoints.json'), JSON.stringify(endpointsData, null, 2), 'utf-8')

  const contractsData = (genesisPayload.api?.contracts || genesisPayload.contracts || []).map(normalizeApiContract)
  fs.writeFileSync(path.join(apiDir, 'contracts.json'), JSON.stringify(contractsData, null, 2), 'utf-8')

  // 12. database/schema-erd.json & database/relationships.json
  const rawTables = Array.isArray(genesisPayload.database?.tables) ? genesisPayload.database.tables : (Array.isArray(genesisPayload.database) ? genesisPayload.database : [])
  const tablesData = rawTables.map(normalizeDatabaseTable)
  fs.writeFileSync(path.join(dbDir, 'schema-erd.json'), JSON.stringify({ tables: tablesData }, null, 2), 'utf-8')

  const rawRels = Array.isArray(genesisPayload.database?.relationships) ? genesisPayload.database.relationships : (Array.isArray(genesisPayload.relationships) ? genesisPayload.relationships : [])
  const relsData = rawRels.map(normalizeDatabaseRelationship)
  fs.writeFileSync(path.join(dbDir, 'relationships.json'), JSON.stringify(relsData, null, 2), 'utf-8')

  // 12.5 execution/ (phases.json, tasks.json, dependencies.json)
  const phasesData = (genesisPayload.execution?.phases || [
    { id: 'phase-1', name: 'Fase 1: Configuración & Modelos Base', order: 1, status: 'planned', taskIds: stories.slice(0, 1).map(s => `task-${s.id}`) },
    { id: 'phase-2', name: 'Fase 2: Lógica Central & Endpoints API', order: 2, status: 'planned', taskIds: stories.slice(1, 3).map(s => `task-${s.id}`) },
    { id: 'phase-3', name: 'Fase 3: Interfaz & Experiencia UX', order: 3, status: 'planned', taskIds: stories.slice(3).map(s => `task-${s.id}`) },
    { id: 'phase-4', name: 'Fase 4: Verificación & Cierre SDD', order: 4, status: 'planned', taskIds: [] }
  ]).map(normalizeExecutionPhase)
  fs.writeFileSync(path.join(execDir, 'phases.json'), JSON.stringify(phasesData, null, 2), 'utf-8')

  const tasksData = (genesisPayload.execution?.tasks || stories.map((st, i) => ({
    id: `task-${st.id}`,
    storyId: st.id,
    phaseId: i === 0 ? 'phase-1' : (i < 3 ? 'phase-2' : 'phase-3'),
    title: st.title,
    status: 'planned',
    scopeFiles: st.scopeFiles || ['src/**'],
    dependencies: i > 0 ? [`task-${stories[i - 1].id}`] : [],
    acceptanceCriteria: st.acceptanceCriteria || [],
    estimatedDifficulty: i === 0 ? 'low' : (i < 3 ? 'medium' : 'high')
  }))).map(normalizeExecutionTask)
  fs.writeFileSync(path.join(execDir, 'tasks.json'), JSON.stringify(tasksData, null, 2), 'utf-8')

  const depsData = normalizeDependencyGraph(genesisPayload.execution?.dependencies || {}, tasksData)
  fs.writeFileSync(path.join(execDir, 'dependencies.json'), JSON.stringify(depsData, null, 2), 'utf-8')

  // 12.8 governance/quality-gates.json
  const gatesData = (genesisPayload.governance?.qualityGates || [
    { id: 'gate-problem', name: 'Definición de Problema & Valor', stage: 'discovery', status: 'approved' },
    { id: 'gate-scope', name: 'Límites de Alcance & Non-Goals', stage: 'product', status: 'approved' },
    { id: 'gate-requirements', name: 'Historias con Criterios Gherkin', stage: 'requirements', status: 'approved' },
    { id: 'gate-architecture', name: 'Topología & Base de Datos', stage: 'architecture', status: 'approved' },
    { id: 'gate-tasks', name: 'Plan de Tareas con Scope Shield', stage: 'execution', status: 'approved' }
  ]).map(normalizeQualityGate)
  fs.writeFileSync(path.join(govDir, 'quality-gates.json'), JSON.stringify(gatesData, null, 2), 'utf-8')

  // 13. sequences/sequences.json & state-machines.json
  const seqList = Array.isArray(genesisPayload.sequences) ? genesisPayload.sequences : (genesisPayload.sequences ? [genesisPayload.sequences] : [])
  fs.writeFileSync(path.join(seqDir, 'sequences.json'), JSON.stringify(seqList, null, 2), 'utf-8')
  if (genesisPayload.stateMachines && genesisPayload.stateMachines.length > 0) {
    fs.writeFileSync(path.join(seqDir, 'state-machines.json'), JSON.stringify(genesisPayload.stateMachines, null, 2), 'utf-8')
  }

  // 14. ui-ux/ (screens.json, wireframes.json, design-system.json, components.json)
  fs.writeFileSync(path.join(uiDir, 'screens.json'), JSON.stringify(genesisPayload.uiUx?.screens || [], null, 2), 'utf-8')
  fs.writeFileSync(path.join(uiDir, 'wireframes.json'), JSON.stringify(genesisPayload.uiUx?.wireframes || [], null, 2), 'utf-8')
  fs.writeFileSync(path.join(uiDir, 'design-system.json'), JSON.stringify(genesisPayload.uiUx?.designSystem || normalizeDesignSystem(), null, 2), 'utf-8')
  fs.writeFileSync(path.join(uiDir, 'components.json'), JSON.stringify(genesisPayload.uiUx?.components || [], null, 2), 'utf-8')

  // 15. discovery/interviews.json
  fs.writeFileSync(path.join(discDir, 'interviews.json'), JSON.stringify(genesisPayload.discovery || [], null, 2), 'utf-8')

  // 16. Compilar Contexto Agéntico y generar AGENTS.md dinámicamente
  compileAgentContext(projectRoot)

  return {
    success: true,
    projectName: proj.name,
    storiesCount: stories.length,
    sddDir
  }
}

/**
 * Invocador directo a OpenRouter AI (enfocado en modelos 100% gratuitos :free)
 */
export async function callOpenRouter({ apiKey, model, messages = [], systemPrompt, maxTokens = 6000 }) {
  let key = (apiKey || process.env.OPENROUTER_API_KEY || '').trim()
  if (!key) {
    throw new Error('OPENROUTER_KEY_REQUIRED: No se detectó la clave de API de OpenRouter. Configúrala en la interfaz o en el archivo .env para utilizar la IA.')
  }

  // Si la clave es de tipo administración / provisioning, auto-generar clave de chat válida del workspace
  try {
    const authCheck = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': `Bearer ${key}` }
    })
    if (authCheck.ok) {
      const authData = await authCheck.json()
      if (authData?.data?.is_management_key || authData?.data?.is_provisioning_key) {
        const createRes = await fetch('https://openrouter.ai/api/v1/keys', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: 'sdd-studio-chat-key' })
        })
        if (createRes.ok) {
          const createData = await createRes.json()
          if (createData?.key) key = createData.key
        }
      }
    }
  } catch {}

  let selectedModel = model || 'inclusionai/ling-3.0-flash-sante:free'
  if (selectedModel.includes('llama-3.3-70b-instruct:free')) {
    selectedModel = 'inclusionai/ling-3.0-flash-sante:free'
  }

  const formattedMessages = []
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt })
  }
  for (const m of messages) {
    if (m && m.content) {
      formattedMessages.push({ role: m.role || 'user', content: m.content })
    }
  }

  let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key.trim()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3030',
      'X-Title': 'SDD Studio Spec Genesis'
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: formattedMessages,
      temperature: 0.2,
      max_tokens: maxTokens
    })
  })

  // Si el modelo específico falló, intentar automáticamente con el router libre openrouter/free
  if (!response.ok && selectedModel !== 'openrouter/free') {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3030',
        'X-Title': 'SDD Studio Spec Genesis'
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: formattedMessages,
        temperature: 0.2,
        max_tokens: maxTokens
      })
    })
  }

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenRouter Error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

  return {
    content,
    model: data.model || selectedModel,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    }
  }
}

/**
 * Retorna las instrucciones pedagógicas y el esquema JSON específico para la etapa activa.
 */
export function getStagePromptInstructions(activeStage, currentPhase) {
  switch (activeStage) {
    case 'discovery':
      return `
ETAPA ACTIVA: 1/6 — "DISCOVERY: PROBLEMA RAÍZ, DOLORES Y AUDIENCIA"
Tu objetivo de ingeniería en esta etapa:
- Comprender a fondo el dolor o necesidad que motiva el proyecto.
- NO propongas aún pantallas finales, bases de datos complejas ni tareas de desarrollo. Concéntrate en el POR QUÉ y PARA QUIÉN.
- Desglosa al menos 2 dolores reales ("painPoints") con severidad ("alta" o "media") y cómo el software los resuelve.
- Define con claridad 2 arquetipos de usuario ("targetUsers") con rol, necesidad y frecuencia.
- Propón un nombre de proyecto memorable y un tagline inspirador.
- En tu texto conversacional en Markdown:
  * Saluda como mentor e introduce el propósito de clarificar el problema antes de escribir código.
  * Presenta de forma estructurada tu entendimiento del problema y la audiencia.
  * Haz 2 preguntas reflexivas para que el usuario precise detalles o indícale que si está conforme, puede confirmar para avanzar a la Etapa 2 (Alcance V1 & Non-Goals).
FORMATO JSON ESPERADO EN ESTA ETAPA (bloque \`\`\`json):
{
  "stage": "discovery",
  "currentPhase": 1,
  "phaseTitle": "Etapa 1: Problema Raíz & Audiencia",
  "projectName": "NombreDelSoftware",
  "tagline": "Eslogan conciso y profesional",
  "problem": {
    "statement": "Definición clara y fundamentada del problema raíz",
    "painPoints": [
      { "id": "p-1", "pain": "Dolor específico", "severity": "alta", "evidence": "Impacto real", "solution": "Cómo lo resuelve el software" }
    ]
  },
  "targetUsers": [
    { "id": "usr-1", "role": "Rol de usuario", "need": "Necesidad concreta", "frequency": "Diaria|Recurrente" }
  ],
  "suggestedActions": [
    "Confirmar y avanzar a Etapa 2: Alcance & Non-Goals",
    "Ajustar dolor principal",
    "Agregar otro tipo de usuario"
  ]
}`

    case 'product':
      return `
ETAPA ACTIVA: 2/6 — "PRODUCT: MÓDULOS MACRO, ALCANCE V1 Y NON-GOALS (SCOPE SHIELD)"
Tu objetivo de ingeniería en esta etapa:
- Delimitar rigurosamente los límites de la V1 para blindar el proyecto contra el sobre-alcance ("scope creep").
- Agrupar la solución en 3 a 5 módulos macro ("modules") con nombres claros y qué resuelve cada uno.
- Definir qué funcionalidades están estrictamente DENTRO de la V1 ("inScopeV1").
- Definir al menos 3 funcionalidades que quedan estrictamente FUERA o CONGELADAS para la V2 ("nonGoals") con su justificación estratégica de ingeniería ("rationale").
- En tu texto conversacional en Markdown:
  * Explica pedagógicamente por qué definir lo que NO se va a construir es la mejor práctica de arquitectura para entregar rápido y con calidad.
  * Presenta los módulos propuestos, lo que entra en V1 y lo congelado para V2.
  * Pregunta al usuario si está de acuerdo con estos límites o si desea mover alguna función entre V1 y V2.
FORMATO JSON ESPERADO EN ESTA ETAPA (bloque \`\`\`json):
{
  "stage": "product",
  "currentPhase": 2,
  "phaseTitle": "Etapa 2: Alcance V1 & Non-Goals",
  "modules": [
    { "id": "mod-1", "name": "Nombre Módulo", "description": "Qué resuelve este módulo" }
  ],
  "inScopeV1": ["Funcionalidad imprescindible para V1"],
  "nonGoals": [
    { "feature": "Funcionalidad congelada para V2", "rationale": "Justificación estratégica de ingeniería" }
  ],
  "suggestedActions": [
    "Aprobar alcance y avanzar a Etapa 3: Historias & Gherkin",
    "Mover funcionalidad a Non-Goals V2",
    "Agregar módulo adicional"
  ]
}`

    case 'requirements':
      return `
ETAPA ACTIVA: 3/6 — "REQUIREMENTS: HISTORIAS DE USUARIO JIRA Y CRITERIOS GHERKIN"
Tu objetivo de ingeniería en esta etapa:
- Desglosar los módulos y el alcance en Historias de Usuario formales en formato Jira: "Como [rol], quiero [acción], para [beneficio]".
- Asignar prioridad (P0, P1), puntos estimados (1, 2, 3, 5) y archivos tentativos en scopeFiles.
- OBLIGATORIO: Cada historia DEBE incluir al menos 1 o 2 Criterios de Aceptación formales con sintaxis Gherkin Dado-Cuando-Entonces ("scenario", "given", "when", "then").
- Definir al menos 2 Reglas de Negocio transversales ("businessRules": BR-001, BR-002...) que apliquen validaciones lógicas.
- En tu texto conversacional en Markdown:
  * Explica cómo los criterios Gherkin permiten a los agentes autónomos de IA probar y verificar su propio código sin ambigüedades.
  * Presenta las historias y reglas de negocio estructuradas.
  * Pregunta si falta algún caso de uso crítico o validación particular.
FORMATO JSON ESPERADO EN ESTA ETAPA (bloque \`\`\`json):
{
  "stage": "requirements",
  "currentPhase": 3,
  "phaseTitle": "Etapa 3: Historias & Criterios Gherkin",
  "businessRules": [
    { "id": "BR-001", "code": "BR-001", "rule": "Regla obligatoria de negocio", "category": "Business Logic" }
  ],
  "stories": [
    {
      "id": "US-001",
      "title": "Título conciso",
      "role": "rol del usuario",
      "action": "acción que realiza",
      "benefit": "valor que obtiene",
      "priority": "P0",
      "scopeFiles": ["src/**"],
      "acceptanceCriteria": [
        { "id": "c-1", "scenario": "Escenario de verificación", "given": "Dado...", "when": "Cuando...", "then": "Entonces...", "done": false }
      ]
    }
  ],
  "suggestedActions": [
    "Aprobar historias y avanzar a Etapa 4: Pantallas & UI",
    "Agregar caso de error a una historia",
    "Definir otra regla de negocio"
  ]
}`

    case 'ux':
      return `
ETAPA ACTIVA: 4/6 — "UI/UX: CATÁLOGO DE PANTALLAS, RUTAS Y WIREFRAMES DECLARATIVOS"
Tu objetivo de ingeniería en esta etapa:
- Diseñar la experiencia visual del usuario mapeando el catálogo de pantallas ("screens") con rutas ("/ruta") y propósitos claros.
- Incluir para cada pantalla un checklist de componentes visuales clave.
- Crear wireframes declarativos ("wireframes") con bloques estructurados (navbar, sidebar, stats-grid, table, form, modal).
- Definir tokens del sistema de diseño ("designSystem": paleta de colores, tipografía, radios).
- En tu texto conversacional en Markdown:
  * Describe el recorrido visual y la jerarquía de navegación que experimentará el usuario.
  * Presenta las pantallas y wireframes propuestos.
  * Pregunta si el layout responde a la expectativa visual o si se requiere ajustar alguna pantalla.
FORMATO JSON ESPERADO EN ESTA ETAPA (bloque \`\`\`json):
{
  "stage": "ux",
  "currentPhase": 4,
  "phaseTitle": "Etapa 4: Pantallas & Experiencia UI/UX",
  "screens": [
    {
      "id": "SCR-01",
      "name": "Nombre de Pantalla",
      "route": "/ruta",
      "description": "Descripción visual y componentes clave",
      "layout": "standard-app",
      "checklist": [
        { "id": "chk-1", "text": "Elemento verificable en la UI", "done": false }
      ]
    }
  ],
  "wireframes": [
    {
      "id": "WF-01",
      "screenId": "SCR-01",
      "title": "Wireframe de Pantalla",
      "layout": "dashboard",
      "blocks": [
        { "id": "blk-nav", "type": "navbar", "title": "Barra Superior", "properties": {} }
      ]
    }
  ],
  "designSystem": {
    "palette": { "primary": "#7C3AED", "background": "#F8FAFC" }
  },
  "suggestedActions": [
    "Aprobar pantallas y avanzar a Etapa 5: Arquitectura & Base de Datos",
    "Modificar flujo de pantallas",
    "Añadir pantalla administrativa"
  ]
}`

    case 'architecture':
      return `
ETAPA ACTIVA: 5/6 — "ARCHITECTURE: TOPOLOGÍA C4, STACK, BASE DE DATOS ERD Y SECUENCIAS UML"
Tu objetivo de ingeniería en esta etapa:
- Definir el stack tecnológico recomendado ("stack": Frontend, Backend, Base de Datos, Auth).
- Diseñar la topología técnica de servicios C4 ("services").
- Modelar las tablas de base de datos relacional ERD ("database": tablas con columnas tipadas, PKs, FKs y relaciones).
- Especificar endpoints de API REST ("endpoints") y modelos DTO ("contracts").
- Generar el diagrama de secuencia UML en Mermaid.js ("sequenceUml") con actores, frontend, backend y base de datos.
- En tu texto conversacional en Markdown:
  * Explica las decisiones técnicas tomadas, justificando la elección de base de datos y arquitectura desacoplada.
  * Presenta el diagrama de secuencia y las entidades principales.
  * Invita al usuario a validar la propuesta técnica para proceder al plan final de ejecución.
FORMATO JSON ESPERADO EN ESTA ETAPA (bloque \`\`\`json):
{
  "stage": "architecture",
  "currentPhase": 5,
  "phaseTitle": "Etapa 5: Arquitectura C4 & Base de Datos",
  "stack": {
    "frontend": { "framework": "Modern Web / Vite", "styling": "Vanilla CSS / Tailwind" },
    "backend": { "framework": "Node.js REST API", "runtime": "Node >= 18" },
    "database": { "engine": "PostgreSQL 16 / SQLite" }
  },
  "services": [
    { "id": "svc-1", "label": "Nombre del Servicio", "tech": "Stack", "type": "Frontend|Backend|Database" }
  ],
  "database": [
    { "table": "nombre_tabla", "description": "Qué persiste", "columns": ["id (UUID)", "name (VARCHAR)", "..."] }
  ],
  "endpoints": [
    { "id": "api-01", "method": "GET", "path": "/api/...", "summary": "Descripción" }
  ],
  "sequenceUml": "sequenceDiagram\\n    autonumber\\n    ...",
  "suggestedActions": [
    "Aprobar arquitectura y avanzar a Etapa 6: Plan de Ejecución",
    "Ajustar tablas de base de datos",
    "Cambiar tecnologías del stack"
  ]
}`

    case 'execution':
    case 'ready':
    default:
      return `
ETAPA ACTIVA: 6/6 — "EXECUTION: PLAN DE TAREAS CON SCOPE SHIELD, QUALITY GATES Y CIERRE"
Tu objetivo de ingeniería en esta etapa:
- Consolidar las fases de desarrollo ordenadas por precedencia ("phases").
- Desglosar las tareas atómicas ("tasks") blindadas con "scopeFiles" (Scope Shield) para que los agentes de IA no desborden su alcance.
- Establecer las compuertas de calidad ("qualityGates") que garantizarán la convergencia del 100%.
- En tu texto conversacional en Markdown:
  * Presenta el RESUMEN EJECUTIVO de toda la planificación con las 12 perspectivas de SDD listas.
  * Felicita al usuario por haber completado una especificación rigurosa antes de codificar.
  * Declara que la especificación está 100% LISTA PARA COMPILAR Y ABRIR LA CABINA DE CONTROL.
FORMATO JSON ESPERADO EN ESTA ETAPA (bloque \`\`\`json):
{
  "stage": "ready",
  "currentPhase": 6,
  "phaseTitle": "Etapa 6: Plan de Ejecución & Traspaso Agéntico",
  "phases": [
    { "id": "phase-1", "name": "Fase 1: Configuración & Base", "order": 1, "status": "planned" },
    { "id": "phase-2", "name": "Fase 2: Lógica Central & API", "order": 2, "status": "planned" },
    { "id": "phase-3", "name": "Fase 3: Interfaz & UX", "order": 3, "status": "planned" },
    { "id": "phase-4", "name": "Fase 4: Verificación & Cierre SDD", "order": 4, "status": "planned" }
  ],
  "tasks": [
    { "id": "task-1", "title": "Configurar estructura y modelo base", "scopeFiles": ["src/**"], "status": "planned" }
  ],
  "qualityGates": [
    { "id": "gate-1", "name": "Verificación Criterios Gherkin", "status": "approved" }
  ],
  "readyToScaffold": true,
  "suggestedActions": [
    "🚀 Aprobar y Abrir Cabina de Control"
  ]
}`
  }
}

/**
 * Procesa un turno de chat conversacional en Modo Génesis 100% basado en IA real (OpenRouter) sobre contexto real.
 */
export async function processGenesisChat(messages = [], currentPreview = null, options = {}) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  if (!lastUserMsg.trim()) {
    throw new Error('Mensaje de usuario vacío.')
  }

  const apiKey = (options.apiKey || process.env.OPENROUTER_API_KEY || '').trim()
  if (!apiKey) {
    throw new Error('OPENROUTER_KEY_REQUIRED: Para estructurar tu proyecto con IA debes conectar tu API Key de OpenRouter en la barra superior. Es 100% gratuita utilizando los modelos libres (:free).')
  }

  const targetModel = options.model || 'inclusionai/ling-3.0-flash-sante:free'

  const stageMap = {
    'discovery': 1,
    'product': 2,
    'requirements': 3,
    'ux': 4,
    'architecture': 5,
    'execution': 6,
    'ready': 6
  }

  let activeStage = options.stage || currentPreview?.stage || 'discovery'
  let currentPhase = Number(options.phase || currentPreview?.currentPhase || stageMap[activeStage] || 1)

  // Detección contextual si el usuario solicita explícitamente avanzar de etapa en el texto
  const lowerMsg = lastUserMsg.toLowerCase()
  if (lowerMsg.includes('etapa 2') || lowerMsg.includes('alcance') || lowerMsg.includes('non-goals') || lowerMsg.includes('fase 2')) {
    activeStage = 'product'
    currentPhase = 2
  } else if (lowerMsg.includes('etapa 3') || lowerMsg.includes('historias') || lowerMsg.includes('gherkin') || lowerMsg.includes('fase 3')) {
    activeStage = 'requirements'
    currentPhase = 3
  } else if (lowerMsg.includes('etapa 4') || lowerMsg.includes('pantallas') || lowerMsg.includes('wireframe') || lowerMsg.includes('ui/ux') || lowerMsg.includes('fase 4')) {
    activeStage = 'ux'
    currentPhase = 4
  } else if (lowerMsg.includes('etapa 5') || lowerMsg.includes('arquitectura') || lowerMsg.includes('base de datos') || lowerMsg.includes('c4') || lowerMsg.includes('fase 5')) {
    activeStage = 'architecture'
    currentPhase = 5
  } else if (lowerMsg.includes('etapa 6') || lowerMsg.includes('plan de ejec') || lowerMsg.includes('scope shield') || lowerMsg.includes('fase 6')) {
    activeStage = 'execution'
    currentPhase = 6
  }

  const impact = analyzeImpact(lastUserMsg, currentPreview)

  // Contexto previo acumulado
  let previousContextStr = ''
  if (currentPreview && typeof currentPreview === 'object') {
    const pName = currentPreview.project?.name || currentPreview.meta?.name || ''
    const pTagline = currentPreview.project?.tagline || ''
    const pProblem = currentPreview.core?.problem?.statement || ''
    const pPainPoints = currentPreview.core?.problem?.painPoints?.map(p => p.pain || p).join('; ') || ''
    const pUsers = currentPreview.product?.actors?.map(u => `${u.role}: ${u.need}`).join(' | ') || ''
    const pModules = currentPreview.product?.modules?.map(m => m.name).join(', ') || ''
    const pNonGoals = currentPreview.core?.scopeBoundaries?.explicitNonGoals?.map(ng => ng.feature || ng).join(', ') || ''
    const pInScope = currentPreview.product?.scope?.inScopeV1?.join(', ') || ''
    const pStories = currentPreview.requirements?.userStories?.map(st => `${st.id}: ${st.title}`).join(' | ') || ''
    const pRules = currentPreview.businessRules?.map(r => `${r.code}: ${r.rule}`).join(' | ') || ''
    const pScreens = currentPreview.uiUx?.screens?.map(sc => `${sc.name} (${sc.route})`).join(', ') || ''

    const lines = []
    if (pName) lines.push(`- Proyecto: ${pName} (${pTagline})`)
    if (pProblem) lines.push(`- Problema Raíz: ${pProblem}`)
    if (pPainPoints) lines.push(`- Dolores Identificados: ${pPainPoints}`)
    if (pUsers) lines.push(`- Actores/Usuarios: ${pUsers}`)
    if (pModules) lines.push(`- Módulos Macro: ${pModules}`)
    if (pInScope) lines.push(`- In-Scope V1: ${pInScope}`)
    if (pNonGoals) lines.push(`- Non-Goals (Congelados para V2): ${pNonGoals}`)
    if (pStories) lines.push(`- Historias de Usuario: ${pStories}`)
    if (pRules) lines.push(`- Reglas de Negocio: ${pRules}`)
    if (pScreens) lines.push(`- Pantallas Mapeadas: ${pScreens}`)

    if (lines.length > 0) {
      previousContextStr = `\nESPECIFICACIÓN ACUMULADA HASTA EL MOMENTO:\n${lines.join('\n')}\nUtiliza este contexto para profundizar y enriquecer la especificación sin repetir ni contradecir lo ya acordado.`
    }
  }

  let impactContextStr = ''
  if (impact.hasImpact) {
    impactContextStr = `\n⚠️ DETECCIÓN DE CAMBIO E IMPACTO SOLICITADO POR EL USUARIO:
- Cambio detectado: ${impact.detectedChange}
- Dominios afectados: ${impact.affectedDomains.join(', ')}
- Ajustes recomendados: ${impact.suggestedAdjustments.join(' | ')}
Explica brevemente este impacto con claridad y aplica los cambios en el JSON generado.`
  }

  const stageInstructions = getStagePromptInstructions(activeStage, currentPhase)

  const systemPrompt = `Eres el Mentor Principal de Ingeniería de Software y Arquitecto SDD (Spec-Driven Development).
Tu misión es educar, acompañar y transformar las ideas del usuario en una especificación de software rigurosa, completa y profesional antes de escribir una sola línea de código.

Este entorno está pensado tanto para expertos como para PERSONAS NO TÉCNICAS. Tu lenguaje conversacional debe ser claro, inspirador, didáctico y libre de jerga inútil, explicando el "por qué" de cada práctica de ingeniería.

IMPORTANTE SOBRE LA METODOLOGÍA PROGRESIVA DE PLANIFICACIÓN:
- La planificación se realiza en 6 ETAPAS CONSECUTIVAS:
  1. Discovery: Problema Raíz y Audiencia
  2. Product: Límites de Alcance V1 y Non-Goals (Scope Shield)
  3. Requirements: Historias Jira con Criterios Gherkin y Reglas de Negocio
  4. UI/UX: Catálogo de Pantallas, Rutas y Wireframes Declarativos
  5. Architecture: Topología C4, Stack Tecnológico, Base de Datos ERD y Secuencias UML
  6. Execution: Plan de Ejecución con Scope Shield, Compuertas de Calidad y Cierre
- NUNCA intentes resolver todas las etapas de una sola vez. Concéntrate EXCLUSIVAMENTE en la etapa activa indicada a continuación.
- Explica didácticamente las propuestas para la etapa activa y haz preguntas orientadoras de ingeniería para afinar detalles antes de pasar a la siguiente etapa.

${stageInstructions}
${previousContextStr}${impactContextStr}

FORMATO ESTRICTO DE RESPUESTA:
Tu respuesta DEBE constar de dos partes:
1. Explicación didáctica y empática en Markdown en español:
   - Explica el concepto de ingeniería de la etapa actual con un tono cercano de mentor.
   - Presenta las propuestas concretas para el proyecto del usuario en esta etapa.
   - Si hubo un cambio o impacto, aclara qué se ajustó.
   - Cierra con una pregunta orientadora o invitación clara a confirmar para avanzar a la siguiente etapa.
2. Al final, un bloque JSON delimitado estrictamente por \`\`\`json y \`\`\` que contenga los campos de la etapa activa especificados arriba.`

  const openRouterResult = await callOpenRouter({
    apiKey,
    model: targetModel,
    messages,
    systemPrompt,
    maxTokens: 8000
  })

  // Parsear el JSON emitido por el modelo de IA con fallback inteligente
  let aiParsed = extractJsonFromAi(openRouterResult.content) || {}
  aiParsed.stage = aiParsed.stage || activeStage
  aiParsed.currentPhase = aiParsed.currentPhase || currentPhase

  // Construir especificación acumulativa basada en la IA + contexto previo
  const preview = buildSpecFromAi(aiParsed, lastUserMsg, currentPreview)

  // Determinar si realmente se alcanzó el cierre final (Etapa 6 o ready)
  const isFinalStage = Boolean(aiParsed.readyToScaffold || preview.currentPhase >= 6 || preview.stage === 'ready' || activeStage === 'execution')

  // Limpiar el bloque JSON de la respuesta conversacional en Markdown
  const cleanReply = openRouterResult.content.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '').trim()

  return {
    reply: cleanReply || openRouterResult.content,
    preview,
    stage: preview.stage || activeStage,
    currentPhase: preview.currentPhase || currentPhase,
    impact: impact.hasImpact ? impact : null,
    tokens: {
      promptTokens: openRouterResult.usage.promptTokens,
      completionTokens: openRouterResult.usage.completionTokens,
      totalTokens: openRouterResult.usage.totalTokens,
      engine: `OpenRouter AI (${openRouterResult.model})`
    },
    readyToAdvance: !isFinalStage,
    readyToScaffold: isFinalStage
  }
}
