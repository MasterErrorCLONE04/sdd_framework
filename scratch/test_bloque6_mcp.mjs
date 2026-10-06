// Test suite for Bloque 6 MCP Tools
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import assert from 'assert'
import { initializeSdd } from '../src/init.js'

const testDir = path.join(process.cwd(), 'scratch', 'test_env_mcp_' + Date.now())
fs.mkdirSync(testDir, { recursive: true })
initializeSdd(testDir, { name: 'McpTestProject' })

const mcpScript = path.join(process.cwd(), 'bin', 'sdd.js')

const mcpProc = spawn('node', [mcpScript, 'mcp'], {
  cwd: testDir,
  stdio: ['pipe', 'pipe', 'inherit']
})

let messageId = 1
const pending = new Map()
let buffer = ''

mcpProc.stdout.setEncoding('utf-8')
mcpProc.stdout.on('data', chunk => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop()

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id && pending.has(msg.id)) {
        const resolve = pending.get(msg.id)
        pending.delete(msg.id)
        resolve(msg)
      }
    } catch {}
  }
})

function sendRpc(method, params = {}) {
  const id = messageId++
  return new Promise((resolve) => {
    pending.set(id, resolve)
    const payload = { jsonrpc: '2.0', id, method, params }
    mcpProc.stdin.write(JSON.stringify(payload) + '\n')
  })
}

async function runMcpTests() {
  console.log('🧪 PROBANDO HERRAMIENTAS MCP DE BLOQUE 6...\n')

  try {
    // 1. Initialize
    const initRes = await sendRpc('initialize')
    assert.strictEqual(initRes.result.serverInfo.name, 'sdd-mcp-server')
    console.log('  ✓ MCP Server inicializado correctamente.')

    // 2. tools/list contiene las nuevas herramientas
    const listRes = await sendRpc('tools/list')
    const toolNames = listRes.result.tools.map(t => t.name)
    assert(toolNames.includes('sdd_get_execution_plan'), 'Debe incluir sdd_get_execution_plan')
    assert(toolNames.includes('sdd_get_active_task'), 'Debe incluir sdd_get_active_task')
    assert(toolNames.includes('sdd_update_task_progress'), 'Debe incluir sdd_update_task_progress')
    console.log('  ✓ Herramientas de Bloque 6 registradas en tools/list.')

    // 3. tools/call -> sdd_get_execution_plan
    const planRes = await sendRpc('tools/call', {
      name: 'sdd_get_execution_plan',
      arguments: {}
    })
    const planData = JSON.parse(planRes.result.content[0].text)
    assert(planData.summary.totalPhases >= 4, 'Debe devolver fases')
    assert(planData.summary.totalTasks >= 3, 'Debe devolver tareas')
    console.log('  ✓ sdd_get_execution_plan devolvió el plan de ejecución completo.')

    // 4. tools/call -> sdd_get_active_task
    const activeRes = await sendRpc('tools/call', {
      name: 'sdd_get_active_task',
      arguments: {}
    })
    const activeData = JSON.parse(activeRes.result.content[0].text)
    assert(activeData.activeTask, 'Debe contener activeTask')
    assert(activeData.agentContext, 'Debe contener agentContext')
    console.log(`  ✓ sdd_get_active_task devolvió la tarea activa: ${activeData.activeTask.taskId || activeData.activeTask.id}`)

    // 5. tools/call -> sdd_update_task_progress
    const updateRes = await sendRpc('tools/call', {
      name: 'sdd_update_task_progress',
      arguments: {
        taskId: 'TASK-01',
        criterionIndex: 0,
        done: true,
        status: 'in_progress',
        agentName: 'TestAgent'
      }
    })
    const updateData = JSON.parse(updateRes.result.content[0].text)
    assert(updateData.message.includes('Progreso actualizado'), 'Debe confirmar actualización')
    console.log('  ✓ sdd_update_task_progress actualizó criterios y estado de la tarea.')

    console.log('\n🎉 TODOS LOS TESTS MCP DEL BLOQUE 6 PASARON CON ÉXITO.')
  } finally {
    mcpProc.kill()
    try {
      fs.rmSync(testDir, { recursive: true, force: true })
    } catch {}
  }
}

runMcpTests().catch(err => {
  console.error('❌ Error en tests MCP:', err)
  mcpProc.kill()
  process.exit(1)
})
