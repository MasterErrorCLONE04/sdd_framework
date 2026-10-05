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
    },
    {
      name: 'sdd_audit_convergence',
      description: 'Audita el grado de convergencia del proyecto: verifica cumplimiento del 100% de criterios Gherkin, archivos modificados en Git vs scopeFiles e invariantes constitucionales.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'sdd_get_flows',
      description: 'Devuelve los flujos bifurcados del sistema: User Flows (recorridos cognitivos de pantallas del usuario) y Business Flows (pipelines transaccionales del backend con nodos y dependencias).',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['all', 'user', 'business'],
            description: 'Filtro por tipo de flujo: "all" (ambos), "user" (rutas de usuario) o "business" (pipelines transaccionales).'
          },
          flowId: {
            type: 'string',
            description: 'ID opcional del flujo a consultar (ej: uf-01 o bf-01 o 01-flujo-principal).'
          }
        }
      }
    },
    {
      name: 'sdd_get_business_rules',
      description: 'Devuelve las Reglas de Negocio transversales del sistema (BR-001, etc.) y su mapeo con historias de usuario y servicios.',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filtrar por categoría (ej: "Business Logic", "Security", "Validation")'
          },
          enforcedAt: {
            type: 'string',
            enum: ['api', 'ui', 'db'],
            description: 'Filtrar por capa de ejecución ("api", "ui", "db")'
          },
          storyId: {
            type: 'string',
            description: 'Filtrar por ID de historia de usuario vinculada (ej: US-001)'
          }
        }
      }
    },
    {
      name: 'sdd_get_api_contracts',
      description: 'Devuelve la especificación de contratos de API: endpoints (método, ruta, actor, DTOs de request/response y reglas vinculadas) y modelos de datos DTO.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Filtro opcional por ruta (ej: /api/v1/users)' },
          method: { type: 'string', description: 'Filtro opcional por método HTTP (GET, POST, etc.)' },
          actor: { type: 'string', description: 'Filtro opcional por rol de usuario o actor' }
        }
      }
    },
    {
      name: 'sdd_get_database_schema',
      description: 'Devuelve el modelo entidad-relación (ERD) de base de datos: tablas con sus columnas, tipos, PK, FK y relaciones 1:1, 1:N o N:M.',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Nombre opcional de tabla para filtrar' }
        }
      }
    },
    {
      name: 'sdd_get_tech_stack',
      description: 'Devuelve el stack tecnológico formal del proyecto: Frontend, Backend, Base de Datos, Autenticación, ORM y Despliegue.',
      inputSchema: {
        type: 'object',
        properties: {}
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
        const constitution = readJson(path.join(coreDir, 'constitution.json'), { principles: [] })

        // Compatibilidad con Project Model v2
        const vision = readJson(path.join(sddDir, 'product', 'vision.json'), {})
        const scope = readJson(path.join(sddDir, 'product', 'scope.json'), {})
        const stack = readJson(path.join(sddDir, 'architecture', 'stack.json'), {})

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                project: {
                  name: project.name,
                  purpose: project.purpose,
                  depth: project.depth,
                  stage: project.stage || 'discovery',
                  progress: project.progress || 10,
                  completedStages: project.completedStages || [],
                  qualityGates: project.qualityGates
                },
                constitution: constitution.principles || [],
                problem: vision.problem || problem.statement || problem.summary || '',
                targetUsers: vision.targetAudience || targetUsers.personas || [],
                explicitNonGoals: scope.explicitNonGoals || boundaries.explicitNonGoals || [],
                inScopeV1: scope.inScopeV1 || boundaries.inScopeV1 || [],
                techStack: stack || {}
              }, null, 2)
            }
          ]
        }
      }

      case 'sdd_get_flows': {
        const flowsDir = path.join(sddDir, 'flows')
        const filterType = args?.type || 'all'
        let userFlows = readJson(path.join(flowsDir, 'user-flows.json'), [])
        if (!Array.isArray(userFlows)) userFlows = []

        let businessFlows = readJson(path.join(flowsDir, 'business-flows.json'), [])
        if (!Array.isArray(businessFlows)) businessFlows = []

        if (businessFlows.length === 0 && fs.existsSync(flowsDir)) {
          const files = fs.readdirSync(flowsDir).filter(f => f.endsWith('.json') && f !== 'user-flows.json' && f !== 'business-flows.json')
          businessFlows = files.map(f => readJson(path.join(flowsDir, f))).filter(Boolean)
        }

        if (args?.flowId) {
          const uMatch = userFlows.find(f => f.id === args.flowId)
          const bMatch = businessFlows.find(f => f.id === args.flowId)
          const match = uMatch ? { type: 'userFlow', flow: uMatch } : (bMatch ? { type: 'businessFlow', flow: bMatch } : null)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(match || { error: `Flujo "${args.flowId}" no encontrado en .sdd/flows/` }, null, 2)
              }
            ]
          }
        }

        const result = {}
        if (filterType === 'all' || filterType === 'user') {
          result.userFlows = userFlows
        }
        if (filterType === 'all' || filterType === 'business') {
          result.businessFlows = businessFlows
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      }

      case 'sdd_get_business_rules': {
        let rules = readJson(path.join(reqDir, 'business-rules.json'), [])
        if (!Array.isArray(rules)) rules = []

        if (args?.category) {
          rules = rules.filter(r => r.category && r.category.toLowerCase().includes(args.category.toLowerCase()))
        }
        if (args?.enforcedAt) {
          rules = rules.filter(r => Array.isArray(r.enforcedAt) && r.enforcedAt.includes(args.enforcedAt))
        }
        if (args?.storyId) {
          rules = rules.filter(r => Array.isArray(r.relatedStories) && r.relatedStories.includes(args.storyId))
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: rules.length,
                businessRules: rules
              }, null, 2)
            }
          ]
        }
      }

      case 'sdd_get_api_contracts': {
        const apiDir = path.join(sddDir, 'api')
        let endpoints = readJson(path.join(apiDir, 'endpoints.json'), [])
        let contracts = readJson(path.join(apiDir, 'contracts.json'), [])

        if (args?.method) {
          endpoints = endpoints.filter(e => (e.method || '').toUpperCase() === args.method.toUpperCase())
        }
        if (args?.path) {
          endpoints = endpoints.filter(e => (e.path || '').toLowerCase().includes(args.path.toLowerCase()))
        }
        if (args?.actor) {
          endpoints = endpoints.filter(e => (e.actor || '').toLowerCase().includes(args.actor.toLowerCase()))
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                endpointsCount: endpoints.length,
                endpoints,
                contractsCount: contracts.length,
                contracts
              }, null, 2)
            }
          ]
        }
      }

      case 'sdd_get_database_schema': {
        const dbDir = path.join(sddDir, 'database')
        const erd = readJson(path.join(dbDir, 'schema-erd.json'), { tables: [] })
        let tables = Array.isArray(erd.tables) ? erd.tables : (Array.isArray(erd) ? erd : [])
        let relationships = readJson(path.join(dbDir, 'relationships.json'), [])
        if ((!Array.isArray(relationships) || relationships.length === 0) && erd.relationships) {
          relationships = erd.relationships
        }

        if (args?.table) {
          tables = tables.filter(t => (t.table || t.name || '').toLowerCase() === args.table.toLowerCase())
          relationships = relationships.filter(r => 
            (r.fromTable || '').toLowerCase() === args.table.toLowerCase() ||
            (r.toTable || '').toLowerCase() === args.table.toLowerCase()
          )
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tablesCount: tables.length,
                tables,
                relationshipsCount: relationships.length,
                relationships
              }, null, 2)
            }
          ]
        }
      }

      case 'sdd_get_tech_stack': {
        const stack = readJson(path.join(sddDir, 'architecture', 'stack.json'), {})
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stack, null, 2)
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

      case 'sdd_audit_convergence': {
        let stories = []
        if (fs.existsSync(storiesDir)) {
          const files = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json'))
          stories = files.map(f => readJson(path.join(storiesDir, f))).filter(Boolean)
        }
        let total = 0, done = 0
        const pending = []
        stories.forEach(s => {
          (s.acceptanceCriteria || []).forEach(c => {
            total++
            if (c.done) done++
            else pending.push({ storyId: s.id, scenario: c.scenario })
          })
        })
        const criteriaScore = total > 0 ? Math.round((done / total) * 100) : 100
        const isConverged = criteriaScore === 100 && stories.length > 0
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: isConverged ? 'CONVERGED' : 'IN_PROGRESS',
                criteriaScore: `${criteriaScore}%`,
                totalCriteria: total,
                doneCriteria: done,
                pendingCount: pending.length,
                pendingDetails: pending.slice(0, 10),
                message: isConverged
                  ? '✓ Proyecto 100% convergido contra la especificación SDD.'
                  : `⚠️ Divergencia: faltan ${pending.length} criterios Gherkin por verificar.`
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
