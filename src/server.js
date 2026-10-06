import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import net from 'net'
import { fileURLToPath } from 'url'
import { exec, execSync } from 'child_process'
import { scanProject, scanProjectViews } from './scanner.js'
import { scaffoldGenesis, processGenesisChat, analyzeImpact, persistGenesisStage } from './genesis.js'
import { discoverFlowsWithAi } from './flows-ai.js'
import { reverseEngineerProjectWithAi } from './reverse-engineer.js'
import { normalizeProjectModel, calculateProjectProgress, normalizeBusinessRule, normalizeUserFlow, normalizeBusinessFlow, normalizeTechStack, normalizeEndpoint, normalizeApiContract, normalizeDatabaseTable, normalizeDatabaseRelationship, normalizeScreen, normalizeWireframe, normalizeDesignSystem, normalizeExecutionPhase, normalizeExecutionTask, normalizeDependencyGraph, normalizeQualityGate } from './model-schema.js'
import { compileAgentContext, dispatchTaskToAgent, completeTaskAndAdvance } from './agent-context.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UI_DIR = path.join(__dirname, '..', 'ui')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
}

function readJsonFile(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return fallback
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error writing file:', filePath, err)
    return false
  }
}

function mergeDetectedScreens(detected, existing) {
  if (!Array.isArray(detected) || detected.length === 0) return existing || []
  if (!Array.isArray(existing) || existing.length === 0) return detected

  const existingByRoute = new Map()
  const existingByFile = new Map()
  existing.forEach(s => {
    if (s.route) existingByRoute.set(s.route, s)
    if (s.file || s.filePath || s.sourceFile) {
      existingByFile.set(s.file || s.filePath || s.sourceFile, s)
    }
  })

  const merged = detected.map(d => {
    const prev = existingByRoute.get(d.route) || existingByFile.get(d.file)
    if (prev) {
      return {
        ...d,
        name: prev.name || d.name,
        wireframeDescription: prev.wireframeDescription || d.wireframeDescription,
        checklist: prev.checklist && prev.checklist.length > 0 ? prev.checklist : d.checklist,
        layout: prev.layout || d.layout,
        status: prev.status || d.status,
        healthPercent: prev.healthPercent !== undefined ? prev.healthPercent : d.healthPercent
      }
    }
    return d
  })

  const detectedRoutes = new Set(detected.map(d => d.route))
  existing.forEach(s => {
    if (s.route && !detectedRoutes.has(s.route) && !s.file) {
      merged.push(s)
    }
  })

  return merged
}

function loadEnvVariables(projectRoot) {
  const env = {}
  const files = ['.env', '.env.local', '.env.development']
  for (const f of files) {
    const p = path.join(projectRoot, f)
    if (fs.existsSync(p)) {
      try {
        const lines = fs.readFileSync(p, 'utf-8').split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim()
            let val = trimmed.slice(eqIdx + 1).trim()
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1)
            }
            if (!env[key]) env[key] = val
          }
        }
      } catch {}
    }
  }
  return env
}

const OPENROUTER_FREE_MODELS = [
  { id: 'inclusionai/ling-3.0-flash-sante:free', name: 'Ling 3.0 Flash (Recomendado)', provider: 'inclusionAI', context: '262k', badge: '100% Gratis', recommended: true },
  { id: 'openrouter/free', name: 'OpenRouter Free Auto-Router', provider: 'OpenRouter', context: '200k', badge: '100% Gratis' },
  { id: 'liquid/lfm-2.5-2.6b:free', name: 'LiquidAI LFM 2.5', provider: 'LiquidAI', context: '64k', badge: '100% Gratis' },
  { id: 'dots-studio/dots-3-note-preview:free', name: 'Dots Studio 3 Note', provider: 'Dots', context: '512k', badge: '100% Gratis' }
]

function getGlobalConfigFile() {
  return path.join(os.homedir(), '.sdd', 'config.json')
}

function getOpenRouterConfig(projectRoot) {
  const configFile = path.join(projectRoot, '.sdd', 'config.json')
  const diskConfig = readJsonFile(configFile, {})
  const globalConfig = readJsonFile(getGlobalConfigFile(), {})
  const fileEnv = loadEnvVariables(projectRoot)

  const apiKey = diskConfig.openrouterApiKey || globalConfig.openrouterApiKey || process.env.OPENROUTER_API_KEY || fileEnv.OPENROUTER_API_KEY || ''
  const defaultModel = diskConfig.openrouterModel || globalConfig.openrouterModel || process.env.OPENROUTER_MODEL || 'inclusionai/ling-3.0-flash-sante:free'

  return {
    configured: Boolean(apiKey),
    apiKey,
    keyMasked: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : null,
    defaultModel,
    freeModels: OPENROUTER_FREE_MODELS
  }
}

function getDriftReport(projectRoot) {
  const sddDir = path.join(projectRoot, '.sdd')
  const flowsDir = path.join(sddDir, 'flows')
  const storiesDir = path.join(sddDir, 'requirements', 'stories')

  try {
    const declared = new Set()
    if (fs.existsSync(flowsDir)) {
      const flowFiles = fs.readdirSync(flowsDir).filter(f => f.endsWith('.json'))
      for (const f of flowFiles) {
        const flow = readJsonFile(path.join(flowsDir, f))
        flow?.nodes?.forEach(n => n.scopeFiles?.forEach(file => declared.add(file.replace(/\\/g, '/'))))
      }
    }
    if (fs.existsSync(storiesDir)) {
      const storyFiles = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json'))
      for (const f of storyFiles) {
        const story = readJsonFile(path.join(storiesDir, f))
        story?.scopeFiles?.forEach(file => declared.add(file.replace(/\\/g, '/')))
      }
    }

    let modified = []
    try {
      const output = execSync('git status --porcelain', { cwd: projectRoot, encoding: 'utf-8', timeout: 3000 })
      const lines = output.split('\n').filter(Boolean)
      for (const line of lines) {
        const match = line.trim().match(/^([MADRCU?]+)\s+(.+)$/)
        if (match) {
          let fp = match[2].trim().replace(/\\/g, '/')
          if (fp.startsWith('"') && fp.endsWith('"')) fp = fp.slice(1, -1)
          if (!fp.startsWith('.sdd/') && !fp.startsWith('.git') && fp !== 'AGENTS.md') {
            modified.push(fp)
          }
        }
      }
    } catch {
      // Git command might fail if not a git repo
    }

    const inScope = []
    const outOfScope = []
    for (const file of modified) {
      const isDeclared = Array.from(declared).some(d => file.startsWith(d) || d.startsWith(file))
      if (isDeclared) inScope.push(file)
      else outOfScope.push(file)
    }

    const driftScore = modified.length === 0 ? 100 : Math.round((inScope.length / (inScope.length + outOfScope.length)) * 100)
    return {
      driftScore,
      isClean: outOfScope.length === 0,
      totalModified: modified.length,
      inScope,
      outOfScope,
      declaredCount: declared.size
    }
  } catch (err) {
    return { driftScore: 100, isClean: true, totalModified: 0, inScope: [], outOfScope: [], declaredCount: 0, error: err.message }
  }
}

function calculateConvergence(projectRoot, sddDir) {
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')
  const coreDir = path.join(sddDir, 'core')
  const drift = getDriftReport(projectRoot)

  let stories = []
  if (fs.existsSync(storiesDir)) {
    const files = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json'))
    stories = files.map(f => readJsonFile(path.join(storiesDir, f))).filter(Boolean)
  }
  if (stories.length === 0) {
    stories = readJsonFile(path.join(reqDir, 'user-stories.json'), [])
  }

  let totalCriteria = 0
  let doneCriteria = 0
  const pendingDetails = []

  stories.forEach(s => {
    const criteria = s.acceptanceCriteria || []
    const pendingList = []
    criteria.forEach(c => {
      totalCriteria++
      if (c.done) doneCriteria++
      else pendingList.push(c.scenario || c.id)
    })
    if (pendingList.length > 0) {
      pendingDetails.push({ storyId: s.id, title: s.title, pending: pendingList })
    }
  })

  const criteriaPercent = totalCriteria > 0 ? Math.round((doneCriteria / totalCriteria) * 100) : 100
  const constitution = readJsonFile(path.join(coreDir, 'constitution.json'), { principles: [] })
  const activePrinciples = (constitution.principles || []).filter(p => p.status === 'active')

  let status = 'converged'
  let label = 'CONVERGIDO'
  let message = 'La implementación satisface el 100% de la especificación sin violaciones de alcance.'

  if (drift.outOfScope && drift.outOfScope.length > 0) {
    status = 'divergent'
    label = 'DIVERGENCIA DETECTADA'
    message = `Se detectaron ${drift.outOfScope.length} archivos modificados fuera de alcance (Scope Shield comprometido).`
  } else if (criteriaPercent < 100 || pendingDetails.length > 0) {
    status = 'in_progress'
    label = 'EN CONVERGENCIA'
    message = `Faltan ${totalCriteria - doneCriteria} criterios Gherkin por verificar en ${pendingDetails.length} historias.`
  }

  return {
    status,
    label,
    message,
    score: Math.round((criteriaPercent * 0.7) + ((drift.driftScore || 100) * 0.3)),
    criteriaPercent,
    totalCriteria,
    doneCriteria,
    pendingCount: totalCriteria - doneCriteria,
    pendingDetails,
    drift,
    activePrinciplesCount: activePrinciples.length,
    timestamp: new Date().toISOString()
  }
}

function generateMultiIdeRules(projectRoot, sddDir) {
  const project = readJsonFile(path.join(sddDir, 'project.json'), { name: path.basename(projectRoot) })
  const constitution = readJsonFile(path.join(sddDir, 'core', 'constitution.json'), { principles: [] })
  const scopeBoundaries = readJsonFile(path.join(sddDir, 'core', 'scope-boundaries.json'), { inScopeV1: [], explicitNonGoals: [] })
  
  const nonGoalsList = (scopeBoundaries.explicitNonGoals || []).map(ng => `- ${typeof ng === 'object' ? ng.feature || JSON.stringify(ng) : ng}`).join('\n')
  const principlesList = (constitution.principles || []).map(p => `- [${p.category || 'General'}] ${p.name || ''}: ${p.rule || ''}`).join('\n')

  const baseContent = `# Spec-Driven Development (SDD) — Reglas y Contexto del Proyecto: ${project.name || 'Proyecto'}

Este proyecto utiliza **Spec-Driven Development (SDD)**. La fuente de verdad única y ejecutable reside en el directorio \`.sdd/\`.

## 📜 Constitución del Proyecto & Invariantes Técnicos
${principlesList || '- Modularidad, tipado estricto y cero dependencias invasivas.'}

## 🚫 Non-Goals Explícitos (Congelados para V1 - NO IMPLEMENTAR)
${nonGoalsList || '- Funcionalidades fuera de alcance congeladas para V2.'}

## 🤖 Directivas de Ejecución para Agentes de IA:
1. **Lectura Previa**: Consulta la historia o tarea activa en \`.sdd/active_task.json\` o \`.sdd/requirements/stories/US-*.json\` antes de escribir código.
2. **Escudo de Deriva (Scope Shield)**: Modifica ÚNICAMENTE los archivos declarados en \`scopeFiles\`. Cualquier cambio fuera de scope es rechazado por el sistema.
3. **Criterios Gherkin**: Verifica cada escenario Dado-Cuando-Entonces y marca \`"done": true\` en el archivo atómico JSON de la historia.
4. **Bucle de Convergencia**: Asegura que el 100% de la especificación esté satisfecha sin romper invariantes ni introducir código muerto.
`

  const filesWritten = []

  // 1. AGENTS.md
  const agentsPath = path.join(projectRoot, 'AGENTS.md')
  fs.writeFileSync(agentsPath, baseContent, 'utf-8')
  filesWritten.push('AGENTS.md')

  // 2. .cursorrules
  const cursorPath = path.join(projectRoot, '.cursorrules')
  fs.writeFileSync(cursorPath, baseContent + `\n## Directivas para Cursor:\n- Mantén ediciones concisas y dentro del archivo activo.\n- Consulta .sdd/architecture.json para el mapa de contenedores.\n`, 'utf-8')
  filesWritten.push('.cursorrules')

  // 3. CLAUDE.md
  const claudePath = path.join(projectRoot, 'CLAUDE.md')
  fs.writeFileSync(claudePath, baseContent + `\n## Directivas para Claude Code:\n- Revisa la estructura .sdd/ antes de planear herramientas de edición.\n- Ejecuta validaciones de test antes de reportar finalización.\n`, 'utf-8')
  filesWritten.push('CLAUDE.md')

  // 4. .windsurfrules
  const windsurfPath = path.join(projectRoot, '.windsurfrules')
  fs.writeFileSync(windsurfPath, baseContent + `\n## Directivas para Windsurf Cascade:\n- Respeta estrictamente los límites de alcance declarados en scopeFiles.\n`, 'utf-8')
  filesWritten.push('.windsurfrules')

  // 5. .github/copilot-instructions.md
  const githubDir = path.join(projectRoot, '.github')
  if (!fs.existsSync(githubDir)) fs.mkdirSync(githubDir, { recursive: true })
  const copilotPath = path.join(githubDir, 'copilot-instructions.md')
  fs.writeFileSync(copilotPath, baseContent + `\n## Directivas para GitHub Copilot:\n- Basa sugerencias en la especificación SDD y no en suposiciones no verificadas.\n`, 'utf-8')
  filesWritten.push('.github/copilot-instructions.md')

  return filesWritten
}

export function createSddServer(projectRoot = process.cwd(), port = 3030) {
  const sddDir = path.join(projectRoot, '.sdd')
  const coreDir = path.join(sddDir, 'core')
  const discoveryDir = path.join(sddDir, 'discovery')
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')
  const flowsDir = path.join(sddDir, 'flows')
  const dbDir = path.join(sddDir, 'database')
  const qaDir = path.join(sddDir, 'qa')
  const seqDir = path.join(sddDir, 'sequences')
  const uiDir = path.join(sddDir, 'ui-ux')
  const productDir = path.join(sddDir, 'product')
  const archDir = path.join(sddDir, 'architecture')
  const apiDir = path.join(sddDir, 'api')
  const execDir = path.join(sddDir, 'execution')
  const govDir = path.join(sddDir, 'governance')

  const server = http.createServer(async (req, res) => {
    // CORS headers for local tools
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)

    // 1. API GET /api/sdd
    if (url.pathname === '/api/sdd' && req.method === 'GET') {
      try {
        const project = readJsonFile(path.join(sddDir, 'project.json'), {
          name: path.basename(projectRoot),
          purpose: 'comercial',
          depth: 'serio',
          qualityGates: []
        })

        const problem = readJsonFile(path.join(coreDir, 'problem.json'), {})
        const targetUsers = readJsonFile(path.join(coreDir, 'target-user.json'), {})
        const scopeBoundaries = readJsonFile(path.join(coreDir, 'scope-boundaries.json'), { inScopeV1: [], explicitNonGoals: [] })
        const successCriteria = readJsonFile(path.join(coreDir, 'success-criteria.json'), {})
        const risks = readJsonFile(path.join(coreDir, 'risks.json'), {})
        const constitution = readJsonFile(path.join(coreDir, 'constitution.json'), {
          title: 'Constitución de Ingeniería & Invariantes Técnicos',
          version: '1.0.0',
          principles: []
        })

        const interviews = readJsonFile(path.join(discoveryDir, 'interviews.json'), { interviewSessions: [] })
        const hypotheses = readJsonFile(path.join(discoveryDir, 'hypotheses.json'), {})
        const competitors = readJsonFile(path.join(discoveryDir, 'competitive-matrix.json'), {})

        let userStories = []
        if (fs.existsSync(storiesDir)) {
          const files = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json'))
          userStories = files.map(f => readJsonFile(path.join(storiesDir, f))).filter(Boolean)
        }
        if (userStories.length === 0) {
          userStories = readJsonFile(path.join(reqDir, 'user-stories.json'), [])
        }

        const epics = readJsonFile(path.join(reqDir, 'epics.json'), [])
        const useCases = readJsonFile(path.join(reqDir, 'use-cases.json'), [])
        const rolesMatrix = readJsonFile(path.join(reqDir, 'roles-matrix.json'), {})

        let userFlows = readJsonFile(path.join(flowsDir, 'user-flows.json'), [])
        if (!Array.isArray(userFlows)) userFlows = []

        let businessFlows = readJsonFile(path.join(flowsDir, 'business-flows.json'), [])
        if (!Array.isArray(businessFlows)) businessFlows = []

        let flows = []
        if (fs.existsSync(flowsDir)) {
          const files = fs.readdirSync(flowsDir).filter(f => f.endsWith('.json') && f !== 'user-flows.json' && f !== 'business-flows.json')
          flows = files.map(f => readJsonFile(path.join(flowsDir, f))).filter(Boolean)
        }
        if (businessFlows.length === 0 && flows.length > 0) {
          businessFlows = flows
        }

        let architecture = readJsonFile(path.join(sddDir, 'architecture.json'))
        if (!architecture || !Array.isArray(architecture.services) || architecture.services.length === 0) {
          const scan = scanProject(projectRoot)
          const detectedServices = scan.inferredArchitecture?.services ? [...scan.inferredArchitecture.services] : []
          if (fs.existsSync(path.join(projectRoot, 'ui', 'index.html')) && !detectedServices.some(s => s.id === 'studio-ui')) {
            detectedServices.unshift({
              id: 'studio-ui',
              label: 'SDD Studio Web UI',
              type: 'Frontend Client',
              status: 'online',
              tech: 'HTML5 / ES Modules / Tailwind',
              healthPercent: 100,
              description: 'Lienzo interactivo, cabina de control y centro de mando para el agente.'
            })
          }
          architecture = { services: detectedServices }
          writeJsonFile(path.join(sddDir, 'architecture.json'), architecture)
        }
        const database = readJsonFile(path.join(dbDir, 'schema-erd.json'), {})
        const dbRelationships = readJsonFile(path.join(dbDir, 'relationships.json'), [])
        const testPlan = readJsonFile(path.join(qaDir, 'test-plan.json'), {})
        // Carga y normalización de Secuencias UML vinculadas a Flujos
        let sequences = []
        const seqJsonPath = path.join(seqDir, 'sequences.json')
        if (fs.existsSync(seqJsonPath)) {
          const loaded = readJsonFile(seqJsonPath, [])
          sequences = Array.isArray(loaded) ? loaded : [loaded]
        } else if (fs.existsSync(path.join(seqDir, 'checkout-flow.json'))) {
          const loaded = readJsonFile(path.join(seqDir, 'checkout-flow.json'), {})
          sequences = Array.isArray(loaded) ? loaded : (loaded && Object.keys(loaded).length > 0 ? [loaded] : [])
        } else if (fs.existsSync(seqDir)) {
          const files = fs.readdirSync(seqDir).filter(f => f.endsWith('.json') && !f.includes('state-machine'))
          for (const f of files) {
            const loaded = readJsonFile(path.join(seqDir, f))
            if (Array.isArray(loaded)) sequences.push(...loaded)
            else if (loaded && (loaded.mermaid || loaded.steps || loaded.name)) sequences.push(loaded)
          }
        }

        // Si existen flujos sin secuencia explícita, autogenerar secuencia técnica interactiva
        flows.forEach((fl, idx) => {
          const hasSeq = sequences.some(s => s.flowId === fl.id || (s.id && s.id.toLowerCase() === fl.id.toLowerCase()))
          if (!hasSeq && fl.nodes && fl.nodes.length > 0) {
            const steps = []
            let mermaid = `sequenceDiagram\n    autonumber\n    actor U as 👤 Usuario\n    participant API as ⚡ Core API\n    participant DB as 🐘 Base de Datos\n`
            fl.nodes.forEach((n, i) => {
              steps.push({
                from: i === 0 ? '👤 Usuario' : '⚡ Core API',
                to: n.name.toLowerCase().includes('database') || n.name.toLowerCase().includes('prisma') ? '🐘 Base de Datos' : '⚡ Core API',
                action: n.agentPrompt || n.name,
                type: 'sync'
              })
              if (i === 0) {
                mermaid += `    U->>API: Inicia ${n.name}\n`
              } else {
                mermaid += `    API->>DB: Ejecuta nodo ${n.name}\n    DB-->>API: Confirmación de datos\n`
              }
            })
            mermaid += `    API-->>U: Operación confirmada con éxito\n`

            sequences.push({
              id: `SEQ-0${sequences.length + 1}`,
              flowId: fl.id,
              name: `Secuencia: ${fl.name}`,
              description: fl.description || `Protocolo de interacción para el flujo ${fl.name}.`,
              mermaid,
              actors: ['👤 Usuario', '⚡ Core API', '🐘 Base de Datos'],
              steps
            })
          }
        })

        // Carga de Diagramas de Máquinas de Estado UML (FSM)
        let stateMachines = []
        const fsmPath = path.join(seqDir, 'state-machines.json')
        if (fs.existsSync(fsmPath)) {
          const loaded = readJsonFile(fsmPath, [])
          stateMachines = Array.isArray(loaded) ? loaded : [loaded]
        } else if (fs.existsSync(path.join(dbDir, 'state-machines.json'))) {
          const loaded = readJsonFile(path.join(dbDir, 'state-machines.json'), [])
          stateMachines = Array.isArray(loaded) ? loaded : [loaded]
        }

        // Carga de la Suite Completa de 14 Diagramas UML Estándar OMG
        let umlDiagrams = []
        const umlPath = path.join(seqDir, 'uml-diagrams.json')
        if (fs.existsSync(umlPath)) {
          const loaded = readJsonFile(umlPath, [])
          umlDiagrams = Array.isArray(loaded) ? loaded : [loaded]
        }

        let screens = readJsonFile(path.join(uiDir, 'screens.json'), [])
        const detected = scanProjectViews(projectRoot)
        if (detected && detected.length > 0) {
          const existingRoutes = new Set((Array.isArray(screens) ? screens : []).map(s => s.route))
          const hasMissingViews = detected.some(d => !existingRoutes.has(d.route))
          if (!Array.isArray(screens) || screens.length === 0 || hasMissingViews) {
            screens = mergeDetectedScreens(detected, Array.isArray(screens) ? screens : [])
            writeJsonFile(path.join(uiDir, 'screens.json'), screens)
          }
        }

        const drift = getDriftReport(projectRoot)

        const taskFile = path.join(sddDir, 'genesis_task.json')
        const genesisTask = fs.existsSync(taskFile) ? readJsonFile(taskFile) : null

        const activeTaskFile = path.join(sddDir, 'active_task.json')
        const activeTask = fs.existsSync(activeTaskFile) ? readJsonFile(activeTaskFile) : null

        const isNewProject = !fs.existsSync(path.join(sddDir, 'project.json')) || userStories.length === 0

        // Lectura de entidades v2
        const vision = readJsonFile(path.join(productDir, 'vision.json'), null)
        const productScope = readJsonFile(path.join(productDir, 'scope.json'), null)
        const actors = readJsonFile(path.join(productDir, 'actors.json'), null)
        const modules = readJsonFile(path.join(productDir, 'modules.json'), null)
        const businessRules = readJsonFile(path.join(reqDir, 'business-rules.json'), [])
        const stack = readJsonFile(path.join(archDir, 'stack.json'), null)
        const endpoints = readJsonFile(path.join(apiDir, 'endpoints.json'), [])
        const apiContracts = readJsonFile(path.join(apiDir, 'contracts.json'), [])
        const execTasks = readJsonFile(path.join(execDir, 'tasks.json'), [])
        const execPhases = readJsonFile(path.join(execDir, 'phases.json'), [])
        const execDeps = readJsonFile(path.join(execDir, 'dependencies.json'), {})
        const qualityGates = readJsonFile(path.join(govDir, 'quality-gates.json'), null)
        const agentContext = readJsonFile(path.join(govDir, 'agent-context.json'), null)
        const wireframes = readJsonFile(path.join(uiDir, 'wireframes.json'), [])
        const uiComponents = readJsonFile(path.join(uiDir, 'components.json'), [])
        const designSystem = readJsonFile(path.join(uiDir, 'design-system.json'), null)

        // Normalización canónica del Project Model v2
        const modelV2 = normalizeProjectModel({
          project,
          core: { problem, targetUsers, scopeBoundaries, successCriteria, risks, constitution },
          product: { vision, scope: productScope, actors, modules },
          requirements: { epics, userStories, businessRules },
          flows: { userFlows, businessFlows },
          architecture: {
            topology: architecture,
            stack
          },
          database: {
            tables: Array.isArray(database.tables) ? database.tables : (Array.isArray(database) ? database : []),
            relationships: Array.isArray(dbRelationships) && dbRelationships.length > 0 ? dbRelationships : (Array.isArray(database.relationships) ? database.relationships : [])
          },
          api: { endpoints, contracts: apiContracts },
          sequences,
          uiUx: { screens, components: uiComponents, wireframes, designSystem },
          execution: { phases: execPhases, tasks: execTasks, dependencies: execDeps, activeTask },
          governance: { qualityGates, agentContext }
        })

        // Sincronizar stage y progress en project
        project.stage = project.stage || modelV2.meta.stage
        project.progress = typeof project.progress === 'number' ? project.progress : modelV2.meta.progress
        project.completedStages = project.completedStages || modelV2.meta.completedStages

        const payload = {
          isNewProject,
          workspaceName: path.basename(projectRoot),
          workspacePath: projectRoot,
          project,
          genesisTask,
          activeTask,
          core: { problem, targetUsers, scopeBoundaries, successCriteria, risks, constitution },
          discovery: { interviews, hypotheses, competitors },
          manifest: {
            metrics: { globalHealth: 100, flowsHealth: 100, totalFlows: flows.length },
            flowsSummary: flows.map(f => ({ id: f.id, name: f.name, priority: f.priority, progress: f.progress || 0 }))
          },
          architecture,
          flows: businessFlows.length > 0 ? businessFlows : flows,
          userFlows: modelV2.flows.userFlows,
          businessFlows: modelV2.flows.businessFlows,
          requirements: { epics, userStories, useCases, rolesMatrix },
          database,
          testPlan,
          sequences,
          stateMachines,
          umlDiagrams,
          uiUx: {
            screens: modelV2.uiUx.screens,
            wireframes: modelV2.uiUx.wireframes,
            components: modelV2.uiUx.components,
            designSystem: modelV2.uiUx.designSystem
          },
          wireframes: modelV2.uiUx.wireframes,
          designSystem: modelV2.uiUx.designSystem,
          drift,
          convergence: calculateConvergence(projectRoot, sddDir),
          // Integración con Project Model v2
          modelV2,
          product: modelV2.product,
          businessRules: modelV2.requirements.businessRules,
          stack: modelV2.architecture.stack,
          api: modelV2.api,
          execution: modelV2.execution,
          governance: modelV2.governance,
          activeTask: modelV2.execution.activeTask,
          agentContext: modelV2.governance.agentContext,
          stageInfo: {
            stage: modelV2.meta.stage,
            progress: modelV2.meta.progress,
            completedStages: modelV2.meta.completedStages
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(payload))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
      return
    }

    // 2. API PATCH /api/sdd
    if (url.pathname === '/api/sdd' && req.method === 'PATCH') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const body = JSON.parse(bodyData)

          // 2.1 Mutar Pregunta de Discovery
          if (body.questionId) {
            const intFile = path.join(discoveryDir, 'interviews.json')
            const data = readJsonFile(intFile, { interviewSessions: [] })
            let found = false
            for (const sess of (data.interviewSessions || [])) {
              const q = sess.questions?.find(item => item.id === body.questionId)
              if (q) {
                if (body.answer !== undefined) q.answer = body.answer
                if (body.status !== undefined) q.status = body.status
                if (body.isNotApplicable !== undefined) q.isNotApplicable = Boolean(body.isNotApplicable)
                if (body.notApplicableReason !== undefined) q.notApplicableReason = body.notApplicableReason
                found = true
                break
              }
            }
            if (found) {
              data.lastUpdated = new Date().toISOString()
              writeJsonFile(intFile, data)

              // Sincronización bidireccional inteligente hacia architecture.json
              if (body.questionId === 'q-stack-database' && body.answer) {
                const archFile = path.join(sddDir, 'architecture.json')
                const arch = readJsonFile(archFile, { services: [] })
                const dbSvc = arch.services?.find(s => s.type?.includes('Database'))
                if (dbSvc) {
                  dbSvc.tech = body.answer.split('.')[0].slice(0, 50)
                  writeJsonFile(archFile, arch)
                }
              } else if (body.questionId === 'q-stack-frontend' && body.answer) {
                const archFile = path.join(sddDir, 'architecture.json')
                const arch = readJsonFile(archFile, { services: [] })
                const feSvc = arch.services?.find(s => s.type?.includes('Frontend') || s.type?.includes('Fullstack'))
                if (feSvc) {
                  feSvc.tech = body.answer.split('.')[0].slice(0, 50)
                  writeJsonFile(archFile, arch)
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, updatedQuestionId: body.questionId }))
              return
            }
          }

          // 2.2 Mutar Compuerta de Calidad
          if (body.gateId) {
            const projFile = path.join(sddDir, 'project.json')
            const project = readJsonFile(projFile)
            if (project) {
              // Si es un array de gates
              if (Array.isArray(project.qualityGates)) {
                const gate = project.qualityGates.find(g => g.id === body.gateId)
                if (gate) {
                  if (body.gateStatus) gate.status = body.gateStatus
                  if (body.verifiedBy) gate.verifiedBy = body.verifiedBy
                  gate.verifiedAt = new Date().toISOString()
                  writeJsonFile(projFile, project)
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ success: true, updatedGate: gate }))
                  return
                }
              } else if (typeof project.qualityGates === 'object') {
                // Si es un mapa clave-valor booleano
                project.qualityGates[body.gateId] = body.gateStatus === 'passed' || Boolean(body.done)
                writeJsonFile(projFile, project)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, qualityGates: project.qualityGates }))
                return
              }
            }
          }

          // 2.25 Mutar o Actualizar Constitución de Ingeniería
          if (body.constitution) {
            const constFile = path.join(coreDir, 'constitution.json')
            writeJsonFile(constFile, body.constitution)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, constitution: body.constitution }))
            return
          }

          if (body.togglePrincipleId) {
            const constFile = path.join(coreDir, 'constitution.json')
            const constData = readJsonFile(constFile, { principles: [] })
            const p = constData.principles?.find(x => x.id === body.togglePrincipleId)
            if (p) {
              p.status = p.status === 'active' ? 'disabled' : 'active'
              writeJsonFile(constFile, constData)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, updatedPrinciple: p }))
              return
            }
          }

          // 2.3 Mutar Tarea de Nodo de Flujo (Flow Node Checklist)
          if (body.flowId && body.nodeId) {
            const flowFile = path.join(flowsDir, `${body.flowId}.json`)
            const flow = readJsonFile(flowFile)
            if (flow) {
              const node = flow.nodes?.find(n => n.id === body.nodeId)
              if (node) {
                if (body.taskId) {
                  const task = node.checklist?.find(t => t.id === body.taskId)
                  if (task) task.done = Boolean(body.done)
                }
                if (body.status) node.status = body.status
                if (body.assignedTo) node.assignedTo = body.assignedTo

                // Recalcular estado de nodo si tiene checklist
                if (node.checklist && node.checklist.length > 0) {
                  const doneCount = node.checklist.filter(t => t.done).length
                  if (doneCount === node.checklist.length) node.status = 'done'
                  else if (doneCount > 0) node.status = 'in_progress'
                  else node.status = 'todo'
                }

                // Recalcular progreso global del flujo
                let totalTasks = 0
                let doneTasks = 0
                flow.nodes.forEach(n => {
                  if (n.checklist && n.checklist.length > 0) {
                    totalTasks += n.checklist.length
                    doneTasks += n.checklist.filter(t => t.done).length
                  } else {
                    totalTasks += 1
                    if (n.status === 'done') doneTasks += 1
                  }
                })
                flow.progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

                writeJsonFile(flowFile, flow)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, updatedFlow: flow }))
                return
              }
            }
          }

          // 2.4 Mutar Historia de Usuario (Criterios Gherkin / Kanban)
          if (body.storyId) {
            const storyFile = path.join(storiesDir, `${body.storyId}.json`)
            let story = readJsonFile(storyFile)
            if (!story) {
              // fallback al array
              const sPath = path.join(reqDir, 'user-stories.json')
              const arr = readJsonFile(sPath, [])
              story = arr.find(s => s.id === body.storyId)
            }

            if (story) {
              if (body.criterionId) {
                const c = story.acceptanceCriteria?.find(item => item.id === body.criterionId)
                if (c) c.done = Boolean(body.done)
              }
              if (body.assignedTo) story.assignedTo = body.assignedTo
              if (body.businessRuleIds !== undefined) story.businessRuleIds = Array.isArray(body.businessRuleIds) ? body.businessRuleIds : []
              if (body.status === 'done') {
                story.status = 'done'
                story.progress = 100
                if (Array.isArray(story.acceptanceCriteria)) {
                  story.acceptanceCriteria.forEach(c => { c.done = true })
                }
              } else {
                const total = story.acceptanceCriteria?.length || 0
                const doneCount = story.acceptanceCriteria?.filter(item => item.done).length || 0
                story.progress = total > 0 ? Math.round((doneCount / total) * 100) : 0
                if (total > 0 && doneCount === total) story.status = 'done'
                else if (doneCount > 0) story.status = 'in_progress'
              }

              // Si la historia fue completada, actualizar active_task.json si corresponde
              if (story.status === 'done') {
                const activeTaskFile = path.join(sddDir, 'active_task.json')
                if (fs.existsSync(activeTaskFile)) {
                  const active = readJsonFile(activeTaskFile)
                  if (active && active.storyId === story.id) {
                    active.status = 'done'
                    active.completedAt = new Date().toISOString()
                    writeJsonFile(activeTaskFile, active)
                    console.log(`\n✅ [SDD_AGENT_TASK_COMPLETED]: ${story.id} ("${story.title}")`)
                  }
                }
              }

              writeJsonFile(storyFile, story)

              // Sincronizar archivo agrupado si existe
              const sPath = path.join(reqDir, 'user-stories.json')
              if (fs.existsSync(sPath)) {
                const arr = readJsonFile(sPath, [])
                const idx = arr.findIndex(s => s.id === body.storyId)
                if (idx !== -1) {
                  arr[idx] = story
                  writeJsonFile(sPath, arr)
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, updatedStory: story }))
              return
            }
          }

          // 2.5 Confirmar Origen [INFERIDO -> CONFIRMADO]
          if (body.confirmOrigin && body.entityType && body.entityId) {
            if (body.entityType === 'story') {
              const storyFile = path.join(storiesDir, `${body.entityId}.json`)
              const story = readJsonFile(storyFile)
              if (story) {
                story.origin = 'confirmed'
                writeJsonFile(storyFile, story)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, confirmedStory: story }))
                return
              }
            } else if (body.entityType === 'architecture') {
              const archFile = path.join(sddDir, 'architecture.json')
              const arch = readJsonFile(archFile)
              const node = arch?.services?.find(n => n.id === body.entityId)
              if (node) {
                node.origin = 'confirmed'
                writeJsonFile(archFile, arch)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, confirmedNode: node }))
                return
              }
            }
          }

          // 2.6 Mutar o guardar Secuencia UML
          if (body.sequence) {
            const seqFile = path.join(seqDir, 'sequences.json')
            let seqs = readJsonFile(seqFile, [])
            if (!Array.isArray(seqs)) seqs = seqs ? [seqs] : []
            const idx = seqs.findIndex(s => s.id === body.sequence.id || (body.sequence.flowId && s.flowId === body.sequence.flowId))
            if (idx !== -1) {
              seqs[idx] = { ...seqs[idx], ...body.sequence }
            } else {
              seqs.push(body.sequence)
            }
            writeJsonFile(seqFile, seqs)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedSequence: body.sequence }))
            return
          }

          // 2.7 Mutar o guardar Diagrama de Máquina de Estados (FSM)
          if (body.stateMachine) {
            const fsmFile = path.join(seqDir, 'state-machines.json')
            let fsms = readJsonFile(fsmFile, [])
            if (!Array.isArray(fsms)) fsms = fsms ? [fsms] : []
            const idx = fsms.findIndex(f => f.id === body.stateMachine.id || f.entity === body.stateMachine.entity)
            if (idx !== -1) {
              fsms[idx] = { ...fsms[idx], ...body.stateMachine }
            } else {
              fsms.push(body.stateMachine)
            }
            writeJsonFile(fsmFile, fsms)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedStateMachine: body.stateMachine }))
            return
          }

          // 2.75 Mutar Diagrama UML en la Suite (14 diagramas)
          if (body.umlDiagram || body.umlDiagramId) {
            const umlPath = path.join(seqDir, 'uml-diagrams.json')
            let diags = readJsonFile(umlPath, [])
            const targetId = body.umlDiagram?.id || body.umlDiagramId
            const idx = diags.findIndex(d => d.id === targetId)
            if (idx !== -1) {
              const updated = { ...diags[idx], ...(body.umlDiagram || body) }
              diags[idx] = updated
              writeJsonFile(umlPath, diags)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, updatedUmlDiagram: updated }))
              return
            } else if (body.umlDiagram) {
              diags.push(body.umlDiagram)
              writeJsonFile(umlPath, diags)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, updatedUmlDiagram: body.umlDiagram }))
              return
            }
          }

          // 2.8 Mutaciones del Project Model v2
          if (body.product) {
            if (body.product.vision) writeJsonFile(path.join(productDir, 'vision.json'), body.product.vision)
            if (body.product.scope) writeJsonFile(path.join(productDir, 'scope.json'), body.product.scope)
            if (body.product.actors) writeJsonFile(path.join(productDir, 'actors.json'), body.product.actors)
            if (body.product.modules) writeJsonFile(path.join(productDir, 'modules.json'), body.product.modules)
          }

          // 2.8 Mutaciones atómicas de Entidades de Requisitos y Flujos
          if (body.businessRule) {
            const brFile = path.join(reqDir, 'business-rules.json')
            let rules = readJsonFile(brFile, [])
            if (!Array.isArray(rules)) rules = []
            const normalized = normalizeBusinessRule(body.businessRule, rules.length)
            const idx = rules.findIndex(r => r.id === normalized.id || (r.code && r.code === normalized.code))
            if (idx !== -1) {
              rules[idx] = { ...rules[idx], ...normalized }
            } else {
              rules.push(normalized)
            }
            writeJsonFile(brFile, rules)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedBusinessRule: normalized, businessRules: rules }))
            return
          }

          if (body.deleteBusinessRuleId) {
            const brFile = path.join(reqDir, 'business-rules.json')
            let rules = readJsonFile(brFile, [])
            if (Array.isArray(rules)) {
              rules = rules.filter(r => r.id !== body.deleteBusinessRuleId && r.code !== body.deleteBusinessRuleId)
              writeJsonFile(brFile, rules)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedBusinessRuleId: body.deleteBusinessRuleId, businessRules: rules }))
            return
          }

          if (body.userFlow) {
            const ufFile = path.join(flowsDir, 'user-flows.json')
            let ufs = readJsonFile(ufFile, [])
            if (!Array.isArray(ufs)) ufs = []
            const normalized = normalizeUserFlow(body.userFlow, ufs.length)
            const idx = ufs.findIndex(u => u.id === normalized.id)
            if (idx !== -1) {
              ufs[idx] = { ...ufs[idx], ...normalized }
            } else {
              ufs.push(normalized)
            }
            writeJsonFile(ufFile, ufs)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedUserFlow: normalized, userFlows: ufs }))
            return
          }

          if (body.deleteUserFlowId) {
            const ufFile = path.join(flowsDir, 'user-flows.json')
            let ufs = readJsonFile(ufFile, [])
            if (Array.isArray(ufs)) {
              ufs = ufs.filter(u => u.id !== body.deleteUserFlowId)
              writeJsonFile(ufFile, ufs)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedUserFlowId: body.deleteUserFlowId, userFlows: ufs }))
            return
          }

          if (body.businessFlow) {
            const bfFile = path.join(flowsDir, 'business-flows.json')
            let bfs = readJsonFile(bfFile, [])
            if (!Array.isArray(bfs)) bfs = []
            const normalized = normalizeBusinessFlow(body.businessFlow, bfs.length)
            const idx = bfs.findIndex(b => b.id === normalized.id)
            if (idx !== -1) {
              bfs[idx] = { ...bfs[idx], ...normalized }
            } else {
              bfs.push(normalized)
            }
            writeJsonFile(bfFile, bfs)
            writeJsonFile(path.join(flowsDir, `${normalized.id}.json`), normalized)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedBusinessFlow: normalized, businessFlows: bfs }))
            return
          }

          if (body.deleteBusinessFlowId) {
            const bfFile = path.join(flowsDir, 'business-flows.json')
            let bfs = readJsonFile(bfFile, [])
            if (Array.isArray(bfs)) {
              bfs = bfs.filter(b => b.id !== body.deleteBusinessFlowId)
              writeJsonFile(bfFile, bfs)
            }
            const indFile = path.join(flowsDir, `${body.deleteBusinessFlowId}.json`)
            if (fs.existsSync(indFile)) {
              try { fs.unlinkSync(indFile) } catch {}
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedBusinessFlowId: body.deleteBusinessFlowId, businessFlows: bfs }))
            return
          }

          if (body.epic) {
            const epicFile = path.join(reqDir, 'epics.json')
            let epics = readJsonFile(epicFile, [])
            if (!Array.isArray(epics)) epics = []
            const epic = {
              id: body.epic.id || `EPIC-${String(epics.length + 1).padStart(2, '0')}`,
              title: body.epic.title || body.epic.name || 'Nueva Épica',
              description: body.epic.description || '',
              moduleId: body.epic.moduleId || 'mod-1',
              priority: body.epic.priority || 'P1',
              status: body.epic.status || 'planned',
              storyIds: Array.isArray(body.epic.storyIds) ? body.epic.storyIds : []
            }
            const idx = epics.findIndex(e => e.id === epic.id)
            if (idx !== -1) {
              epics[idx] = { ...epics[idx], ...epic }
            } else {
              epics.push(epic)
            }
            writeJsonFile(epicFile, epics)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedEpic: epic, epics }))
            return
          }

          if (body.deleteEpicId) {
            const epicFile = path.join(reqDir, 'epics.json')
            let epics = readJsonFile(epicFile, [])
            if (Array.isArray(epics)) {
              epics = epics.filter(e => e.id !== body.deleteEpicId)
              writeJsonFile(epicFile, epics)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedEpicId: body.deleteEpicId, epics }))
            return
          }

          if (body.flows) {
            if (Array.isArray(body.flows.userFlows)) {
              writeJsonFile(path.join(flowsDir, 'user-flows.json'), body.flows.userFlows.map(normalizeUserFlow))
            }
            if (Array.isArray(body.flows.businessFlows)) {
              writeJsonFile(path.join(flowsDir, 'business-flows.json'), body.flows.businessFlows.map(normalizeBusinessFlow))
            }
          }

          if (body.businessRules) {
            writeJsonFile(path.join(reqDir, 'business-rules.json'), body.businessRules.map(normalizeBusinessRule))
          }

          if (body.stack) {
            const stackFile = path.join(archDir, 'stack.json')
            const existingStack = readJsonFile(stackFile, {})
            const updated = normalizeTechStack({ ...existingStack, ...body.stack })
            writeJsonFile(stackFile, updated)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedStack: updated, stack: updated }))
            return
          }

          if (body.endpoint) {
            const epFile = path.join(apiDir, 'endpoints.json')
            let endpoints = readJsonFile(epFile, [])
            if (!Array.isArray(endpoints)) endpoints = []
            const normalized = normalizeEndpoint(body.endpoint, endpoints.length)
            const idx = endpoints.findIndex(e => e.id === normalized.id || (e.method === normalized.method && e.path === normalized.path))
            if (idx !== -1) {
              endpoints[idx] = { ...endpoints[idx], ...normalized }
            } else {
              endpoints.push(normalized)
            }
            writeJsonFile(epFile, endpoints)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedEndpoint: normalized, endpoints }))
            return
          }

          if (body.deleteEndpointId) {
            const epFile = path.join(apiDir, 'endpoints.json')
            let endpoints = readJsonFile(epFile, [])
            if (Array.isArray(endpoints)) {
              endpoints = endpoints.filter(e => e.id !== body.deleteEndpointId)
              writeJsonFile(epFile, endpoints)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedEndpointId: body.deleteEndpointId, endpoints }))
            return
          }

          if (body.contract) {
            const cFile = path.join(apiDir, 'contracts.json')
            let contracts = readJsonFile(cFile, [])
            if (!Array.isArray(contracts)) contracts = []
            const normalized = normalizeApiContract(body.contract, contracts.length)
            const idx = contracts.findIndex(c => c.id === normalized.id || c.name === normalized.name)
            if (idx !== -1) {
              contracts[idx] = { ...contracts[idx], ...normalized }
            } else {
              contracts.push(normalized)
            }
            writeJsonFile(cFile, contracts)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedContract: normalized, contracts }))
            return
          }

          if (body.deleteContractId) {
            const cFile = path.join(apiDir, 'contracts.json')
            let contracts = readJsonFile(cFile, [])
            if (Array.isArray(contracts)) {
              contracts = contracts.filter(c => c.id !== body.deleteContractId && c.name !== body.deleteContractId)
              writeJsonFile(cFile, contracts)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedContractId: body.deleteContractId, contracts }))
            return
          }

          if (body.table) {
            const schemaFile = path.join(dbDir, 'schema-erd.json')
            let erd = readJsonFile(schemaFile, { tables: [] })
            let tables = Array.isArray(erd.tables) ? erd.tables : (Array.isArray(erd) ? erd : [])
            const normalized = normalizeDatabaseTable(body.table, tables.length)
            const idx = tables.findIndex(t => t.id === normalized.id || t.table === normalized.table)
            if (idx !== -1) {
              tables[idx] = { ...tables[idx], ...normalized }
            } else {
              tables.push(normalized)
            }
            if (Array.isArray(erd)) erd = tables
            else erd.tables = tables
            writeJsonFile(schemaFile, erd)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedTable: normalized, tables }))
            return
          }

          if (body.deleteTableId) {
            const schemaFile = path.join(dbDir, 'schema-erd.json')
            let erd = readJsonFile(schemaFile, { tables: [] })
            let tables = Array.isArray(erd.tables) ? erd.tables : (Array.isArray(erd) ? erd : [])
            tables = tables.filter(t => t.id !== body.deleteTableId && t.table !== body.deleteTableId)
            if (Array.isArray(erd)) erd = tables
            else erd.tables = tables
            writeJsonFile(schemaFile, erd)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedTableId: body.deleteTableId, tables }))
            return
          }

          if (body.relationship) {
            const relFile = path.join(dbDir, 'relationships.json')
            let rels = readJsonFile(relFile, [])
            if (!Array.isArray(rels)) rels = []
            const normalized = normalizeDatabaseRelationship(body.relationship, rels.length)
            const idx = rels.findIndex(r => r.id === normalized.id || (r.fromTable === normalized.fromTable && r.toTable === normalized.toTable))
            if (idx !== -1) {
              rels[idx] = { ...rels[idx], ...normalized }
            } else {
              rels.push(normalized)
            }
            writeJsonFile(relFile, rels)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedRelationship: normalized, relationships: rels }))
            return
          }

          if (body.deleteRelationshipId) {
            const relFile = path.join(dbDir, 'relationships.json')
            let rels = readJsonFile(relFile, [])
            if (Array.isArray(rels)) {
              rels = rels.filter(r => r.id !== body.deleteRelationshipId)
              writeJsonFile(relFile, rels)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedRelationshipId: body.deleteRelationshipId, relationships: rels }))
            return
          }

          if (body.screen) {
            const scFile = path.join(uiDir, 'screens.json')
            let screens = readJsonFile(scFile, [])
            if (!Array.isArray(screens)) screens = []
            const normalized = normalizeScreen(body.screen, screens.length)
            const idx = screens.findIndex(s => s.id === normalized.id || s.route === normalized.route)
            if (idx !== -1) {
              screens[idx] = { ...screens[idx], ...normalized }
            } else {
              screens.push(normalized)
            }
            writeJsonFile(scFile, screens)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedScreen: normalized, screens }))
            return
          }

          if (body.deleteScreenId) {
            const scFile = path.join(uiDir, 'screens.json')
            let screens = readJsonFile(scFile, [])
            if (Array.isArray(screens)) {
              screens = screens.filter(s => s.id !== body.deleteScreenId && s.route !== body.deleteScreenId)
              writeJsonFile(scFile, screens)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedScreenId: body.deleteScreenId, screens }))
            return
          }

          if (body.wireframe) {
            const wfFile = path.join(uiDir, 'wireframes.json')
            let wireframes = readJsonFile(wfFile, [])
            if (!Array.isArray(wireframes)) wireframes = []
            const normalized = normalizeWireframe(body.wireframe, wireframes.length)
            const idx = wireframes.findIndex(w => w.id === normalized.id)
            if (idx !== -1) {
              wireframes[idx] = { ...wireframes[idx], ...normalized }
            } else {
              wireframes.push(normalized)
            }
            writeJsonFile(wfFile, wireframes)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedWireframe: normalized, wireframes }))
            return
          }

          if (body.deleteWireframeId) {
            const wfFile = path.join(uiDir, 'wireframes.json')
            let wireframes = readJsonFile(wfFile, [])
            if (Array.isArray(wireframes)) {
              wireframes = wireframes.filter(w => w.id !== body.deleteWireframeId)
              writeJsonFile(wfFile, wireframes)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deletedWireframeId: body.deleteWireframeId, wireframes }))
            return
          }

          if (body.designSystem) {
            const dsFile = path.join(uiDir, 'design-system.json')
            const existing = readJsonFile(dsFile, {})
            const updated = normalizeDesignSystem({ ...existing, ...body.designSystem })
            writeJsonFile(dsFile, updated)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, updatedDesignSystem: updated, designSystem: updated }))
            return
          }

          if (body.uiUx) {
            if (body.uiUx.screens) writeJsonFile(path.join(uiDir, 'screens.json'), body.uiUx.screens.map(normalizeScreen))
            if (body.uiUx.wireframes) writeJsonFile(path.join(uiDir, 'wireframes.json'), body.uiUx.wireframes.map(normalizeWireframe))
            if (body.uiUx.designSystem) writeJsonFile(path.join(uiDir, 'design-system.json'), normalizeDesignSystem(body.uiUx.designSystem))
            if (body.uiUx.components) writeJsonFile(path.join(uiDir, 'components.json'), body.uiUx.components)
          }

          if (body.api) {
            if (body.api.endpoints) writeJsonFile(path.join(apiDir, 'endpoints.json'), body.api.endpoints.map(normalizeEndpoint))
            if (body.api.contracts) writeJsonFile(path.join(apiDir, 'contracts.json'), body.api.contracts.map(normalizeApiContract))
          }

          if (body.database) {
            if (body.database.tables) writeJsonFile(path.join(dbDir, 'schema-erd.json'), { tables: body.database.tables.map(normalizeDatabaseTable) })
            if (body.database.relationships) writeJsonFile(path.join(dbDir, 'relationships.json'), body.database.relationships.map(normalizeDatabaseRelationship))
          }

          let touchedModel = false
          const resultPayload = { success: true }

          if (body.phase) {
            const phFile = path.join(execDir, 'phases.json')
            let phases = readJsonFile(phFile, [])
            if (!Array.isArray(phases)) phases = []
            const normalized = normalizeExecutionPhase(body.phase, phases.length)
            const idx = phases.findIndex(p => p.id === normalized.id)
            if (idx !== -1) {
              phases[idx] = { ...phases[idx], ...normalized }
            } else {
              phases.push(normalized)
            }
            writeJsonFile(phFile, phases)
            resultPayload.updatedPhase = normalized
            resultPayload.phases = phases
            touchedModel = true
          }

          if (body.deletePhaseId) {
            const phFile = path.join(execDir, 'phases.json')
            let phases = readJsonFile(phFile, [])
            if (Array.isArray(phases)) {
              phases = phases.filter(p => p.id !== body.deletePhaseId)
              writeJsonFile(phFile, phases)
            }
            resultPayload.deletedPhaseId = body.deletePhaseId
            resultPayload.phases = phases
            touchedModel = true
          }

          if (body.task) {
            const tFile = path.join(execDir, 'tasks.json')
            let tasks = readJsonFile(tFile, [])
            if (!Array.isArray(tasks)) tasks = []
            const normalized = normalizeExecutionTask(body.task, tasks.length)
            const idx = tasks.findIndex(t => t.id === normalized.id)
            if (idx !== -1) {
              tasks[idx] = { ...tasks[idx], ...normalized }
            } else {
              tasks.push(normalized)
            }
            writeJsonFile(tFile, tasks)

            // Actualizar dependencias si aplica
            const dFile = path.join(execDir, 'dependencies.json')
            const existingDeps = readJsonFile(dFile, {})
            const updatedDeps = normalizeDependencyGraph(existingDeps, tasks)
            writeJsonFile(dFile, updatedDeps)

            resultPayload.updatedTask = normalized
            resultPayload.tasks = tasks
            touchedModel = true
          }

          if (body.deleteTaskId) {
            const tFile = path.join(execDir, 'tasks.json')
            let tasks = readJsonFile(tFile, [])
            if (Array.isArray(tasks)) {
              tasks = tasks.filter(t => t.id !== body.deleteTaskId)
              writeJsonFile(tFile, tasks)
            }
            resultPayload.deletedTaskId = body.deleteTaskId
            resultPayload.tasks = tasks
            touchedModel = true
          }

          if (body.dependencies) {
            const dFile = path.join(execDir, 'dependencies.json')
            const tasks = readJsonFile(path.join(execDir, 'tasks.json'), [])
            const updated = normalizeDependencyGraph(body.dependencies, tasks)
            writeJsonFile(dFile, updated)
            resultPayload.updatedDependencies = updated
            touchedModel = true
          }

          if (body.qualityGate) {
            const gFile = path.join(govDir, 'quality-gates.json')
            let gates = readJsonFile(gFile, [])
            if (!Array.isArray(gates)) gates = []
            const normalized = normalizeQualityGate(body.qualityGate, gates.length)
            const idx = gates.findIndex(g => g.id === normalized.id)
            if (idx !== -1) {
              gates[idx] = { ...gates[idx], ...normalized }
            } else {
              gates.push(normalized)
            }
            writeJsonFile(gFile, gates)
            resultPayload.updatedGate = normalized
            resultPayload.qualityGates = gates
            touchedModel = true
          }

          if (touchedModel) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(resultPayload))
            return
          }

          if (body.dispatchTaskId || body.activateTaskId) {
            const targetId = body.dispatchTaskId || body.activateTaskId
            const result = dispatchTaskToAgent(projectRoot, targetId, body.assignedTo || 'Antigravity')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(result))
            return
          }

          if (body.completeTaskId) {
            const result = completeTaskAndAdvance(projectRoot, body.completeTaskId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(result))
            return
          }

          if (body.execution) {
            if (body.execution.tasks) writeJsonFile(path.join(execDir, 'tasks.json'), body.execution.tasks)
            if (body.execution.phases) writeJsonFile(path.join(execDir, 'phases.json'), body.execution.phases)
          }

          if (body.governance?.qualityGates) {
            writeJsonFile(path.join(govDir, 'quality-gates.json'), body.governance.qualityGates)
          }

          if (body.stage || body.progress !== undefined) {
            const projFile = path.join(sddDir, 'project.json')
            const proj = readJsonFile(projFile, {})
            if (body.stage) proj.stage = body.stage
            if (body.progress !== undefined) proj.progress = body.progress
            if (body.completedStages) proj.completedStages = body.completedStages
            proj.lastUpdated = new Date().toISOString()
            writeJsonFile(projFile, proj)
          }

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, message: 'Operación procesada con éxito en Project Model v2' }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3. Rescan POST /api/sdd/scan
    if (url.pathname === '/api/sdd/scan' && req.method === 'POST') {
      const scanResults = scanProject(projectRoot)
      if (scanResults.detectedScreens && scanResults.detectedScreens.length > 0) {
        const existing = readJsonFile(path.join(uiDir, 'screens.json'), [])
        if (!existing || existing.length === 0) {
          writeJsonFile(path.join(uiDir, 'screens.json'), scanResults.detectedScreens)
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, scanResults }))
      return
    }

    // 3.05 Rescan UI/UX Views POST /api/uiux/rescan
    if (url.pathname === '/api/uiux/rescan' && req.method === 'POST') {
      const existing = readJsonFile(path.join(uiDir, 'screens.json'), [])
      const detected = scanProjectViews(projectRoot)

      const merged = mergeDetectedScreens(detected, existing)
      writeJsonFile(path.join(uiDir, 'screens.json'), merged)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, count: merged.length, screens: merged }))
      return
    }

    // 3.055 Suite UML API GET /api/uml & POST /api/uml (14 Diagramas Oficiales OMG)
    if (url.pathname === '/api/uml' && req.method === 'GET') {
      const umlPath = path.join(seqDir, 'uml-diagrams.json')
      const diagrams = readJsonFile(umlPath, [])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        total: diagrams.length,
        structural: diagrams.filter(d => d.category === 'structural'),
        behavioral: diagrams.filter(d => d.category === 'behavioral'),
        diagrams
      }))
      return
    }

    if (url.pathname === '/api/uml' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const body = JSON.parse(bodyData || '{}')
          const umlPath = path.join(seqDir, 'uml-diagrams.json')
          let diagrams = readJsonFile(umlPath, [])
          const targetId = body.diagramId || body.id || body.diagram?.id
          if (targetId) {
            const idx = diagrams.findIndex(d => d.id === targetId)
            if (idx !== -1) {
              diagrams[idx] = { ...diagrams[idx], ...(body.diagram || body) }
              writeJsonFile(umlPath, diagrams)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, updatedDiagram: diagrams[idx] }))
              return
            }
          }
          if (body.diagram && body.diagram.name) {
            diagrams.push(body.diagram)
            writeJsonFile(umlPath, diagrams)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, diagram: body.diagram }))
            return
          }
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Especifique un diagramId o diagram válido' }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.06 Discover Business Flows with AI POST /api/flows/discover-ai (100% IA sobre código real)
    if (url.pathname === '/api/flows/discover-ai' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', async () => {
        try {
          const { apiKey, model } = JSON.parse(bodyData || '{}')
          const orConfig = getOpenRouterConfig(projectRoot)
          const effectiveKey = apiKey || orConfig.apiKey
          const effectiveModel = model || orConfig.defaultModel
          const result = await discoverFlowsWithAi({
            projectRoot,
            apiKey: effectiveKey,
            model: effectiveModel
          })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, ...result }))
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.07 Create Story Linked to Architecture Node POST /api/stories
    if (url.pathname === '/api/stories' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const {
            serviceId = 'core-app',
            title,
            type = 'feature',
            reproductionSteps = '',
            rootCause = '',
            role = 'usuario',
            action = 'ejecutar la funcionalidad correspondiente',
            benefit = 'cumplir con el objetivo del negocio',
            priority = 'P0',
            scopeFiles = [],
            acceptanceCriteria = [],
            epicId = 'EPIC-01',
            businessRuleIds = []
          } = JSON.parse(bodyData || '{}')

          if (!title || !title.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'El título de la tarea/historia es requerido' }))
            return
          }

          if (!fs.existsSync(storiesDir)) fs.mkdirSync(storiesDir, { recursive: true })
          if (!fs.existsSync(reqDir)) fs.mkdirSync(reqDir, { recursive: true })

          let maxId = 0
          const files = fs.readdirSync(storiesDir).filter(f => f.startsWith('US-') && f.endsWith('.json'))
          files.forEach(f => {
            const m = f.match(/US-(\d+)\.json/)
            if (m) {
              const num = parseInt(m[1], 10)
              if (num > maxId) maxId = num
            }
          })
          const nextNum = maxId + 1
          const storyId = `US-${String(nextNum).padStart(3, '0')}`

          const criteria = Array.isArray(acceptanceCriteria) && acceptanceCriteria.length > 0
            ? acceptanceCriteria.map((c, i) => ({
                id: c.id || `c-${i + 1}`,
                scenario: c.scenario || 'Criterio de verificación',
                given: c.given || 'el usuario en la aplicación',
                when: c.when || 'ejecuta la acción',
                then: c.then || 'el sistema responde con éxito',
                done: Boolean(c.done)
              }))
            : [
                {
                  id: 'c-1',
                  scenario: type === 'bug' ? 'Reproducción y verificación del fix' : 'Comportamiento esperado',
                  given: type === 'bug' ? 'el entorno con la condición que disparaba el bug' : 'el usuario en el sistema',
                  when: type === 'bug' ? `se ejecuta el fix para "${title.trim()}"` : `ejecuta la tarea "${title.trim()}"`,
                  then: type === 'bug' ? 'el error ya no ocurre y no se introducen regresiones' : 'el sistema responde de forma exitosa y sin regresiones',
                  done: false
                }
              ]

          const newStory = {
            id: storyId,
            type: type || 'feature', // 'feature' | 'bug'
            reproductionSteps: reproductionSteps || '',
            rootCause: rootCause || '',
            epicId: epicId || 'EPIC-01',
            serviceId: serviceId || 'core-app',
            title: title.trim(),
            role: role.trim(),
            action: action.trim(),
            benefit: benefit.trim(),
            points: 3,
            priority: priority || 'P0',
            status: 'backlog',
            progress: 0,
            origin: 'workbench',
            createdAt: new Date().toISOString(),
            scopeFiles: Array.isArray(scopeFiles) && scopeFiles.length > 0 ? scopeFiles : ['src/**', 'app/**'],
            businessRuleIds: Array.isArray(businessRuleIds) ? businessRuleIds : [],
            acceptanceCriteria: criteria
          }

          // Guardar archivo individual atómico
          writeJsonFile(path.join(storiesDir, `${storyId}.json`), newStory)

          // Actualizar archivo agrupado user-stories.json
          const sPath = path.join(reqDir, 'user-stories.json')
          let allStories = readJsonFile(sPath, [])
          if (!Array.isArray(allStories)) allStories = []
          allStories.push(newStory)
          writeJsonFile(sPath, allStories)

          console.log(`\n📋 [NUEVA_TAREA_CREADA]: ${storyId} ("${newStory.title}") en componente "${serviceId}"`)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, story: newStory }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.08 Dispatch Story to Agent POST /api/stories/dispatch
    if (url.pathname === '/api/stories/dispatch' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const { storyId, assignedTo = 'Antigravity' } = JSON.parse(bodyData || '{}')
          if (!storyId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'storyId es requerido' }))
            return
          }

          const storyFile = path.join(storiesDir, `${storyId}.json`)
          let story = readJsonFile(storyFile)
          if (!story) {
            const sPath = path.join(reqDir, 'user-stories.json')
            const arr = readJsonFile(sPath, [])
            story = arr.find(s => s.id === storyId)
          }

          if (!story) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `Historia ${storyId} no encontrada` }))
            return
          }

          story.status = 'in_progress'
          story.assignedTo = assignedTo
          story.dispatchedAt = new Date().toISOString()
          writeJsonFile(storyFile, story)

          // Actualizar en user-stories.json
          const sPath = path.join(reqDir, 'user-stories.json')
          if (fs.existsSync(sPath)) {
            const arr = readJsonFile(sPath, [])
            const idx = arr.findIndex(s => s.id === storyId)
            if (idx !== -1) {
              arr[idx] = story
              writeJsonFile(sPath, arr)
            }
          }

          // Escribir active_task.json para consumo del Agente
          const activeTask = {
            taskId: `task-${story.id}-${Date.now()}`,
            storyId: story.id,
            serviceId: story.serviceId,
            title: story.title,
            assignedTo: assignedTo,
            status: 'in_progress',
            scopeFiles: story.scopeFiles,
            acceptanceCriteria: story.acceptanceCriteria,
            dispatchedAt: story.dispatchedAt,
            projectRoot: projectRoot,
            instruction: `Antigravity Agent, tienes asignada la tarea ${story.id}: "${story.title}". Modifica ÚNICAMENTE los archivos en scopeFiles y verifica los criterios Dado-Cuando-Entonces.`
          }
          writeJsonFile(path.join(sddDir, 'active_task.json'), activeTask)

          console.log(`\n🔔 [SDD_AGENT_TASK_ORDER]`)
          console.log(`STORY: ${story.id} — "${story.title}"`)
          console.log(`COMPONENTE: ${story.serviceId || 'core-app'}`)
          console.log(`ASSIGNED_TO: ${assignedTo}`)
          console.log(`SCOPE_FILES: ${(story.scopeFiles || []).join(', ')}`)
          console.log(`CRITERIA: ${(story.acceptanceCriteria || []).length} escenarios Gherkin`)
          console.log(`STATUS: IN_PROGRESS\n`)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, story, activeTask }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.08b Dispatch Execution Task to Agent POST /api/tasks/dispatch
    if (url.pathname === '/api/tasks/dispatch' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const { taskId, assignedTo = 'Antigravity' } = JSON.parse(bodyData || '{}')
          if (!taskId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'taskId es requerido' }))
            return
          }
          const result = dispatchTaskToAgent(projectRoot, taskId, assignedTo)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (err) {
          res.writeHead(err.message.includes('bloqueada') ? 409 : 500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.08c Complete Execution Task POST /api/tasks/complete
    if (url.pathname === '/api/tasks/complete' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const { taskId } = JSON.parse(bodyData || '{}')
          if (!taskId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'taskId es requerido' }))
            return
          }
          const result = completeTaskAndAdvance(projectRoot, taskId)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.09 Deep Brownfield Reverse Engineering with AI POST /api/sdd/reverse-engineer
    if (url.pathname === '/api/sdd/reverse-engineer' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', async () => {
        try {
          const { apiKey, model } = JSON.parse(bodyData || '{}')
          const orConfig = getOpenRouterConfig(projectRoot)
          const effectiveKey = apiKey || orConfig.apiKey
          const effectiveModel = model || orConfig.defaultModel
          const result = await reverseEngineerProjectWithAi({
            projectRoot,
            apiKey: effectiveKey,
            model: effectiveModel
          })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, ...result }))
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.095 Sync Multi-IDE Rules POST /api/sdd/sync-rules
    if (url.pathname === '/api/sdd/sync-rules' && req.method === 'POST') {
      try {
        const filesWritten = generateMultiIdeRules(projectRoot, sddDir)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          message: 'Reglas Multi-IDE sincronizadas exitosamente.',
          filesWritten
        }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
      return
    }

    // 3.096 Audit Convergence POST /api/sdd/converge
    if (url.pathname === '/api/sdd/converge' && req.method === 'POST') {
      try {
        const convergence = calculateConvergence(projectRoot, sddDir)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, convergence }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
      return
    }

    // 3.1 Genesis Synthesize POST /api/genesis/synthesize (Impulsado 100% por OpenRouter AI)
    if (url.pathname === '/api/genesis/synthesize' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', async () => {
        try {
          const { idea, apiKey, model } = JSON.parse(bodyData || '{}')
          const orConfig = getOpenRouterConfig(projectRoot)
          const effectiveKey = apiKey || orConfig.apiKey
          const effectiveModel = model || orConfig.defaultModel
          const result = await processGenesisChat(
            [{ role: 'user', content: idea || '' }],
            null,
            { apiKey: effectiveKey, model: effectiveModel }
          )
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, preview: result.preview, reply: result.reply, tokens: result.tokens }))
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.2 Genesis Scaffold POST /api/genesis/scaffold
    if (url.pathname === '/api/genesis/scaffold' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const { genesisPayload } = JSON.parse(bodyData)
          const result = scaffoldGenesis(projectRoot, genesisPayload)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, result }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.3 Genesis Chat POST /api/genesis/chat
    if (url.pathname === '/api/genesis/chat' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', async () => {
        try {
          const { messages, currentPreview, apiKey, model, stage, phase } = JSON.parse(bodyData || '{}')
          const orConfig = getOpenRouterConfig(projectRoot)
          const effectiveKey = apiKey || orConfig.apiKey
          const effectiveModel = model || orConfig.defaultModel
          const chatResult = await processGenesisChat(messages, currentPreview, {
            apiKey: effectiveKey,
            model: effectiveModel,
            stage,
            phase
          })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, ...chatResult }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.32 Genesis Stage Advance POST /api/genesis/stage-advance
    if (url.pathname === '/api/genesis/stage-advance' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const { stage, stageData } = JSON.parse(bodyData || '{}')
          const result = persistGenesisStage(projectRoot, stage, stageData)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, ...result }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.33 Genesis Impact Analysis POST /api/genesis/impact-analysis
    if (url.pathname === '/api/genesis/impact-analysis' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const { message, currentPreview } = JSON.parse(bodyData || '{}')
          const impact = analyzeImpact(message, currentPreview)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, impact }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.35 OpenRouter Config GET /api/openrouter/config
    if (url.pathname === '/api/openrouter/config' && req.method === 'GET') {
      const config = getOpenRouterConfig(projectRoot)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, ...config }))
      return
    }

    // 3.36 OpenRouter Config POST /api/openrouter/config
    if (url.pathname === '/api/openrouter/config' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', async () => {
        try {
          const { apiKey, model } = JSON.parse(bodyData || '{}')
          const configFile = path.join(sddDir, 'config.json')
          const existing = readJsonFile(configFile, {})
          let effectiveKey = apiKey !== undefined ? apiKey.trim() : existing.openrouterApiKey

          // Si la clave tiene formato sk-or-v1-..., validar si es de gestión y auto-generar clave chat válida
          if (effectiveKey && effectiveKey.startsWith('sk-or-v1-')) {
            try {
              const authRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
                headers: { 'Authorization': `Bearer ${effectiveKey}` }
              })
              if (authRes.ok) {
                const authData = await authRes.json()
                if (authData?.data?.is_management_key || authData?.data?.is_provisioning_key) {
                  const createRes = await fetch('https://openrouter.ai/api/v1/keys', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${effectiveKey}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: 'sdd-studio-chat-key' })
                  })
                  if (createRes.ok) {
                    const createData = await createRes.json()
                    if (createData?.key) {
                      effectiveKey = createData.key
                    }
                  }
                }
              }
            } catch (err) {
              console.warn('[OpenRouter Key Verification]:', err.message)
            }
          }

          if (effectiveKey !== undefined) existing.openrouterApiKey = effectiveKey
          if (model) existing.openrouterModel = model.trim()
          existing.lastUpdated = new Date().toISOString()
          writeJsonFile(configFile, existing)

          // Guardar también globalmente en ~/.sdd/config.json para todos los proyectos
          const globalConfigFile = getGlobalConfigFile()
          const existingGlobal = readJsonFile(globalConfigFile, {})
          if (effectiveKey !== undefined) existingGlobal.openrouterApiKey = effectiveKey
          if (model) existingGlobal.openrouterModel = model.trim()
          existingGlobal.lastUpdated = new Date().toISOString()
          writeJsonFile(globalConfigFile, existingGlobal)
          const updated = getOpenRouterConfig(projectRoot)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, message: 'Configuración de OpenRouter guardada con éxito', ...updated }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.4 Genesis Dispatch POST /api/genesis/dispatch (Alternativa B: Protocolo de Tareas hacia Antigravity)
    if (url.pathname === '/api/genesis/dispatch' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const { prompt, assignedTo } = JSON.parse(bodyData || '{}')
          if (!prompt || !prompt.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'El prompt o idea es requerido' }))
            return
          }

          const taskFile = path.join(sddDir, 'genesis_task.json')
          fs.mkdirSync(sddDir, { recursive: true })

          const task = {
            taskId: `genesis-task-${Date.now()}`,
            status: 'pending',
            prompt: prompt.trim(),
            assignedTo: assignedTo || 'Antigravity',
            createdAt: new Date().toISOString(),
            projectRoot: projectRoot,
            targetOutputs: [
              '.sdd/project.json',
              '.sdd/core/problem.json',
              '.sdd/core/target-user.json',
              '.sdd/core/scope-boundaries.json',
              '.sdd/core/success-criteria.json',
              '.sdd/core/risks.json',
              '.sdd/requirements/stories/*.json',
              '.sdd/architecture.json',
              '.sdd/database/schema-erd.json',
              '.sdd/flows/*.json',
              'AGENTS.md'
            ],
            notes: 'Orden de Génesis agéntica. Antigravity IDE (o el agente activo) lee esta orden, redacta la especificación con sus tokens y escribe los archivos en disco.'
          }

          writeJsonFile(taskFile, task)

          console.log(`\n🔔 [SDD_GENESIS_TASK_ALERT]`)
          console.log(`TASK_ID: ${task.taskId}`)
          console.log(`PROJECT_DIR: ${projectRoot}`)
          console.log(`USER_PROMPT: "${task.prompt}"`)
          console.log(`ACTION_REQUIRED: Antigravity Agent, por favor lee esta orden y genera la especificación SDD en ${projectRoot}.\n`)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, task }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 3.5 Genesis Task Status GET /api/genesis/task-status
    if (url.pathname === '/api/genesis/task-status' && req.method === 'GET') {
      try {
        const taskFile = path.join(sddDir, 'genesis_task.json')
        const taskExists = fs.existsSync(taskFile)
        const task = taskExists ? readJsonFile(taskFile) : null

        const projectFile = path.join(sddDir, 'project.json')
        const hasProject = fs.existsSync(projectFile)
        let storyCount = 0
        if (fs.existsSync(storiesDir)) {
          storyCount = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json')).length
        }
        if (storyCount === 0 && fs.existsSync(path.join(reqDir, 'user-stories.json'))) {
          const arr = readJsonFile(path.join(reqDir, 'user-stories.json'), [])
          storyCount = Array.isArray(arr) ? arr.length : 0
        }

        const isCompleted = task?.status === 'completed' || (hasProject && storyCount > 0 && task?.status !== 'pending')

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          exists: taskExists,
          task,
          ready: isCompleted,
          hasProject,
          storyCount,
          hasArchitecture: fs.existsSync(path.join(sddDir, 'architecture.json')),
          hasDatabase: fs.existsSync(path.join(dbDir, 'schema-erd.json'))
        }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
      return
    }

    // 3.6 Genesis Complete Task POST /api/genesis/complete-task
    if (url.pathname === '/api/genesis/complete-task' && req.method === 'POST') {
      let bodyData = ''
      req.on('data', chunk => { bodyData += chunk })
      req.on('end', () => {
        try {
          const taskFile = path.join(sddDir, 'genesis_task.json')
          let task = readJsonFile(taskFile, {})
          task.status = 'completed'
          task.completedAt = new Date().toISOString()
          task.completedBy = 'Antigravity'
          writeJsonFile(taskFile, task)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, task }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    // 4. Servir archivos estáticos de la UI
    let reqPath = url.pathname
    if (reqPath === '/') reqPath = '/index.html'

    const staticFile = path.join(UI_DIR, reqPath)
    if (fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
      const ext = path.extname(staticFile).toLowerCase()
      const mime = MIME_TYPES[ext] || 'application/octet-stream'
      const content = fs.readFileSync(staticFile)
      res.writeHead(200, { 'Content-Type': mime })
      res.end(content)
      return
    }

    // Fallback al index.html si existe
    const indexFile = path.join(UI_DIR, 'index.html')
    if (fs.existsSync(indexFile)) {
      const content = fs.readFileSync(indexFile)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(content)
      return
    }

    // Si aún no está la UI en ui/, entregar mensaje de bienvenida
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<h1>SDD Studio Microserver</h1><p>UI loading...</p>`)
  })

  function isPortAvailable(testPort) {
    return new Promise((resolve) => {
      const tester = net.createServer()
      tester.unref()
      tester.once('error', () => {
        resolve(false)
      })
      tester.once('listening', () => {
        tester.close(() => resolve(true))
      })
      tester.listen(testPort)
    })
  }

  async function findAvailablePort(startPort, maxAttempts = 30) {
    let p = startPort
    for (let i = 0; i < maxAttempts; i++) {
      const available = await isPortAvailable(p)
      if (available) return p
      p++
    }
    return startPort
  }

  return {
    start: async () => {
      const targetPort = Number(port) || 3030
      const boundPort = await findAvailablePort(targetPort)
      return new Promise((resolve, reject) => {
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.error(`\n❌ Error: El puerto ${boundPort} ya está en uso.`)
            console.error(`👉 Usa 'sdd studio --port <otro_puerto>' para elegir un puerto libre.\n`)
          } else {
            console.error(`\n❌ Error en el servidor SDD:`, err.message)
          }
          reject(err)
        })

        server.listen(boundPort, () => {
          console.log(`\n==================================================`)
          console.log(`⚡ SDD Studio iniciado en http://localhost:${boundPort}`)
          if (boundPort !== targetPort) {
            console.log(`ℹ️  Puerto original (${targetPort}) ocupado por otro proceso; asignado automáticamente puerto ${boundPort}`)
          }
          console.log(`📁 Repositorio: ${projectRoot}`)
          console.log(`🛡️  AGENTS.md y compuertas de calidad activos`)
          console.log(`==================================================\n`)
          resolve(boundPort)
        })
      })
    },
    close: () => server.close()
  }
}
