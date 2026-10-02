import fs from 'fs'
import path from 'path'
import { collectCodebaseEvidence, resolveOpenRouterSettings, extractJsonFromAi } from './flows-ai.js'
import { callOpenRouter } from './genesis.js'

/**
 * Motor de Ingeniería Inversa y Auditoría con IA para Proyectos Brownfield.
 * Analiza el código fuente real (rutas, controladores, modelos de base de datos, vistas)
 * y reconstruye la especificación formal SDD:
 * - Historias de Usuario Jira con criterios Gherkin y scopeFiles reales
 * - Modelo Entidad-Relación / Base de Datos
 * - Servicios de Arquitectura C4
 * - Flujos de Negocio de Extremo a Extremo
 * - Secuencias UML Mermaid
 */
export async function reverseEngineerProjectWithAi({ projectRoot = process.cwd(), apiKey = '', model = '' } = {}) {
  // 1. Obtener credenciales y modelo
  const { effectiveKey, effectiveModel } = resolveOpenRouterSettings(projectRoot, apiKey, model)
  if (!effectiveKey) {
    throw new Error('OPENROUTER_KEY_REQUIRED: Configura tu clave de OpenRouter para ejecutar la ingeniería inversa con IA.')
  }

  // 2. Extraer evidencia exhaustiva del repositorio
  const evidence = collectCodebaseEvidence(projectRoot)

  // 3. Inspeccionar archivos clave de configuración adicional
  const extraEvidence = {
    projectName: path.basename(projectRoot),
    framework: evidence.baseFindings?.framework || 'Desconocido',
    language: evidence.baseFindings?.language || 'JavaScript / TypeScript',
    integrations: evidence.integrations || [],
    detectedRoutes: evidence.baseFindings?.detectedRoutes || [],
    databaseModels: evidence.databaseModels || [],
    inspectedRoutesSample: evidence.routeEvidence || [],
    detectedScreens: (evidence.screens || []).map(s => ({ name: s.name, route: s.route, file: s.file }))
  }

  // 4. Formular el prompt de razonamiento profundo para la IA
  const systemPrompt = `Eres el Arquitecto de Software Principal de Ingeniería Inversa y Auditoría de Código de SDD (Spec-Driven Development).
Tu objetivo es analizar la evidencia objetiva del código fuente de un proyecto real existente (Brownfield) y deducir su especificación técnica formal completa.

REGLAS DE RIGOR TÉCNICO:
1. Cero alucinaciones ni plantillas ficticias: basa todo exclusivamente en las rutas, controladores, modelos y dependencias encontradas en la evidencia.
2. Historias de Usuario (userStories):
   - Deduce qué funcionalidades ya están construidas o provistas por el código existente.
   - Cada historia debe tener un título conciso, rol, acción, beneficio, status ("done" para código existente funcional, "in_progress" si es parcial), prioridad ("P0"|"P1"|"P2"), 'scopeFiles' (rutas relativas de archivos reales que la implementan) y al menos un criterio de aceptación formal en Gherkin (Dado-Cuando-Entonces).
3. Base de Datos / Modelo ERD (database):
   - Tablas deducidas o leídas de los modelos/ORM con sus columnas principales y descripción.
4. Arquitectura C4 (architecture):
   - Descompón el sistema en componentes claros (ej: Frontend Web, REST API, Base de Datos, Servicios Docker) con sus tecnologías reales y submódulos.
5. Flujos de Negocio (flows):
   - Secuencia de pasos que recorren las rutas y modelos para resolver las tareas del negocio.
6. Diagramas UML (sequences):
   - Diagrama de secuencia Mermaid (sequenceDiagram con autonumber) que modele el flujo principal de interacción.

Debes responder ÚNICAMENTE con un bloque JSON delimitado por \`\`\`json y \`\`\` con la siguiente estructura:
{
  "summary": "Resumen ejecutivo del análisis del proyecto y hallazgos clave",
  "projectName": "Nombre del proyecto",
  "purpose": "comercial|opensource|interno",
  "depth": "serio|mvp",
  "architecture": {
    "services": [
      {
        "id": "slug-servicio",
        "label": "Nombre del Servicio",
        "tech": "Stack tecnológico real",
        "type": "Frontend|Backend|Database|Infrastructure",
        "status": "online",
        "healthPercent": 100,
        "description": "Qué rol cumple este componente",
        "submodules": ["/api/...", "..."]
      }
    ]
  },
  "stories": [
    {
      "id": "US-001",
      "serviceId": "slug-servicio",
      "title": "Título conciso de la funcionalidad",
      "role": "rol del usuario",
      "action": "acción que realiza",
      "benefit": "valor que obtiene",
      "priority": "P0|P1|P2",
      "status": "done",
      "progress": 100,
      "scopeFiles": ["src/...", "..."],
      "acceptanceCriteria": [
        {
          "id": "c-1",
          "scenario": "Comportamiento del código",
          "given": "el estado inicial...",
          "when": "se invoca el endpoint o acción...",
          "then": "el sistema responde...",
          "done": true
        }
      ]
    }
  ],
  "database": {
    "tables": [
      {
        "id": "tbl-1",
        "table": "nombre_tabla_o_modelo",
        "description": "Qué persiste",
        "columns": ["id (UUID)", "campo (Tipo)", "..."]
      }
    ]
  },
  "flows": [
    {
      "id": "slug-flujo",
      "name": "Nombre del Flujo",
      "description": "Qué resuelve",
      "priority": "P0",
      "progress": 100,
      "nodes": [
        {
          "id": "node-1",
          "name": "Paso 1",
          "type": "UI|API|Database",
          "status": "done",
          "scopeFiles": ["archivo.js"],
          "checklist": [{ "id": "t-1", "text": "Verificación", "done": true }]
        }
      ]
    }
  ],
  "sequences": [
    {
      "id": "seq-01-flujo-principal",
      "flowId": "slug-flujo",
      "name": "Secuencia: Nombre del Flujo",
      "description": "Protocolo de interacción entre capas",
      "mermaid": "sequenceDiagram\\n    autonumber\\n    actor U as 👤 Usuario\\n    participant FE as 🖥️ Frontend\\n    participant BE as ⚡ Backend\\n    participant DB as 🐘 Base de Datos\\n    U->>FE: Acción\\n    FE->>BE: Petición\\n    BE->>DB: Query\\n    DB-->>BE: Datos\\n    BE-->>FE: 200 OK\\n    FE-->>U: Vista actualizada"
    }
  ]
}`

  const userPrompt = `A continuación tienes la EVIDENCIA REAL del código fuente de este proyecto:

${JSON.stringify(extraEvidence, null, 2)}

Por favor, realiza la ingeniería inversa completa y deduce todas las historias de usuario implementadas, el modelo ERD, la arquitectura C4 y los flujos con diagramas UML.`

  // 5. Invocar a la IA
  const aiResult = await callOpenRouter({
    apiKey: effectiveKey,
    model: effectiveModel,
    messages: [{ role: 'user', content: userPrompt }],
    systemPrompt,
    maxTokens: 8000
  })

  // 6. Decodificar la respuesta JSON con auto-reparación
  const parsed = extractJsonFromAi(aiResult.content)
  if (!parsed) {
    throw new Error(`No se pudo decodificar la respuesta JSON de la IA. Respuesta recibida: ${aiResult.content.slice(0, 300)}...`)
  }

  // 7. Persistir atómicamente la especificación inferida en .sdd/
  const sddDir = path.join(projectRoot, '.sdd')
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')
  const dbDir = path.join(sddDir, 'database')
  const flowsDir = path.join(sddDir, 'flows')
  const seqDir = path.join(sddDir, 'sequences')
  const coreDir = path.join(sddDir, 'core')

  const dirs = [sddDir, reqDir, storiesDir, dbDir, flowsDir, seqDir, coreDir]
  dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })

  // 7.1 Guardar Historias de Usuario
  const stories = Array.isArray(parsed.stories) ? parsed.stories : []
  stories.forEach((st, idx) => {
    const sId = st.id || `US-${String(idx + 1).padStart(3, '0')}`
    const storyData = {
      id: sId,
      epicId: st.epicId || 'EPIC-01',
      serviceId: st.serviceId || 'core-app',
      title: st.title || `Funcionalidad ${idx + 1}`,
      role: st.role || 'usuario',
      action: st.action || 'ejecutar la funcionalidad existente',
      benefit: st.benefit || 'cumplir con el objetivo del negocio',
      points: st.points || 3,
      priority: st.priority || 'P1',
      status: st.status || 'done',
      progress: st.progress !== undefined ? st.progress : 100,
      origin: 'reverse_engineered',
      detectedAt: new Date().toISOString(),
      scopeFiles: Array.isArray(st.scopeFiles) && st.scopeFiles.length > 0 ? st.scopeFiles : ['src/**'],
      acceptanceCriteria: Array.isArray(st.acceptanceCriteria) ? st.acceptanceCriteria : [
        { id: 'c-1', scenario: 'Verificación del requerimiento', given: 'el sistema en ejecución', when: 'se opera la función', then: 'responde sin errores', done: true }
      ]
    }
    fs.writeFileSync(path.join(storiesDir, `${sId}.json`), JSON.stringify(storyData, null, 2), 'utf-8')
  })
  fs.writeFileSync(path.join(reqDir, 'user-stories.json'), JSON.stringify(stories, null, 2), 'utf-8')

  // 7.2 Guardar Arquitectura
  if (parsed.architecture && Array.isArray(parsed.architecture.services) && parsed.architecture.services.length > 0) {
    fs.writeFileSync(path.join(sddDir, 'architecture.json'), JSON.stringify(parsed.architecture, null, 2), 'utf-8')
  }

  // 7.3 Guardar Base de Datos / ERD
  if (parsed.database && Array.isArray(parsed.database.tables) && parsed.database.tables.length > 0) {
    fs.writeFileSync(path.join(dbDir, 'schema-erd.json'), JSON.stringify(parsed.database, null, 2), 'utf-8')
  }

  // 7.4 Guardar Flujos
  const flows = Array.isArray(parsed.flows) ? parsed.flows : []
  flows.forEach((fl, idx) => {
    const fId = (fl.id || `flujo-${idx + 1}`).toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    const flowData = {
      id: fId,
      name: fl.name || `Flujo ${idx + 1}`,
      description: fl.description || '',
      priority: fl.priority || 'P0',
      progress: fl.progress !== undefined ? fl.progress : 100,
      origin: 'reverse_engineered',
      detectedAt: new Date().toISOString(),
      nodes: Array.isArray(fl.nodes) ? fl.nodes : []
    }
    fs.writeFileSync(path.join(flowsDir, `${fId}.json`), JSON.stringify(flowData, null, 2), 'utf-8')
  })

  // 7.5 Guardar Secuencias UML
  const sequences = Array.isArray(parsed.sequences) ? parsed.sequences : []
  if (sequences.length > 0) {
    fs.writeFileSync(path.join(seqDir, 'sequences.json'), JSON.stringify(sequences, null, 2), 'utf-8')
  }

  // 7.6 Actualizar project.json
  const projFile = path.join(sddDir, 'project.json')
  let currentProject = {}
  if (fs.existsSync(projFile)) {
    try { currentProject = JSON.parse(fs.readFileSync(projFile, 'utf-8')) } catch {}
  }
  const updatedProject = {
    ...currentProject,
    name: parsed.projectName || currentProject.name || path.basename(projectRoot),
    tagline: parsed.summary || currentProject.tagline || 'Proyecto inspeccionado con ingeniería inversa SDD',
    purpose: parsed.purpose || currentProject.purpose || 'comercial',
    depth: parsed.depth || currentProject.depth || 'serio',
    lastScannedAt: new Date().toISOString(),
    isBrownfieldScanned: true
  }
  fs.writeFileSync(projFile, JSON.stringify(updatedProject, null, 2), 'utf-8')

  return {
    success: true,
    summary: parsed.summary || `Se completó la ingeniería inversa con IA del repositorio ${path.basename(projectRoot)}.`,
    storiesCount: stories.length,
    servicesCount: parsed.architecture?.services?.length || 0,
    tablesCount: parsed.database?.tables?.length || 0,
    flowsCount: flows.length,
    sequencesCount: sequences.length,
    modelUsed: aiResult.model,
    tokens: aiResult.usage
  }
}
