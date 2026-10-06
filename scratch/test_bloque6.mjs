// Test suite for Bloque 6: Plan de Ejecución y Traspaso Agéntico
import fs from 'fs'
import path from 'path'
import assert from 'assert'
import {
  normalizeExecutionPhase,
  normalizeExecutionTask,
  normalizeDependencyGraph,
  normalizeQualityGate,
  normalizeProjectModel
} from '../src/model-schema.js'
import {
  compileAgentContext,
  generateAgentsMarkdown,
  dispatchTaskToAgent,
  completeTaskAndAdvance
} from '../src/agent-context.js'
import { initializeSdd } from '../src/init.js'
import { scaffoldGenesis } from '../src/genesis.js'
import { createSddServer } from '../src/server.js'

const testDir = path.join(process.cwd(), 'scratch', 'test_env_bloque6_' + Date.now())

async function runTests() {
  console.log('🧪 INICIANDO TEST SUITE: BLOQUE 6 — PLAN DE EJECUCIÓN Y TRASPASO AGÉNTICO\n')
  fs.mkdirSync(testDir, { recursive: true })

  try {
    // -------------------------------------------------------------------------
    // 1. Validar Normalizadores de Esquema
    // -------------------------------------------------------------------------
    console.log('1. Probando Normalizadores de Esquema (src/model-schema.js)...')
    const phaseNorm = normalizeExecutionPhase({
      id: 'phase-alpha',
      name: 'Fase Alfa',
      order: 1,
      qualityGateId: 'gate-alpha'
    })
    assert.strictEqual(phaseNorm.id, 'phase-alpha')
    assert.strictEqual(phaseNorm.name, 'Fase Alfa')
    assert.strictEqual(phaseNorm.status, 'planned')
    assert.strictEqual(phaseNorm.qualityGateId, 'gate-alpha')

    const taskNorm = normalizeExecutionTask({
      id: 'task-100',
      title: 'Crear Router Base',
      phaseId: 'phase-alpha',
      difficulty: 'S',
      scopeFiles: ['src/routes/**', 'src/server.js'],
      dependencies: ['task-99']
    })
    assert.strictEqual(taskNorm.id, 'task-100')
    assert.strictEqual(taskNorm.difficulty, 'S')
    assert.strictEqual(taskNorm.status, 'planned')
    assert.deepStrictEqual(taskNorm.scopeFiles, ['src/routes/**', 'src/server.js'])
    assert.deepStrictEqual(taskNorm.dependencies, ['task-99'])

    const depGraph = normalizeDependencyGraph({
      nodes: ['task-99', 'task-100'],
      edges: [{ from: 'task-99', to: 'task-100', type: 'blocks' }]
    })
    assert.strictEqual(depGraph.nodes.length, 2)
    assert.strictEqual(depGraph.edges.length, 1)

    const gateNorm = normalizeQualityGate({
      id: 'gate-alpha',
      name: 'Compuerta Fase Alfa',
      stage: 'phase-alpha',
      criteria: ['100% de tests unitarios pasando']
    })
    assert.strictEqual(gateNorm.id, 'gate-alpha')
    assert.strictEqual(gateNorm.status, 'pending')
    assert.strictEqual(gateNorm.criteria.length, 1)

    const projectModel = normalizeProjectModel({
      execution: {
        phases: [phaseNorm],
        tasks: [taskNorm],
        dependencies: depGraph
      },
      governance: {
        qualityGates: [gateNorm]
      }
    })
    assert.strictEqual(projectModel.execution.phases.length, 1)
    assert.strictEqual(projectModel.execution.tasks.length, 1)
    assert.strictEqual(projectModel.governance.qualityGates.length, 1)
    console.log('  ✓ Normalizadores de esquema validados correctamente.')

    // -------------------------------------------------------------------------
    // 2. Inicialización & Seeding Canónico (src/init.js)
    // -------------------------------------------------------------------------
    console.log('\n2. Probando Inicialización canónica de SDD (.sdd/execution & governance)...')
    const initResult = initializeSdd(testDir, { name: 'TestGenesisProject' })
    assert.strictEqual(initResult.success, true)

    const execDir = path.join(testDir, '.sdd', 'execution')
    const govDir = path.join(testDir, '.sdd', 'governance')

    assert(fs.existsSync(path.join(execDir, 'phases.json')), 'phases.json debe existir')
    assert(fs.existsSync(path.join(execDir, 'tasks.json')), 'tasks.json debe existir')
    assert(fs.existsSync(path.join(execDir, 'dependencies.json')), 'dependencies.json debe existir')
    assert(fs.existsSync(path.join(govDir, 'quality-gates.json')), 'quality-gates.json debe existir')
    assert(fs.existsSync(path.join(govDir, 'agent-context.json')), 'agent-context.json debe existir')
    assert(fs.existsSync(path.join(testDir, '.sdd', 'active_task.json')), 'active_task.json debe existir')
    assert(fs.existsSync(path.join(testDir, 'AGENTS.md')), 'AGENTS.md dinámico debe existir')

    const agentsMdContent = fs.readFileSync(path.join(testDir, 'AGENTS.md'), 'utf-8')
    assert(agentsMdContent.includes('Escudo de Deriva (Scope Shield)'), 'AGENTS.md debe contener Scope Shield')
    assert(agentsMdContent.includes('Criterios de Aceptación Gherkin'), 'AGENTS.md debe contener sección Gherkin')
    console.log('  ✓ Inicialización y seeding completados con éxito.')

    // -------------------------------------------------------------------------
    // 3. Despacho Agéntico, Resolución de Dependencias y Handoff (src/agent-context.js)
    // -------------------------------------------------------------------------
    console.log('\n3. Probando Despacho Agéntico, Bloqueos y Handoff (src/agent-context.js)...')
    
    // Preparar tareas con dependencias para testear bloqueo
    const tasksFile = path.join(execDir, 'tasks.json')
    const testTasks = [
      {
        id: 'task-phase1-setup',
        phaseId: 'phase-1',
        title: 'Setup de Arquitectura y Base de Datos',
        description: 'Inicializar tablas y esquemas.',
        status: 'planned',
        difficulty: 'S',
        scopeFiles: ['src/db/**', 'src/config.js'],
        dependencies: [],
        acceptanceCriteria: [
          { scenario: 'Conexión a BD', given: 'el driver configurado', when: 'inicia el app', then: 'conecta sin error', done: false }
        ]
      },
      {
        id: 'task-phase1-auth',
        phaseId: 'phase-1',
        title: 'Implementar Autenticación JWT',
        description: 'Endpoints de login y registro.',
        status: 'planned',
        difficulty: 'M',
        scopeFiles: ['src/auth/**', 'src/routes/auth.js'],
        dependencies: ['task-phase1-setup'],
        acceptanceCriteria: [
          { scenario: 'Login exitoso', given: 'credenciales válidas', when: 'envía POST /login', then: 'retorna token JWT', done: false }
        ]
      }
    ]
    fs.writeFileSync(tasksFile, JSON.stringify(testTasks, null, 2))

    // Intentar despachar tarea 2 que depende de tarea 1 -> DEBE FALLAR por estar bloqueada
    let blockedErrorCaught = false
    try {
      dispatchTaskToAgent(testDir, 'task-phase1-auth', 'Antigravity')
    } catch (err) {
      blockedErrorCaught = true
      assert(err.message.includes('bloqueada'), 'El error debe indicar que está bloqueada')
    }
    assert.strictEqual(blockedErrorCaught, true, 'No debe permitir despachar tarea bloqueada')
    console.log('  ✓ Regla de Dependencias DAG validada: la tarea dependiente fue bloqueada correctamente.')

    // Despachar tarea 1 (sin dependencias)
    const dispatchRes = dispatchTaskToAgent(testDir, 'task-phase1-setup', 'Antigravity')
    assert.strictEqual(dispatchRes.success, true)
    assert.strictEqual(dispatchRes.task.status, 'in_progress')
    assert.strictEqual(dispatchRes.task.assignedTo, 'Antigravity')

    // Verificar que active_task.json y AGENTS.md reflejan el Scope Shield de tarea 1
    const activeTaskData = JSON.parse(fs.readFileSync(path.join(testDir, '.sdd', 'active_task.json'), 'utf-8'))
    assert.strictEqual(activeTaskData.taskId, 'task-phase1-setup')
    assert.deepStrictEqual(activeTaskData.scopeFiles, ['src/db/**', 'src/config.js'])

    const agentsMdActive = fs.readFileSync(path.join(testDir, 'AGENTS.md'), 'utf-8')
    assert(agentsMdActive.includes('task-phase1-setup'), 'AGENTS.md debe incluir ID de tarea activa')
    assert(agentsMdActive.includes('src/db/**'), 'AGENTS.md debe incluir whitelist en Scope Shield')
    console.log('  ✓ Despacho atómico y sincronización de AGENTS.md validados.')

    // Completar tarea 1
    const completeRes = completeTaskAndAdvance(testDir, 'task-phase1-setup')
    assert.strictEqual(completeRes.success, true)
    assert.strictEqual(completeRes.completedTaskId, 'task-phase1-setup')
    assert.strictEqual(completeRes.nextTask.id, 'task-phase1-auth', 'La siguiente tarea elegible debe ser task-phase1-auth')
    console.log('  ✓ Finalización de tarea y avance al siguiente nodo del grafo validados.')

    // Despachar tarea 2 (ahora desbloqueada porque tarea 1 está 'done')
    const dispatchRes2 = dispatchTaskToAgent(testDir, 'task-phase1-auth', 'CursorAgent')
    assert.strictEqual(dispatchRes2.success, true)
    assert.strictEqual(dispatchRes2.task.assignedTo, 'CursorAgent')

    // Completar tarea 2 (última tarea de la fase 1)
    const completeRes2 = completeTaskAndAdvance(testDir, 'task-phase1-auth')
    assert.strictEqual(completeRes2.success, true)
    assert.strictEqual(completeRes2.phaseCompleted, true, 'La fase 1 debe marcarse como completada')

    // Verificar que la compuerta de calidad de la fase 1 fue aprobada automáticamente
    const gates = JSON.parse(fs.readFileSync(path.join(govDir, 'quality-gates.json'), 'utf-8'))
    const gatePhase1 = gates.find(g => g.id === 'gate-phase-1' || g.stage === 'phase-1')
    assert(gatePhase1, 'La compuerta de fase 1 debe existir')
    assert.strictEqual(gatePhase1.status, 'approved', 'La compuerta debe estar aprobada')
    console.log('  ✓ Cierre de fase y aprobación automática de Compuerta de Calidad validados.')

    // -------------------------------------------------------------------------
    // 4. Servidor HTTP REST (src/server.js)
    // -------------------------------------------------------------------------
    console.log('\n4. Probando Endpoints HTTP en el Servidor (src/server.js)...')
    const serverInstance = createSddServer(testDir, 0)
    const boundPort = await serverInstance.start()
    const baseUrl = `http://127.0.0.1:${boundPort}`

    try {
      // 4.1 GET /api/sdd
      const getRes = await fetch(`${baseUrl}/api/sdd`)
      assert.strictEqual(getRes.status, 200)
      const getData = await getRes.json()
      assert(getData.execution, 'Respuesta debe contener execution')
      assert(Array.isArray(getData.execution.phases), 'execution.phases debe ser un array')
      assert(Array.isArray(getData.execution.tasks), 'execution.tasks debe ser un array')
      assert(getData.governance, 'Respuesta debe contener governance')
      console.log('  ✓ GET /api/sdd retorna modelo de ejecución y gobernanza completo.')

      // 4.2 PATCH /api/sdd con nueva fase y tarea
      const patchRes = await fetch(`${baseUrl}/api/sdd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: {
            id: 'phase-integration',
            name: 'Fase de Integración E2E',
            order: 2,
            qualityGateId: 'gate-phase-2'
          },
          task: {
            id: 'task-e2e-suite',
            phaseId: 'phase-integration',
            title: 'Suite de Pruebas E2E',
            status: 'planned',
            difficulty: 'M',
            scopeFiles: ['tests/e2e/**'],
            dependencies: []
          }
        })
      })
      assert.strictEqual(patchRes.status, 200)
      const patchData = await patchRes.json()
      assert.strictEqual(patchData.success, true)
      console.log('  ✓ PATCH /api/sdd actualiza fases y tareas atómicamente.')

      // 4.3 POST /api/tasks/dispatch
      const dispatchApiRes = await fetch(`${baseUrl}/api/tasks/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-e2e-suite',
          assignedTo: 'Antigravity'
        })
      })
      assert.strictEqual(dispatchApiRes.status, 200)
      const dispatchApiData = await dispatchApiRes.json()
      assert.strictEqual(dispatchApiData.success, true)
      assert.strictEqual(dispatchApiData.task.status, 'in_progress')
      console.log('  ✓ POST /api/tasks/dispatch despacha tareas correctamente.')

      // 4.4 POST /api/tasks/complete
      const completeApiRes = await fetch(`${baseUrl}/api/tasks/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-e2e-suite'
        })
      })
      assert.strictEqual(completeApiRes.status, 200)
      const completeApiData = await completeApiRes.json()
      assert.strictEqual(completeApiData.success, true)
      assert.strictEqual(completeApiData.completedTaskId, 'task-e2e-suite')
      console.log('  ✓ POST /api/tasks/complete completa tareas y avanza el plan.')

    } finally {
      serverInstance.close()
      console.log('  ✓ Servidor de prueba cerrado con éxito.')
    }

    // -------------------------------------------------------------------------
    // 5. Integración Genesis Pipeline (src/genesis.js)
    // -------------------------------------------------------------------------
    console.log('\n5. Probando Generación de Ejecución en Genesis (src/genesis.js)...')
    const genesisProjectDir = path.join(process.cwd(), 'scratch', 'test_env_genesis_' + Date.now())
    fs.mkdirSync(genesisProjectDir, { recursive: true })

    const genesisPayload = {
      name: 'E-Commerce AI',
      purpose: 'Tienda en línea inteligente',
      execution: {
        phases: [
          { id: 'phase-1', name: 'Arquitectura Base', order: 1, qualityGateId: 'gate-1', status: 'planned' }
        ],
        tasks: [
          {
            id: 'task-cart',
            phaseId: 'phase-1',
            title: 'Implementar Carrito de Compras',
            difficulty: 'M',
            status: 'planned',
            scopeFiles: ['src/cart/**'],
            dependencies: [],
            acceptanceCriteria: [
              { scenario: 'Añadir ítem', given: 'un producto', when: 'clic agregar', then: 'aparece en carrito', done: false }
            ]
          }
        ],
        dependencies: {
          nodes: ['task-cart'],
          edges: []
        }
      },
      governance: {
        qualityGates: [
          { id: 'gate-1', name: 'Compuerta Fase 1', stage: 'phase-1', criteria: ['Tests de carrito pasando'] }
        ]
      }
    }

    const scaffoldRes = scaffoldGenesis(genesisProjectDir, genesisPayload)
    assert.strictEqual(scaffoldRes.success, true)
    assert(fs.existsSync(path.join(genesisProjectDir, '.sdd', 'execution', 'tasks.json')))
    assert(fs.existsSync(path.join(genesisProjectDir, '.sdd', 'governance', 'quality-gates.json')))
    assert(fs.existsSync(path.join(genesisProjectDir, '.sdd', 'active_task.json')))
    console.log('  ✓ Scaffold Genesis inicializa la fase de ejecución y gobernanza con éxito.')

    // Limpieza de directorios temporales
    try {
      fs.rmSync(testDir, { recursive: true, force: true })
      fs.rmSync(genesisProjectDir, { recursive: true, force: true })
    } catch {}

    console.log('\n======================================================================')
    console.log('🎉 TODOS LOS TESTS DEL BLOQUE 6 PASARON AL 100% (EXITOSO)')
    console.log('======================================================================')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ ERROR EN EL TEST SUITE DEL BLOQUE 6:')
    console.error(err)
    try {
      fs.rmSync(testDir, { recursive: true, force: true })
    } catch {}
    process.exit(1)
  }
}

runTests()
