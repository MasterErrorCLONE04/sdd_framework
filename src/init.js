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
