// SDD Studio — Agent Context Compiler, Quality Gates & Dynamic AGENTS.md Generator

import fs from 'fs'
import path from 'path'

function readJson(file, fallback = null) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    }
  } catch {}
  return fallback
}

function writeJson(file, data) {
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Compila el contexto agéntico unificado para consumo directo de LLMs / Agentes
 * y actualiza atómicamente .sdd/governance/agent-context.json, active_task.json y AGENTS.md.
 */
export function compileAgentContext(projectRoot, targetTaskId = null) {
  const sddDir = path.join(projectRoot, '.sdd')
  const execDir = path.join(sddDir, 'execution')
  const govDir = path.join(sddDir, 'governance')
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')
  const archDir = path.join(sddDir, 'architecture')
  const apiDir = path.join(sddDir, 'api')
  const dbDir = path.join(sddDir, 'database')
  const prodDir = path.join(sddDir, 'product')
  const coreDir = path.join(sddDir, 'core')

  const project = readJson(path.join(sddDir, 'project.json'), { name: path.basename(projectRoot) })
  const tasks = readJson(path.join(execDir, 'tasks.json'), [])
  const phases = readJson(path.join(execDir, 'phases.json'), [])
  const gates = readJson(path.join(govDir, 'quality-gates.json'), [])
  const businessRules = readJson(path.join(reqDir, 'business-rules.json'), [])
  const stack = readJson(path.join(archDir, 'stack.json'), {})
  const endpoints = readJson(path.join(apiDir, 'endpoints.json'), [])
  const erd = readJson(path.join(dbDir, 'schema-erd.json'), { tables: [] })
  const scope = readJson(path.join(prodDir, 'scope.json'), {})
  const boundaries = readJson(path.join(coreDir, 'scope-boundaries.json'), {})

  const explicitNonGoals = scope.explicitNonGoals || boundaries.explicitNonGoals || []
  const tables = Array.isArray(erd.tables) ? erd.tables : (Array.isArray(erd) ? erd : [])

  // 1. Identificar la tarea activa
  let activeTask = null
  if (targetTaskId) {
    activeTask = tasks.find(t => t.id === targetTaskId)
  }
  if (!activeTask) {
    activeTask = tasks.find(t => t.status === 'in_progress')
  }
  if (!activeTask) {
    // Buscar la primera tarea 'planned' cuyas dependencias estén resueltas
    activeTask = tasks.find(t => {
      if (t.status !== 'planned') return false
      const deps = Array.isArray(t.dependencies) ? t.dependencies : []
      return deps.every(depId => tasks.find(ot => ot.id === depId)?.status === 'done')
    })
  }

  // 2. Evaluar dependencias y bloqueos
  let isBlocked = false
  const blockers = []
  if (activeTask && Array.isArray(activeTask.dependencies)) {
    activeTask.dependencies.forEach(depId => {
      const depTask = tasks.find(t => t.id === depId)
      if (!depTask || depTask.status !== 'done') {
        isBlocked = true
        blockers.push({
          dependencyId: depId,
          title: depTask ? depTask.title : 'Dependencia desconocida',
          status: depTask ? depTask.status : 'missing'
        })
      }
    })
  }

  // 3. Evaluar Quality Gate de la fase
  const phase = activeTask ? phases.find(p => p.id === activeTask.phaseId) : null
  const phaseGate = phase ? gates.find(g => g.id === phase.qualityGateId || g.stage === phase.id) : null
  const gateApproved = phaseGate ? phaseGate.status === 'approved' : true

  // 4. Enriquecer con historia de usuario y criterios si existen
  let linkedStory = null
  if (activeTask && activeTask.storyId) {
    const sFile = path.join(storiesDir, `${activeTask.storyId}.json`)
    linkedStory = readJson(sFile)
    if (!linkedStory) {
      const uStories = readJson(path.join(reqDir, 'user-stories.json'), [])
      linkedStory = uStories.find(s => s.id === activeTask.storyId)
    }
  }

  const acceptanceCriteria = (activeTask?.acceptanceCriteria && activeTask.acceptanceCriteria.length > 0)
    ? activeTask.acceptanceCriteria
    : (linkedStory?.acceptanceCriteria || [])

  const ruleIds = linkedStory?.businessRuleIds || activeTask?.businessRuleIds || []
  const linkedRules = businessRules.filter(r => ruleIds.includes(r.id) || ruleIds.includes(r.code))

  const linkedEndpoints = endpoints.filter(e => {
    return (e.relatedStoryIds && activeTask && e.relatedStoryIds.includes(activeTask.storyId)) ||
      (e.relatedRuleIds && linkedRules.some(r => e.relatedRuleIds.includes(r.id)))
  })

  // 5. Ensamblar contexto consolidado
  const compiledContext = {
    generatedAt: new Date().toISOString(),
    projectName: project.name || path.basename(projectRoot),
    stage: project.stage || 'execution',
    activeTask: activeTask ? {
      id: activeTask.id,
      title: activeTask.title,
      description: activeTask.description || '',
      storyId: activeTask.storyId || '',
      phaseId: activeTask.phaseId || (phase ? phase.id : 'phase-1'),
      phaseName: phase ? phase.name : 'Fase Activa',
      status: activeTask.status,
      assignedTo: activeTask.assignedTo || 'Antigravity',
      dispatchedAt: activeTask.dispatchedAt || null,
      scopeFiles: Array.isArray(activeTask.scopeFiles) && activeTask.scopeFiles.length > 0 ? activeTask.scopeFiles : (linkedStory?.scopeFiles || ['src/**']),
      acceptanceCriteria,
      dependencies: activeTask.dependencies || [],
      isBlocked,
      blockers,
      businessRules: linkedRules,
      endpoints: linkedEndpoints,
      databaseTables: tables.map(t => t.table || t.name)
    } : null,
    qualityGates: {
      phaseGateApproved: gateApproved,
      canAgentProceed: activeTask && !isBlocked
    },
    invariants: {
      scopeShieldEnforced: true,
      strictTypingRequired: true,
      explicitNonGoals
    },
    techStack: stack
  }

  // Persistir agent-context.json
  writeJson(path.join(govDir, 'agent-context.json'), compiledContext)

  // Sincronizar active_task.json
  if (activeTask && !isBlocked) {
    const activeTaskPayload = {
      taskId: activeTask.id,
      storyId: activeTask.storyId || '',
      phaseId: activeTask.phaseId || 'phase-1',
      title: activeTask.title,
      assignedTo: activeTask.assignedTo || 'Antigravity',
      status: activeTask.status,
      scopeFiles: compiledContext.activeTask.scopeFiles,
      acceptanceCriteria: compiledContext.activeTask.acceptanceCriteria,
      dispatchedAt: activeTask.dispatchedAt || new Date().toISOString(),
      projectRoot,
      instruction: `Antigravity Agent: modifica ÚNICAMENTE los archivos en scopeFiles y verifica los criterios Dado-Cuando-Entonces.`
    }
    writeJson(path.join(sddDir, 'active_task.json'), activeTaskPayload)
  }

  // Sincronizar AGENTS.md dinámicamente
  generateAgentsMarkdown(projectRoot, compiledContext.activeTask, explicitNonGoals)

  return compiledContext
}

/**
 * Regenera el archivo AGENTS.md en la raíz del proyecto
 * inyectando la tarea activa y el Escudo de Deriva (Scope Shield).
 */
export function generateAgentsMarkdown(projectRoot, activeTask = null, explicitNonGoals = []) {
  const agentsMdPath = path.join(projectRoot, 'AGENTS.md')
  const sddDir = path.join(projectRoot, '.sdd')
  const project = readJson(path.join(sddDir, 'project.json'), { name: path.basename(projectRoot) })

  const nonGoalsList = explicitNonGoals.length > 0
    ? explicitNonGoals.map(ng => `- 🚫 **${typeof ng === 'string' ? ng : ng.feature}:** ${ng.rationale || 'Congelado para V2'}`).join('\n')
    : '- Funcionalidades fuera de alcance congeladas para V2.'

  let activeTaskSection = `## 🎯 Tarea Activa en Ejecución\n- Ninguna tarea en curso. Consulta \`.sdd/execution/tasks.json\` o activa una tarea desde SDD Studio.\n`

  if (activeTask) {
    const scopeList = (activeTask.scopeFiles || ['src/**']).map(f => `  - \`${f}\``).join('\n')
    const criteriaList = (activeTask.acceptanceCriteria || []).length > 0
      ? activeTask.acceptanceCriteria.map(c => `  - [${c.done ? 'x' : ' '}] **${c.scenario || c.id || 'Escenario'}:** ${c.given ? `Dado ${c.given}, Cuando ${c.when}, Entonces ${c.then}` : (c.text || c.title || 'Criterio')}`).join('\n')
      : '  - Ningún criterio formal registrado aún.'

    activeTaskSection = `## 🎯 Tarea Activa en Ejecución (Active Task)
- **ID:** \`${activeTask.id}\`${activeTask.storyId ? ` (Historia vinculada: \`${activeTask.storyId}\`)` : ''}
- **Título:** **${activeTask.title}**
- **Fase:** \`${activeTask.phaseName || activeTask.phaseId}\`
- **Agente Asignado:** \`${activeTask.assignedTo || 'Antigravity'}\`
- **Estado:** \`${activeTask.status.toUpperCase()}\`

### 🛡️ Escudo de Deriva (Scope Shield) — Archivos Permitidos ÚNICAMENTE:
${scopeList}
> **REGLA ESTRICTA:** Queda terminantemente prohibido modificar o crear archivos fuera de esta lista blanca.

### 🧪 Criterios de Aceptación Gherkin (Dado-Cuando-Entonces):
${criteriaList}
`
  }

  const content = `# Protocolo SDD (Spec-Driven Development) — Proyecto: ${project.name || 'sdd'}

Este proyecto se desarrolla bajo el protocolo **SDD Genesis**. La fuente de verdad única reside en \`.sdd/\`.
Cualquier agente de IA (Antigravity, Cursor, Windsurf, Claude Code, Copilot) DEBE acatar estrictamente las siguientes reglas:

${activeTaskSection}
## 📜 Constitución del Proyecto & Invariantes Técnicos
- [Code Quality] Tipado Estricto & Cero Dependencias Invasivas: El código debe ser modular, tipado y evitar librerías invasivas sin justificación explícita.
- [Testing & Convergence] Criterios Gherkin Ejecutables: Toda funcionalidad debe acompañarse de verificación de criterios Dado-Cuando-Entonces antes del cierre.
- [Scope Isolation] Escudo de Deriva (Scope Shield): Los agentes de IA tienen estrictamente prohibido modificar archivos fuera de los declarados en scopeFiles.
- [Architecture] Separación Limpia de Capas: La lógica de negocio debe residir en servicios desacoplados de la presentación visual y del transporte HTTP.
- [Security & Resilience] Manejo Defensivo de Datos & Secretos: Nunca quemar claves API o credenciales en código ni en artefactos expuestos al cliente.

## 🚫 Non-Goals Explícitos (Congelados para V1 - NO IMPLEMENTAR)
${nonGoalsList}

## 🤖 Directivas de Ejecución para Agentes de IA:
1. **Lectura Previa**: Consulta la historia o tarea activa en \`.sdd/active_task.json\` o \`.sdd/execution/tasks.json\` antes de escribir código.
2. **Escudo de Deriva (Scope Shield)**: Modifica ÚNICAMENTE los archivos declarados en \`scopeFiles\`. Cualquier cambio fuera de scope es rechazado por el sistema.
3. **Criterios Gherkin**: Verifica cada escenario Dado-Cuando-Entonces y marca \`"done": true\` en los criterios correspondientes.
4. **Bucle de Convergencia**: Asegura que el 100% de la especificación esté satisfecha sin romper invariantes ni introducir código muerto.
`

  fs.writeFileSync(agentsMdPath, content, 'utf-8')
  return content
}

/**
 * Despacha formalmente una tarea a un agente, asegurando que sus dependencias
 * estén resueltas y actualizando todo el entorno agéntico (.sdd y AGENTS.md).
 */
export function dispatchTaskToAgent(projectRoot, taskId, assignedTo = 'Antigravity') {
  const sddDir = path.join(projectRoot, '.sdd')
  const execDir = path.join(sddDir, 'execution')
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')

  const taskFile = path.join(execDir, 'tasks.json')
  let tasks = readJson(taskFile, [])
  const task = tasks.find(t => t.id === taskId)
  if (!task) {
    throw new Error(`Tarea "${taskId}" no encontrada en .sdd/execution/tasks.json`)
  }

  // Verificar dependencias
  if (Array.isArray(task.dependencies) && task.dependencies.length > 0) {
    const uncompleted = task.dependencies.filter(depId => {
      const dep = tasks.find(t => t.id === depId)
      return !dep || dep.status !== 'done'
    })
    if (uncompleted.length > 0) {
      throw new Error(`La tarea "${taskId}" está bloqueada por las dependencias pendientes: ${uncompleted.join(', ')}`)
    }
  }

  // Marcar en curso
  task.status = 'in_progress'
  task.assignedTo = assignedTo
  task.dispatchedAt = new Date().toISOString()
  writeJson(taskFile, tasks)

  // Si tiene historia vinculada, actualizarla también
  if (task.storyId) {
    const storyFile = path.join(storiesDir, `${task.storyId}.json`)
    const story = readJson(storyFile)
    if (story) {
      story.status = 'in_progress'
      story.assignedTo = assignedTo
      story.dispatchedAt = task.dispatchedAt
      writeJson(storyFile, story)
    }
  }

  // Compilar contexto y regenerar AGENTS.md
  const context = compileAgentContext(projectRoot, taskId)

  console.log(`\n⚡ [SDD_TASK_DISPATCHED]: ${task.id} ("${task.title}") -> ${assignedTo}`)
  console.log(`🛡️  Scope Shield: ${(task.scopeFiles || []).join(', ')}`)

  return {
    success: true,
    task,
    context
  }
}

/**
 * Marca una tarea como 'done', evalúa si la fase se completó para aprobar la compuerta,
 * y desbloquea la siguiente tarea disponible en el plan.
 */
export function completeTaskAndAdvance(projectRoot, taskId) {
  const sddDir = path.join(projectRoot, '.sdd')
  const execDir = path.join(sddDir, 'execution')
  const govDir = path.join(sddDir, 'governance')
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')

  const taskFile = path.join(execDir, 'tasks.json')
  const phaseFile = path.join(execDir, 'phases.json')
  const gatesFile = path.join(govDir, 'quality-gates.json')

  let tasks = readJson(taskFile, [])
  let phases = readJson(phaseFile, [])
  let gates = readJson(gatesFile, [])

  const task = tasks.find(t => t.id === taskId)
  if (!task) {
    throw new Error(`Tarea "${taskId}" no encontrada`)
  }

  task.status = 'done'
  task.completedAt = new Date().toISOString()
  if (Array.isArray(task.acceptanceCriteria)) {
    task.acceptanceCriteria.forEach(c => { c.done = true })
  }
  writeJson(taskFile, tasks)

  // Sincronizar historia vinculada si existe
  if (task.storyId) {
    const storyFile = path.join(storiesDir, `${task.storyId}.json`)
    const story = readJson(storyFile)
    if (story) {
      story.status = 'done'
      story.progress = 100
      if (Array.isArray(story.acceptanceCriteria)) {
        story.acceptanceCriteria.forEach(c => { c.done = true })
      }
      writeJson(storyFile, story)
    }
  }

  // Evaluar fase: si todas las tareas de la fase están done, marcar fase done y aprobar Quality Gate
  let phaseCompleted = false
  if (task.phaseId) {
    const phaseTasks = tasks.filter(t => t.phaseId === task.phaseId)
    if (phaseTasks.length > 0 && phaseTasks.every(t => t.status === 'done')) {
      const ph = phases.find(p => p.id === task.phaseId)
      if (ph) {
        ph.status = 'done'
        phaseCompleted = true
        writeJson(phaseFile, phases)

        let gate = gates.find(g => g.id === ph.qualityGateId || g.stage === ph.id || (ph.id && g.id.includes(ph.id)))
        if (!gate) {
          gate = {
            id: ph.qualityGateId || `gate-${ph.id}`,
            name: `Compuerta de Calidad: ${ph.name}`,
            stage: ph.id,
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: 'SDD Convergence Engine'
          }
          gates.push(gate)
        } else {
          gate.status = 'approved'
          gate.approvedAt = new Date().toISOString()
          gate.approvedBy = 'SDD Convergence Engine'
        }
        writeJson(gatesFile, gates)
      }
    }
  }

  // Buscar siguiente tarea elegible
  const nextTask = tasks.find(t => {
    if (t.status !== 'planned') return false
    const deps = Array.isArray(t.dependencies) ? t.dependencies : []
    return deps.every(depId => tasks.find(ot => ot.id === depId)?.status === 'done')
  })

  // Re-compilar contexto y actualizar AGENTS.md
  const context = compileAgentContext(projectRoot, nextTask ? nextTask.id : null)

  return {
    success: true,
    completedTaskId: taskId,
    phaseCompleted,
    nextTask: nextTask || null,
    context
  }
}
