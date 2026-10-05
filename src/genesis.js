import fs from 'fs'
import path from 'path'
import { extractJsonFromAi } from './flows-ai.js'

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
  const tables = Array.isArray(aiData.database) && aiData.database.length > 0
    ? aiData.database.map((t, i) => ({
        id: `tbl-${i + 1}`,
        table: t.table || t.name,
        description: t.description || `Tabla de ${t.table}`,
        columns: Array.isArray(t.columns) ? t.columns : ['id (UUID)', 'createdAt (DateTime)']
      }))
    : [
        { id: 'tbl-1', table: 'users', description: 'Usuarios y credenciales', columns: ['id (UUID)', 'email (String)', 'role (String)', 'createdAt (DateTime)'] }
      ]

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
      epics: [
        { id: 'EPIC-01', title: 'Funcionalidades Centrales de la V1', status: 'in_progress', targetSprint: 'Sprint 1' }
      ],
      userStories: stories
    },
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
      tables
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
    }
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
 * Escribe atómicamente el resultado de Génesis en disco (.sdd/ y AGENTS.md)
 */
export function scaffoldGenesis(projectRoot, genesisPayload) {
  const sddDir = path.join(projectRoot, '.sdd')
  const coreDir = path.join(sddDir, 'core')
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')
  const dbDir = path.join(sddDir, 'database')
  const flowsDir = path.join(sddDir, 'flows')
  const discDir = path.join(sddDir, 'discovery')
  const qaDir = path.join(sddDir, 'qa')
  const seqDir = path.join(sddDir, 'sequences')
  const uiDir = path.join(sddDir, 'ui-ux')

  // Crear carpetas
  const dirs = [sddDir, coreDir, reqDir, storiesDir, dbDir, flowsDir, discDir, qaDir, seqDir, uiDir]
  dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
  })

  // 1. project.json
  const projectData = {
    name: genesisPayload.project.name,
    tagline: genesisPayload.project.tagline,
    purpose: genesisPayload.project.purpose,
    depth: genesisPayload.project.depth,
    targetLaunchWeeks: genesisPayload.project.targetLaunchWeeks,
    version: '1.0.0',
    activeSprint: 'Sprint 1',
    lastUpdated: new Date().toISOString(),
    qualityGates: genesisPayload.project.qualityGates
  }
  fs.writeFileSync(path.join(sddDir, 'project.json'), JSON.stringify(projectData, null, 2), 'utf-8')

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

  // 8. requirements/epics.json
  fs.writeFileSync(path.join(reqDir, 'epics.json'), JSON.stringify(genesisPayload.requirements?.epics || [], null, 2), 'utf-8')

  // 9. requirements/user-stories.json (agrupado)
  fs.writeFileSync(path.join(reqDir, 'user-stories.json'), JSON.stringify(stories, null, 2), 'utf-8')

  // 10. flows/01-flujo-principal.json
  const flows = genesisPayload.flows || []
  flows.forEach(fl => {
    fs.writeFileSync(path.join(flowsDir, `${fl.id}.json`), JSON.stringify(fl, null, 2), 'utf-8')
  })

  // 11. architecture.json
  fs.writeFileSync(path.join(sddDir, 'architecture.json'), JSON.stringify(genesisPayload.architecture, null, 2), 'utf-8')

  // 12. database/schema-erd.json
  fs.writeFileSync(path.join(dbDir, 'schema-erd.json'), JSON.stringify(genesisPayload.database, null, 2), 'utf-8')

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
  
  // Contexto previo acumulado
  let previousContextStr = ''
  if (currentPreview && typeof currentPreview === 'object') {
    const pName = currentPreview.project?.name || ''
    const pNonGoals = currentPreview.core?.scopeBoundaries?.explicitNonGoals?.map(ng => ng.feature).join(', ') || ''
    const pStories = currentPreview.requirements?.userStories?.map(st => `${st.id}: ${st.title}`).join(' | ') || ''
    const pScreens = currentPreview.uiUx?.screens?.map(sc => `${sc.name} (${sc.route})`).join(', ') || ''
    if (pName || pNonGoals || pStories || pScreens) {
      previousContextStr = `\nCONTEXTO ACUMULADO DEL PROYECTO HASTA AHORA:
- Proyecto: ${pName}
- Non-Goals definidos: ${pNonGoals || 'Ninguno aún'}
- Historias existentes: ${pStories || 'Ninguna aún'}
- Pantallas mapeadas: ${pScreens || 'Ninguna aún'}
Continúa refinando y expandiendo esta especificación acumulativa.`
    }
  }

  const systemPrompt = `Eres el Mentor Principal de Ingeniería de Software y Arquitecto SDD (Spec-Driven Development).
Tu misión es educar, acompañar y transformar las ideas del usuario en una especificación de software rigurosa, completa y profesional antes de escribir una sola línea de código.

Este entorno está pensado tanto para expertos como para PERSONAS NO TÉCNICAS que tienen una gran idea pero no saben cómo estructurar software. Por lo tanto, tu lenguaje conversacional debe ser claro, inspirador, didáctico y libre de jerga inútil, explicando el "por qué" de cada práctica de ingeniería.

LAS 5 FASES DE LA ESTRUCTURACIÓN DE SOFTWARE SDD:
1. Fase 1: Problema Raíz, Propósito y Audiencia (El Por Qué y el Quién):
   - Clarificar el dolor principal, la propuesta de valor y los perfiles de usuario que lo padecen.
2. Fase 2: Alcance & Non-Goals V1 (El Hasta Dónde):
   - Explicar la importancia vital de definir lo que NO se hará en la V1 (Non-Goals) para evitar el "scope creep" (dispersión) y no fallar en el lanzamiento.
3. Fase 3: Historias de Usuario & Casos de Uso con Gherkin (El Qué Debe Suceder):
   - Estructurar requerimientos con el estándar de la industria: "Como [rol], quiero [acción], para [beneficio]" con criterios formales "Dado-Cuando-Entonces" para que el agente de código no alucine.
4. Fase 4: Pantallas, UI & Flujos de Navegación (El Cómo se Ve):
   - Proyectar las vistas principales de la aplicación (rutas como "/", "/dashboard", wireframes descriptivos y checklists).
5. Fase 5: Arquitectura Técnica & Diagramas UML (El Cómo Opera por Dentro):
   - Diseñar la topología de servicios, tablas y generar Diagramas UML en sintaxis Mermaid:
     * Diagrama de Secuencia (Actor -> Frontend -> Backend -> Base de Datos).
     * Diagrama de Máquina de Estados (Ciclo de vida de la entidad central).
${previousContextStr}

FORMATO ESTRICTO DE RESPUESTA:
Tu respuesta DEBE constar de dos partes:
1. Explicación didáctica y empática en Markdown en español:
   - Explica el concepto de ingeniería de la fase actual con un tono cercano de mentor.
   - Presenta las propuestas concretas para el proyecto del usuario.
   - Cierra con una pregunta orientadora o invitación clara al siguiente paso.
2. Al final, un bloque JSON delimitado estrictamente por \`\`\`json y \`\`\` con la especificación acumulativa completa:
{
  "currentPhase": 1 | 2 | 3 | 4 | 5,
  "phaseTitle": "Nombre descriptivo de la fase actual (ej: Fase 2: Alcance & Non-Goals)",
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
  "nonGoals": [
    { "feature": "Funcionalidad que NO irá en V1", "rationale": "Justificación estratégica de ingeniería" }
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
      "description": "Descripción visual de la pantalla y sus componentes clave",
      "layout": "standard-app",
      "checklist": [
        { "id": "chk-1", "text": "Elemento verificable en la UI", "done": false }
      ]
    }
  ],
  "services": [
    { "id": "svc-1", "label": "Nombre del Servicio", "tech": "Stack tecnológico", "type": "Frontend|Backend|Database" }
  ],
  "sequenceUml": "sequenceDiagram\\n    autonumber\\n    actor U as 👤 Usuario\\n    participant FE as 🖥️ Frontend Web\\n    participant BE as ⚡ Core API\\n    participant DB as 🐘 Base de Datos\\n    U->>FE: 1. Inicia acción...\\n    FE->>BE: 2. Petición...\\n    BE->>DB: 3. Consulta...\\n    DB-->>BE: 4. Respuesta...\\n    BE-->>FE: 5. Confirmación...\\n    FE-->>U: 6. Vista actualizada",
  "stateMachine": "stateDiagram-v2\\n    [*] --> Borrador\\n    Borrador --> EnProceso\\n    EnProceso --> Completado\\n    Completado --> [*]",
  "database": [
    { "table": "nombre_tabla", "description": "Qué persiste", "columns": ["id (UUID)", "created_at (Timestamp)", "..."] }
  ],
  "suggestedActions": [
    "Texto del botón 1 para el usuario (ej: Aprobar alcance y pasar a Historias)",
    "Texto del botón 2 para el usuario",
    "Texto del botón 3 para el usuario"
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
    tokens: {
      promptTokens: openRouterResult.usage.promptTokens,
      completionTokens: openRouterResult.usage.completionTokens,
      totalTokens: openRouterResult.usage.totalTokens,
      engine: `OpenRouter AI (${openRouterResult.model})`
    },
    readyToScaffold: true
  }
}
