import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

/**
 * Servidor MCP (Model Context Protocol) sobre JSON-RPC 2.0 por stdio.
 * Provee herramientas nativas para Antigravity, Cursor, Windsurf y Claude Code.
 */
export function startMcpServer(projectRoot = process.cwd()) {
  const sddDir = path.join(projectRoot, '.sdd')
  const coreDir = path.join(sddDir, 'core')
  const reqDir = path.join(sddDir, 'requirements')
  const storiesDir = path.join(reqDir, 'stories')

  function readJson(p, fallback = null) {
    try {
      if (!fs.existsSync(p)) return fallback
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {
      return fallback
    }
  }

  function writeJson(p, data) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
      return true
    } catch {
      return false
    }
  }

  const TOOLS = [
    {
      name: 'sdd_get_project_context',
      description: 'Devuelve la Única Fuente de Verdad (Single Source of Truth) del proyecto: Propósito, Non-Goals explícitos de la V1 y Compuertas de Calidad.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'sdd_get_active_story',
      description: 'Devuelve la Historia de Usuario activa en desarrollo, sus criterios de aceptación en Gherkin (Dado-Cuando-Entonces) y la lista blanca de archivos permitidos (scopeFiles).',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: {
            type: 'string',
            description: 'ID de la historia (ej: US-001). Si se omite, devuelve la primera historia en progreso o en backlog.'
          }
        }
      }
    },
    {
      name: 'sdd_report_progress',
      description: 'Permite al agente reportar el avance de criterios Gherkin o finalizar una historia de usuario de forma atómica en disco.',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'string', description: 'ID de la historia de usuario (ej: US-001)' },
          criterionId: { type: 'string', description: 'ID del criterio Gherkin cumplido (ej: c-1)' },
          done: { type: 'boolean', description: 'true si el criterio fue cumplido' },
          status: { type: 'string', enum: ['in_progress', 'done'], description: 'Nuevo estado de la historia' },
          agentName: { type: 'string', description: 'Firma del agente (ej: Antigravity)' }
        },
        required: ['storyId']
      }
    },
    {
      name: 'sdd_verify_drift',
      description: 'Verifica en tiempo real si el agente ha modificado archivos fuera del alcance (Scope Shield) comparando git status contra los scopeFiles declarados.',
      inputSchema: {
        type: 'object',
        properties: {
          storyId: { type: 'string', description: 'ID de la historia activa para validar su scopeFiles' }
        }
      }
    },
    {
      name: 'sdd_check_quality_gates',
      description: 'Comprueba si las Compuertas de Calidad están aprobadas por el humano. Si hay compuertas bloqueadas, el agente tiene prohibido escribir código.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'sdd_get_pending_genesis_task',
      description: 'Lee la orden de génesis agéntica (.sdd/genesis_task.json) despachada por el usuario desde la web o terminal. Contiene la idea en bruto del usuario para que el agente redacte la especificación completa.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'sdd_complete_genesis_task',
      description: 'Marca la orden de génesis (.sdd/genesis_task.json) como completada tras haber escrito los archivos .sdd/ y AGENTS.md, indicando a la cabina web que abra la vista en vivo de 12 perspectivas.',
      inputSchema: {
        type: 'object',
        properties: {
          notes: { type: 'string', description: 'Notas de síntesis del agente sobre los archivos creados' }
        }
      }
    }
  ]

  async function handleToolCall(name, args) {
    switch (name) {
      case 'sdd_get_project_context': {
        const project = readJson(path.join(sddDir, 'project.json'), {})
        const problem = readJson(path.join(coreDir, 'problem.json'), {})
        const boundaries = readJson(path.join(coreDir, 'scope-boundaries.json'), {})
        const targetUsers = readJson(path.join(coreDir, 'target-user.json'), {})
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                project: {
                  name: project.name,
                  purpose: project.purpose,
                  depth: project.depth,
                  qualityGates: project.qualityGates
                },
                problem: problem.statement || problem.summary,
                explicitNonGoals: boundaries.explicitNonGoals || [],
                inScopeV1: boundaries.inScopeV1 || [],
                targetUsers: targetUsers.personas || []
              }, null, 2)
            }
          ]
        }
      }

      case 'sdd_get_active_story': {
        let stories = []
        if (fs.existsSync(storiesDir)) {
          const files = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json'))
          stories = files.map(f => readJson(path.join(storiesDir, f))).filter(Boolean)
        }
        let target = null
        if (args.storyId) {
          target = stories.find(s => s.id === args.storyId)
        } else {
          target = stories.find(s => s.status === 'in_progress') || stories.find(s => s.status === 'backlog') || stories[0]
        }

        if (!target) {
          return { content: [{ type: 'text', text: 'No se encontraron historias de usuario en .sdd/requirements/stories/' }] }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: target.id,
                title: target.title,
                priority: target.priority,
                status: target.status,
                role: target.role,
                action: target.action,
                benefit: target.benefit,
                scopeFiles: target.scopeFiles || [],
                acceptanceCriteria: target.acceptanceCriteria || []
              }, null, 2)
            }
          ]
        }
      }

      case 'sdd_report_progress': {
        const storyFile = path.join(storiesDir, `${args.storyId}.json`)
        const story = readJson(storyFile)
        if (!story) {
          return { isError: true, content: [{ type: 'text', text: `Historia ${args.storyId} no encontrada.` }] }
        }

        if (args.criterionId && story.acceptanceCriteria) {
          const c = story.acceptanceCriteria.find(item => item.id === args.criterionId)
          if (c) c.done = Boolean(args.done)
        }

        if (args.status) story.status = args.status
        if (args.agentName) story.assignedTo = args.agentName

        const total = story.acceptanceCriteria?.length || 0
        const doneCount = story.acceptanceCriteria?.filter(item => item.done).length || 0
        if (total > 0 && doneCount === total) story.status = 'done'
        else if (doneCount > 0) story.status = 'in_progress'

        writeJson(storyFile, story)
        return {
          content: [
            {
              type: 'text',
              text: `Progreso registrado con éxito en ${args.storyId}. Estado: ${story.status} (${doneCount}/${total} criterios completados).`
            }
          ]
        }
      }

      case 'sdd_verify_drift': {
        let declared = new Set()
        if (args.storyId) {
          const s = readJson(path.join(storiesDir, `${args.storyId}.json`))
          s?.scopeFiles?.forEach(f => declared.add(f.replace(/\\/g, '/')))
        } else {
          if (fs.existsSync(storiesDir)) {
            const files = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json'))
            files.forEach(f => {
              const s = readJson(path.join(storiesDir, f))
              s?.scopeFiles?.forEach(file => declared.add(file.replace(/\\/g, '/')))
            })
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
          // not a git repo
        }

        const inScope = []
        const outOfScope = []
        for (const file of modified) {
          const ok = Array.from(declared).some(d => file.startsWith(d) || d.startsWith(file))
          if (ok) inScope.push(file)
          else outOfScope.push(file)
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                isClean: outOfScope.length === 0,
                driftScore: modified.length === 0 ? 100 : Math.round((inScope.length / modified.length) * 100),
                totalModified: modified.length,
                inScope,
                outOfScope,
                warning: outOfScope.length > 0 ? `⚠️ ALERTA: Has modificado ${outOfScope.length} archivos fuera de la lista blanca scopeFiles. Viola la Regla 2 de AGENTS.md.` : '✓ Todo el código modificado está dentro del alcance permitido.'
              }, null, 2)
            }
          ]
        }
      }

      case 'sdd_check_quality_gates': {
        const project = readJson(path.join(sddDir, 'project.json'), {})
        const qg = project.qualityGates || {}
        let allPassed = true
        if (Array.isArray(qg)) {
          allPassed = qg.every(g => g.status === 'passed')
        } else {
          allPassed = Object.values(qg).every(v => v === true)
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                allGatesPassed: allPassed,
                gates: qg,
                canProceedToCode: allPassed,
                message: allPassed
                  ? '✓ Compuertas de Calidad Aprobadas. Tienes autorización para codificar.'
                  : '🛑 BLOQUEADO: Hay compuertas de calidad sin aprobar por el humano. Revisa .sdd/project.json antes de programar.'
              }, null, 2)
            }
          ]
        }
      }

      case 'sdd_get_pending_genesis_task': {
        const taskFile = path.join(sddDir, 'genesis_task.json')
        const task = readJson(taskFile)
        if (!task) {
          return { content: [{ type: 'text', text: JSON.stringify({ pending: false, message: 'No se encontró archivo de orden en .sdd/genesis_task.json' }) }] }
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(task, null, 2)
            }
          ]
        }
      }

      case 'sdd_complete_genesis_task': {
        const taskFile = path.join(sddDir, 'genesis_task.json')
        let task = readJson(taskFile, {})
        task.status = 'completed'
        task.completedAt = new Date().toISOString()
        task.completedBy = 'Antigravity'
        if (args.notes) task.notes = args.notes
        writeJson(taskFile, task)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: '✓ Orden Génesis completada con éxito. La cabina web detectará los cambios y se abrirá en vivo.',
                task
              }, null, 2)
            }
          ]
        }
      }

      default:
        throw new Error(`Tool no reconocida: ${name}`)
    }
  }

  // Escuchar JSON-RPC en stdin
  let buffer = ''
  process.stdin.setEncoding('utf-8')
  process.stdin.on('data', chunk => {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const req = JSON.parse(line)
        handleRpcRequest(req)
      } catch (err) {
        // ignore parse error
      }
    }
  })

  function sendResponse(id, result, error = null) {
    const payload = { jsonrpc: '2.0', id }
    if (error) payload.error = error
    else payload.result = result
    process.stdout.write(JSON.stringify(payload) + '\n')
  }

  async function handleRpcRequest(req) {
    const { id, method, params } = req

    if (method === 'initialize') {
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'sdd-mcp-server', version: '1.0.0' }
      })
      return
    }

    if (method === 'tools/list') {
      sendResponse(id, { tools: TOOLS })
      return
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params
      try {
        const result = await handleToolCall(name, args || {})
        sendResponse(id, result)
      } catch (err) {
        sendResponse(id, null, { code: -32603, message: err.message })
      }
      return
    }

    // Ping o desconocido
    if (method === 'ping') {
      sendResponse(id, {})
      return
    }

    sendResponse(id, null, { code: -32601, message: 'Método no soportado' })
  }
}
