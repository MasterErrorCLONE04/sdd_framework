import fs from 'fs'
import path from 'path'
import { extractJsonFromAi } from './flows-ai.js'
import { normalizeProjectModel, calculateProjectProgress, normalizeBusinessRule, normalizeUserFlow, normalizeBusinessFlow, normalizeTechStack, normalizeEndpoint, normalizeApiContract, normalizeDatabaseTable, normalizeDatabaseRelationship, STAGES } from './model-schema.js'

/**
 * Construcción de especificación de las 12 perspectivas
 * a partir de la respuesta generada por la IA de OpenRouter con datos reales.
 */
export function buildSpecFromAi(aiData, rawText = '') {
  const projName = aiData.projectName || 'NuevoProyecto'
  const purpose = aiData.purpose || 'comercial'
  const depth = aiData.depth || 'serio'

  // 1. Non-Goals definidos por la IA
  const nonGoals = Array.isArray(aiData.nonGoals) && aiData.nonGoals.length > 0
    ? aiData.nonGoals.map((ng, i) => ({
        id: `ng-${i + 1}`,
        feature: ng.feature,
        rationale: ng.rationale
      }))
    : []

  // 2. Servicios de Arquitectura definidos por la IA
  const services = Array.isArray(aiData.services) && aiData.services.length > 0
    ? aiData.services.map((s, i) => ({
        id: `svc-${i + 1}`,
        label: s.label || s.name || `Servicio ${i + 1}`,
        tech: s.tech || 'Node.js / TypeScript',
        type: s.type || 'Service',
        status: 'online',
        healthPercent: 100
      }))
    : [
        { id: 'svc-1', label: 'Web Application & API', tech: 'Next.js 15 / TypeScript', type: 'Frontend / API', status: 'online', healthPercent: 100 },
        { id: 'svc-2', label: 'Base de Datos Principal', tech: 'PostgreSQL 16', type: 'Database', status: 'online', healthPercent: 100 }
      ]

  // 3. Historias de Usuario Jira con Gherkin definidas por la IA
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
      ]

  // 4. Personas / Usuarios Objetivo definidos por la IA
  const personas = Array.isArray(aiData.targetUsers) && aiData.targetUsers.length > 0
    ? aiData.targetUsers.map((u, i) => ({
        id: u.id || `usr-${i + 1}`,
        role: u.role || 'Usuario',
        need: u.need || 'Operar el sistema con alta eficiencia',
        frequency: u.frequency || 'Diaria'
      }))
    : [
        { id: 'usr-1', role: 'Usuario Final / Cliente', need: 'Acceder rápidamente al servicio', frequency: 'Recurrente' },
        { id: 'usr-2', role: 'Administrador', need: 'Gestionar la operación y configuraciones', frequency: 'Diaria' }
      ]

  // 5. Modelo ERD / Base de Datos definido por la IA
  const tables = (Array.isArray(aiData.database?.tables) && aiData.database.tables.length > 0
    ? aiData.database.tables
    : (Array.isArray(aiData.database) && aiData.database.length > 0 ? aiData.database : [
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
      ])).map(normalizeDatabaseTable)

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
        statement: aiData.problem?.statement || (typeof aiData.problem === 'string' ? aiData.problem : `Resolver la automatización de ${projName}.`),
        painPoints: Array.isArray(aiData.problem?.painPoints) ? aiData.problem.painPoints : [
          { id: 'p-1', pain: 'Fricción en procesos no automatizados', severity: 'alta', evidence: 'Pérdida de conversión', solution: 'Flujo digitalizado directo' }
        ]
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
        ? aiData.screens.map((sc, i) => ({
            id: sc.id || `SCR-${String(i + 1).padStart(2, '0')}`,
            name: sc.name || `Pantalla ${i + 1}`,
            route: sc.route || (i === 0 ? '/' : `/${(sc.name || `pantalla-${i + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
            description: sc.description || 'Vista estructurada de la interfaz de usuario',
            layout: sc.layout || 'standard-app',
            status: 'planned',
            healthPercent: 100,
            checklist: Array.isArray(sc.checklist) ? sc.checklist : [
              { id: `chk-${i}-1`, text: `Renderizar layout principal de ${sc.name || 'la pantalla'}`, done: false },
              { id: `chk-${i}-2`, text: 'Validar estados reactivos y manejo de errores', done: false }
            ]
          }))
        : [
            {
              id: 'SCR-01',
              name: 'Dashboard Principal',
              route: '/',
              description: `Vista principal y centro de mando interactivo para ${projName}.`,
              layout: 'standard-app',
              status: 'planned',
              healthPercent: 100,
              checklist: [
                { id: 'chk-1-1', text: 'Renderizar vista principal con componentes clave', done: false },
                { id: 'chk-1-2', text: 'Probar navegación y acciones del usuario', done: false }
              ]
            }
          ]
    },
    discovery: {
      interviewSessions: buildDiscoveryInterviews(projName, purpose, depth, services)
    },
    product: {
      vision: {
        problem: aiData.problem?.statement || (typeof aiData.problem === 'string' ? aiData.problem : `Resolver la automatización de ${projName}.`),
        targetAudience: personas[0]?.role || 'Usuarios principales del sistema',
        valueProposition: aiData.tagline || `Plataforma ${projName} gobernada bajo protocolo SDD`,
        coreGoals: Array.isArray(aiData.problem?.painPoints) ? aiData.problem.painPoints.map(p => p.pain || p) : [],
        successMetrics: Array.isArray(aiData.successCriteria?.metrics) ? aiData.successCriteria.metrics : []
      },
      scope: {
        inScopeV1: Array.isArray(aiData.inScopeV1) ? aiData.inScopeV1 : ['Funcionalidad mínima viable para V1'],
        explicitNonGoals: nonGoals.map(ng => ng.feature || ng),
        futureBacklog: Array.isArray(aiData.futureBacklog) ? aiData.futureBacklog : []
      },
      actors: personas,
      modules: Array.isArray(aiData.modules) ? aiData.modules : [
        { id: 'mod-1', name: 'Gestión Principal', description: `Núcleo de operaciones de ${projName}` }
      ]
    },
    businessRules: Array.isArray(aiData.businessRules) ? aiData.businessRules.map((br, i) => ({
      id: br.id || `BR-${String(i + 1).padStart(3, '0')}`,
      code: br.code || `BR-${String(i + 1).padStart(3, '0')}`,
      rule: br.rule || br.title || br.description,
      category: br.category || 'Business Logic',
      enforcedAt: br.enforcedAt || ['api', 'ui']
    })) : [],
    stack: normalizeTechStack(aiData.stack || {
      frontend: { framework: 'Modern Web / Vanilla / Vite', language: 'JavaScript / TypeScript', styling: 'Vanilla CSS / Tailwind' },
      backend: { framework: 'Node.js REST API', runtime: 'Node >= 18', architecturePattern: 'Layered Services' },
      database: { engine: 'PostgreSQL 16 / SQLite', orm: 'Prisma / SQL' },
      auth: { strategy: 'JWT / Session Bearer', rbac: true },
      deployment: { target: 'Local / Docker', ciCd: 'GitHub Actions' }
    }),
    api: {
      endpoints: (Array.isArray(aiData.endpoints) && aiData.endpoints.length > 0 ? aiData.endpoints : [
        { id: 'api-01', method: 'GET', path: '/api/v1/health', summary: 'Healthcheck del servicio', actor: 'public', statusCodes: [200] },
        { id: 'api-02', method: 'GET', path: '/api/v1/items', summary: `Listar elementos de ${projName}`, actor: 'user', requestDto: null, responseDto: 'ItemsListDTO', relatedStoryIds: stories.slice(0, 1).map(s => s.id) },
        { id: 'api-03', method: 'POST', path: '/api/v1/items', summary: `Crear elemento en ${projName}`, actor: 'user', requestDto: 'CreateItemDTO', responseDto: 'ItemDetailDTO', relatedRuleIds: ['BR-001'], relatedStoryIds: stories.slice(0, 1).map(s => s.id) }
      ]).map(normalizeEndpoint),
      contracts: (Array.isArray(aiData.apiContracts || aiData.contracts) && (aiData.apiContracts || aiData.contracts).length > 0 ? (aiData.apiContracts || aiData.contracts) : [
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
      ]).map(normalizeApiContract)
    },
    execution: {
      phases: [
        { id: 'phase-1', name: 'Fase 1: Configuración & Base de Datos', order: 1, status: 'planned', taskIds: [] },
        { id: 'phase-2', name: 'Fase 2: Lógica de Negocio & API', order: 2, status: 'planned', taskIds: [] },
        { id: 'phase-3', name: 'Fase 3: Interfaz Web & Integración', order: 3, status: 'planned', taskIds: [] }
      ],
      tasks: stories.map((st) => ({
        id: `task-${st.id}`,
        storyId: st.id,
        title: st.title,
        status: 'planned',
        scopeFiles: st.scopeFiles || ['src/**'],
        acceptanceCriteria: st.acceptanceCriteria || []
      }))
    },
    stage: aiData.stage || (aiData.currentPhase === 1 ? 'discovery' : (aiData.currentPhase === 2 ? 'product' : 'requirements'))
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
        fs.writeFileSync(path.join(uiDir, 'screens.json'), JSON.stringify(stageData.screens, null, 2), 'utf-8')
      }
      if (stageData.wireframes) {
        fs.writeFileSync(path.join(uiDir, 'wireframes.json'), JSON.stringify(stageData.wireframes, null, 2), 'utf-8')
      }
      project.stage = 'execution'
      project.progress = Math.max(project.progress || 0, 90)
      break
    }

    case 'execution': {
      if (stageData.tasks) {
        fs.writeFileSync(path.join(execDir, 'tasks.json'), JSON.stringify(stageData.tasks, null, 2), 'utf-8')
      }
      if (stageData.phases) {
        fs.writeFileSync(path.join(execDir, 'phases.json'), JSON.stringify(stageData.phases, null, 2), 'utf-8')
      }
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
  const projectData = {
    name: genesisPayload.project.name,
    tagline: genesisPayload.project.tagline,
    purpose: genesisPayload.project.purpose,
    depth: genesisPayload.project.depth,
    targetLaunchWeeks: genesisPayload.project.targetLaunchWeeks,
    version: '1.0.0',
    status: 'ready',
    stage: 'ready',
    progress: 100,
    completedStages: ['discovery', 'product', 'requirements', 'flows', 'architecture', 'database', 'api', 'ux', 'execution', 'validation', 'ready'],
    activeSprint: 'Sprint 1',
    lastUpdated: new Date().toISOString(),
    qualityGates: genesisPayload.project.qualityGates
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
    { id: 'mod-1', name: 'Módulo Principal', description: `Núcleo de operaciones de ${genesisPayload.project.name}` }
  ]
  fs.writeFileSync(path.join(productDir, 'modules.json'), JSON.stringify(modulesData, null, 2), 'utf-8')

  // 2. core/problem.json
  fs.writeFileSync(path.join(coreDir, 'problem.json'), JSON.stringify(genesisPayload.core.problem, null, 2), 'utf-8')

  // 3. core/scope-boundaries.json
  fs.writeFileSync(path.join(coreDir, 'scope-boundaries.json'), JSON.stringify(genesisPayload.core.scopeBoundaries, null, 2), 'utf-8')

  // 4. core/target-user.json
  fs.writeFileSync(path.join(coreDir, 'target-user.json'), JSON.stringify(genesisPayload.core.targetUsers, null, 2), 'utf-8')

  // 5. core/success-criteria.json
  fs.writeFileSync(path.join(coreDir, 'success-criteria.json'), JSON.stringify(genesisPayload.core.successCriteria, null, 2), 'utf-8')

  // 6. core/risks.json
  fs.writeFileSync(path.join(coreDir, 'risks.json'), JSON.stringify(genesisPayload.core.risks || {}, null, 2), 'utf-8')

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
  fs.writeFileSync(path.join(sddDir, 'architecture.json'), JSON.stringify(genesisPayload.architecture, null, 2), 'utf-8')
  const stackData = normalizeTechStack(genesisPayload.architecture?.stack || genesisPayload.stack)
  fs.writeFileSync(path.join(archDir, 'stack.json'), JSON.stringify(stackData, null, 2), 'utf-8')
  fs.writeFileSync(path.join(archDir, 'architecture.json'), JSON.stringify(genesisPayload.architecture, null, 2), 'utf-8')

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

  // 12.5 execution/ (phases.json, tasks.json)
  const phasesData = genesisPayload.execution?.phases || [
    { id: 'phase-1', name: 'Fase 1: Configuración & Base de Datos', order: 1, status: 'planned' },
    { id: 'phase-2', name: 'Fase 2: Lógica de Negocio & API', order: 2, status: 'planned' },
    { id: 'phase-3', name: 'Fase 3: Interfaz Web & Integración', order: 3, status: 'planned' }
  ]
  fs.writeFileSync(path.join(execDir, 'phases.json'), JSON.stringify(phasesData, null, 2), 'utf-8')

  const tasksData = genesisPayload.execution?.tasks || stories.map(st => ({
    id: `task-${st.id}`,
    storyId: st.id,
    title: st.title,
    status: 'planned',
    scopeFiles: st.scopeFiles || ['src/**'],
    acceptanceCriteria: st.acceptanceCriteria || []
  }))
  fs.writeFileSync(path.join(execDir, 'tasks.json'), JSON.stringify(tasksData, null, 2), 'utf-8')

  // 12.8 governance/quality-gates.json
  const gatesData = [
    { id: 'gate-problem', name: 'Definición de Problema & Valor', stage: 'discovery', status: 'approved' },
    { id: 'gate-scope', name: 'Límites de Alcance & Non-Goals', stage: 'product', status: 'approved' },
    { id: 'gate-requirements', name: 'Historias con Criterios Gherkin', stage: 'requirements', status: 'approved' },
    { id: 'gate-architecture', name: 'Topología & Base de Datos', stage: 'architecture', status: 'approved' },
    { id: 'gate-tasks', name: 'Plan de Tareas con Scope Shield', stage: 'execution', status: 'approved' }
  ]
  fs.writeFileSync(path.join(govDir, 'quality-gates.json'), JSON.stringify(gatesData, null, 2), 'utf-8')

  // 13. sequences/sequences.json & state-machines.json
  const seqList = Array.isArray(genesisPayload.sequences) ? genesisPayload.sequences : (genesisPayload.sequences ? [genesisPayload.sequences] : [])
  fs.writeFileSync(path.join(seqDir, 'sequences.json'), JSON.stringify(seqList, null, 2), 'utf-8')
  if (genesisPayload.stateMachines && genesisPayload.stateMachines.length > 0) {
    fs.writeFileSync(path.join(seqDir, 'state-machines.json'), JSON.stringify(genesisPayload.stateMachines, null, 2), 'utf-8')
  }

  // 14. ui-ux/screens.json
  fs.writeFileSync(path.join(uiDir, 'screens.json'), JSON.stringify(genesisPayload.uiUx?.screens || [], null, 2), 'utf-8')

  // 15. discovery/interviews.json
  fs.writeFileSync(path.join(discDir, 'interviews.json'), JSON.stringify(genesisPayload.discovery, null, 2), 'utf-8')

  // 16. AGENTS.md
  const nonGoalsText = genesisPayload.core.scopeBoundaries.explicitNonGoals.map(ng => `- 🚫 **${ng.feature}:** ${ng.rationale}`).join('\n')
  const agentsMdContent = `# Protocolo SDD (Spec-Driven Development) — "Single Source of Truth"

Proyecto: **${genesisPayload.project.name}**
Propósito: \`${genesisPayload.project.purpose}\` | Profundidad: \`${genesisPayload.project.depth}\`

Cualquier agente de IA (Antigravity, Cursor, Windsurf, Claude Code, Copilot) que trabaje en este repositorio DEBE acatar estrictamente las siguientes reglas:

0. **Compuertas de Calidad & Non-Goals:**
   - Consulta \`.sdd/project.json\` antes de escribir código.
   - Lee \`.sdd/core/scope-boundaries.json\`: NUNCA programes features congeladas para V2:
${nonGoalsText}

1. **Lectura Previa Obligatoria:**
   - Consulta la Historia activa en \`.sdd/requirements/stories/<US-ID>.json\`.
   - Identifica el objetivo técnico y la lista blanca de archivos \`scopeFiles\`.

2. **Aislamiento de Alcance (Scope Protection):**
   - Modifica ÚNICAMENTE los archivos declarados en \`scopeFiles\` de la historia activa. Está prohibido alterar código fuera de alcance sin orden humana previa.

3. **Criterios de Aceptación Gherkin (Dado-Cuando-Entonces):**
   - Verifica cada criterio de aceptación contra el código y tests reales.
   - Marca \`"done": true\` en el archivo \`.sdd/requirements/stories/<US-ID>.json\` conforme los cumplas.

4. **Actualización Atómica del Estado:**
   - Trabaja sobre el archivo individual de la entidad para evitar conflictos de merge.
   - Cuando todos los criterios estén verificados, actualiza \`"status": "done"\` y firma en \`"assignedTo": "NombreAgente"\`.
`
  fs.writeFileSync(path.join(projectRoot, 'AGENTS.md'), agentsMdContent, 'utf-8')

  return {
    success: true,
    projectName: genesisPayload.project.name,
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
  const activeStage = options.stage || currentPreview?.stage || 'discovery'
  const impact = analyzeImpact(lastUserMsg, currentPreview)

  // Contexto previo acumulado
  let previousContextStr = ''
  if (currentPreview && typeof currentPreview === 'object') {
    const pName = currentPreview.project?.name || ''
    const pNonGoals = currentPreview.core?.scopeBoundaries?.explicitNonGoals?.map(ng => ng.feature || ng).join(', ') || ''
    const pStories = currentPreview.requirements?.userStories?.map(st => `${st.id}: ${st.title}`).join(' | ') || ''
    const pScreens = currentPreview.uiUx?.screens?.map(sc => `${sc.name} (${sc.route})`).join(', ') || ''
    const pModules = currentPreview.product?.modules?.map(m => m.name).join(', ') || ''
    if (pName || pNonGoals || pStories || pScreens || pModules) {
      previousContextStr = `\nCONTEXTO ACUMULADO DEL PROJECT MODEL HASTA AHORA:
- Proyecto: ${pName}
- Etapa Activa: ${activeStage}
- Módulos: ${pModules || 'Pendiente de formalizar'}
- Non-Goals definidos: ${pNonGoals || 'Ninguno aún'}
- Historias existentes: ${pStories || 'Ninguna aún'}
- Pantallas mapeadas: ${pScreens || 'Ninguna aún'}
Continúa refinando y expandiendo esta especificación acumulativa.`
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

  const systemPrompt = `Eres el Mentor Principal de Ingeniería de Software y Arquitecto SDD (Spec-Driven Development).
Tu misión es educar, acompañar y transformar las ideas del usuario en una especificación de software rigurosa, completa y profesional antes de escribir una sola línea de código.

Este entorno está pensado tanto para expertos como para PERSONAS NO TÉCNICAS. Tu lenguaje conversacional debe ser claro, inspirador, didáctico y libre de jerga inútil, explicando el "por qué" de cada práctica de ingeniería.

ETAPA ACTUAL EN EL PIPELINE: "${activeStage.toUpperCase()}"
- Si la etapa es DISCOVERY: Enfócate en clarificar el problema raíz, audiencia/actores, propuesta de valor y objetivos de éxito.
- Si la etapa es PRODUCT: Desglosa el producto en 3 a 5 módulos macro y define rigurosamente los límites de alcance (In-Scope V1 vs Non-Goals explícitos).
- Si la etapa es REQUIREMENTS: Define épicas, historias de usuario con criterios formales Dado-Cuando-Entonces (Gherkin) y Reglas de Negocio del sistema (BR-001, etc.).
- Si la etapa es ARCHITECTURE / UX: Diseña servicios, stack tecnológico, tablas ERD, contratos API y pantallas.
${previousContextStr}${impactContextStr}

FORMATO ESTRICTO DE RESPUESTA:
Tu respuesta DEBE constar de dos partes:
1. Explicación didáctica y empática en Markdown en español:
   - Explica el concepto de ingeniería de la etapa actual con un tono cercano de mentor.
   - Presenta las propuestas concretas para el proyecto del usuario.
   - Si hubo un cambio o impacto, aclara qué se ajustó.
   - Cierra con una pregunta orientadora o invitación clara al siguiente paso.
2. Al final, un bloque JSON delimitado estrictamente por \`\`\`json y \`\`\` con la especificación acumulativa completa:
{
  "stage": "${activeStage}",
  "currentPhase": 1 | 2 | 3 | 4 | 5,
  "phaseTitle": "Nombre descriptivo de la etapa actual",
  "projectName": "NombreDelSoftware",
  "tagline": "Eslogan conciso y profesional",
  "purpose": "comercial",
  "depth": "serio",
  "problem": {
    "statement": "Definición clara del problema raíz",
    "painPoints": [
      { "id": "p-1", "pain": "Dolor específico", "severity": "alta", "evidence": "Impacto", "solution": "Cómo lo resuelve el software" }
    ]
  },
  "targetUsers": [
    { "id": "usr-1", "role": "Rol de usuario", "need": "Necesidad concreta", "frequency": "Diaria|Recurrente" }
  ],
  "modules": [
    { "id": "mod-1", "name": "Nombre del Módulo", "description": "Qué resuelve este módulo" }
  ],
  "inScopeV1": ["Funcionalidad confirmada para V1"],
  "nonGoals": [
    { "feature": "Funcionalidad que NO irá en V1", "rationale": "Justificación estratégica de ingeniería" }
  ],
  "businessRules": [
    { "id": "BR-001", "code": "BR-001", "rule": "Regla de negocio obligatoria", "category": "Business Logic" }
  ],
  "stories": [
    {
      "id": "US-001",
      "title": "Título conciso de la tarea o historia",
      "role": "tipo de usuario",
      "action": "acción que realiza",
      "benefit": "valor que obtiene",
      "priority": "P0",
      "scopeFiles": ["src/**", "app/**"],
      "acceptanceCriteria": [
        { "id": "c-1", "scenario": "Escenario de prueba", "given": "Dado...", "when": "Cuando...", "then": "Entonces...", "done": false }
      ]
    }
  ],
  "screens": [
    {
      "id": "SCR-01",
      "name": "Nombre de la Pantalla",
      "route": "/ruta",
      "description": "Descripción visual de la pantalla y componentes clave",
      "layout": "standard-app",
      "checklist": [
        { "id": "chk-1", "text": "Elemento verificable en la UI", "done": false }
      ]
    }
  ],
  "services": [
    { "id": "svc-1", "label": "Nombre del Servicio", "tech": "Stack tecnológico", "type": "Frontend|Backend|Database" }
  ],
  "sequenceUml": "sequenceDiagram\\n    autonumber\\n    actor U as 👤 Usuario\\n    participant FE as 🖥️ Frontend Web\\n    participant BE as ⚡ Core API\\n    participant DB as 🐘 Base de Datos\\n    U->>FE: 1. Acción...\\n    FE->>BE: 2. Petición...\\n    BE->>DB: 3. Consulta...\\n    DB-->>BE: 4. Respuesta...\\n    BE-->>FE: 5. Confirmación...\\n    FE-->>U: 6. Vista actualizada",
  "stateMachine": "stateDiagram-v2\\n    [*] --> Borrador\\n    Borrador --> EnProceso\\n    EnProceso --> Completado\\n    Completado --> [*]",
  "database": [
    { "table": "nombre_tabla", "description": "Qué persiste", "columns": ["id (UUID)", "created_at (Timestamp)", "..."] }
  ],
  "suggestedActions": [
    "Aprobar y avanzar a la siguiente etapa",
    "Ajustar propuesta actual"
  ]
}`

  const openRouterResult = await callOpenRouter({
    apiKey,
    model: targetModel,
    messages,
    systemPrompt,
    maxTokens: 8000
  })

  // Parsear el JSON emitido por el modelo de IA con fallback inteligente
  let aiParsed = extractJsonFromAi(openRouterResult.content) || {}

  // Construir especificación 100% basada en la IA
  const preview = buildSpecFromAi(aiParsed, lastUserMsg)

  // Limpiar el bloque JSON de la respuesta conversacional en Markdown
  const cleanReply = openRouterResult.content.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '').trim()

  return {
    reply: cleanReply || openRouterResult.content,
    preview,
    stage: preview.stage || activeStage,
    impact: impact.hasImpact ? impact : null,
    tokens: {
      promptTokens: openRouterResult.usage.promptTokens,
      completionTokens: openRouterResult.usage.completionTokens,
      totalTokens: openRouterResult.usage.totalTokens,
      engine: `OpenRouter AI (${openRouterResult.model})`
    },
    readyToAdvance: true,
    readyToScaffold: true
  }
}
