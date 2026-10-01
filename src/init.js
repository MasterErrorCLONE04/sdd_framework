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

  // Create folder structure
  const subdirs = [
    'core',
    'discovery',
    'requirements',
    'requirements/stories',
    'flows',
    'database',
    'qa',
    'sequences',
    'ui-ux'
  ]

  for (const sub of subdirs) {
    const full = path.join(sddDir, sub)
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true })
    }
  }

  // 1. project.json
  const projectJsonPath = path.join(sddDir, 'project.json')
  if (!fs.existsSync(projectJsonPath)) {
    const projectName = path.basename(projectRoot) || 'New Project'
    const initialProject = {
      name: projectName,
      tagline: scanned?.framework ? `Proyecto ${scanned.framework} gobernado por SDD` : 'Especificación inicial del proyecto',
      purpose: 'comercial',
      depth: 'serio',
      version: '1.0.0',
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

  // 5. AGENTS.md rulebook
  if (!fs.existsSync(agentsMdPath)) {
    const agentsRuleContent = `# Protocolo SDD (Spec-Driven Development) — "Single Source of Truth"

El desarrollo, las especificaciones y las tareas de este proyecto se gestionan formalmente en \`.sdd/\`.
Cualquier agente de IA (Antigravity, Cursor, Windsurf, Claude Code, etc.) DEBE acatar estrictamente las siguientes reglas:

0. **Compuertas de Calidad & Non-Goals:**
   - Consulta \`.sdd/project.json\` para entender el propósito y la profundidad requerida.
   - Lee \`.sdd/core/scope-boundaries.json\`: NUNCA programes features listadas en \`explicitNonGoals\`.

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
