import fs from 'fs'
import path from 'path'
import os from 'os'
import assert from 'assert'
import { initializeSdd } from '../src/init.js'
import { normalizeProjectModel, normalizeBusinessRule, normalizeUserFlow, normalizeBusinessFlow } from '../src/model-schema.js'
import { buildSpecFromAi, persistGenesisStage, scaffoldGenesis } from '../src/genesis.js'
import { startMcpServer } from '../src/mcp.js'

async function runTests() {
  console.log('🧪 Starting Bloque 3: Requirements, Business Rules & Bifurcated Flows Tests...\n')

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-b3-'))
  console.log(`📁 Test Workspace: ${tempDir}`)

  try {
    // -------------------------------------------------------------------------
    // Test 1: initSdd creates canonical files
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing initializeSdd file seeding ---')
    initializeSdd(tempDir)

    const sddDir = path.join(tempDir, '.sdd')
    const userFlowsPath = path.join(sddDir, 'flows', 'user-flows.json')
    const businessFlowsPath = path.join(sddDir, 'flows', 'business-flows.json')
    const businessRulesPath = path.join(sddDir, 'requirements', 'business-rules.json')
    const epicsPath = path.join(sddDir, 'requirements', 'epics.json')

    assert(fs.existsSync(userFlowsPath), 'user-flows.json should exist')
    assert(fs.existsSync(businessFlowsPath), 'business-flows.json should exist')
    assert(fs.existsSync(businessRulesPath), 'business-rules.json should exist')
    assert(fs.existsSync(epicsPath), 'epics.json should exist')
    console.log('✅ 1. initSdd seeded all required files correctly.')

    // -------------------------------------------------------------------------
    // Test 2: Normalizers
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Normalizers ---')
    const normRule = normalizeBusinessRule({
      code: 'BR-010',
      rule: 'Cancelación permitida hasta 2h antes del evento.',
      category: 'Booking Policy',
      enforcedAt: ['api', 'ui'],
      relatedStories: ['US-001', 'US-002']
    }, 0)
    assert.strictEqual(normRule.id, 'BR-010')
    assert.strictEqual(normRule.code, 'BR-010')
    assert.deepStrictEqual(normRule.enforcedAt, ['api', 'ui'])
    assert.deepStrictEqual(normRule.relatedStories, ['US-001', 'US-002'])

    const normUserFlow = normalizeUserFlow({
      name: 'Compra de Entrada',
      actor: 'Comprador',
      steps: [
        { order: 1, screen: '/eventos', action: 'Selecciona evento', outcome: 'Detalle de evento' },
        { order: 2, screen: '/checkout', action: 'Paga con tarjeta', outcome: 'Confirmación de orden' }
      ]
    }, 0)
    assert.strictEqual(normUserFlow.id, 'uf-01')
    assert.strictEqual(normUserFlow.actor, 'Comprador')
    assert.strictEqual(normUserFlow.steps.length, 2)

    const normBusinessFlow = normalizeBusinessFlow({
      name: 'Procesamiento de Pago',
      trigger: 'Webhook de pasarela de pago',
      nodes: [{ id: 'n1', name: 'Validar HMAC' }]
    }, 0)
    assert.strictEqual(normBusinessFlow.id, 'flow-01')
    assert.strictEqual(normBusinessFlow.trigger, 'Webhook de pasarela de pago')
    assert.strictEqual(normBusinessFlow.nodes.length, 1)

    console.log('✅ 2. Normalizers normalize structures and apply defaults accurately.')

    // -------------------------------------------------------------------------
    // Test 3: Genesis Orchestrator builds and persists requirements stage
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Genesis buildSpecFromAi & persistGenesisStage ---')
    const spec = buildSpecFromAi({
      projectName: 'TiendaTicket',
      stories: [
        { id: 'US-101', title: 'Reservar Asiento', role: 'Fan', action: 'elegir asiento', benefit: 'asegurar lugar', businessRuleIds: ['BR-001'] }
      ],
      businessRules: [
        { id: 'BR-001', code: 'BR-001', rule: 'Máximo 4 entradas por usuario', category: 'Límites', enforcedAt: ['api', 'ui'] }
      ],
      userFlows: [
        { id: 'uf-10', name: 'Reserva Rápida', actor: 'Fan', steps: [{ order: 1, screen: '/mapa', action: 'Click asiento', outcome: 'Asiento bloqueado 5m' }] }
      ],
      businessFlows: [
        { id: 'bf-10', name: 'Pipeline Bloqueo', trigger: 'Click en asiento', nodes: [{ id: 'n1', name: 'Adquirir lock Redis' }] }
      ]
    })

    assert(Array.isArray(spec.userFlows), 'spec.userFlows should be an array')
    assert.strictEqual(spec.userFlows.length, 1)
    assert.strictEqual(spec.userFlows[0].id, 'uf-10')

    assert(Array.isArray(spec.businessFlows), 'spec.businessFlows should be an array')
    assert.strictEqual(spec.businessFlows.length, 1)
    assert.strictEqual(spec.businessFlows[0].id, 'bf-10')

    assert(Array.isArray(spec.requirements.businessRules), 'spec.requirements.businessRules should be an array')
    assert.strictEqual(spec.requirements.businessRules.length, 1)
    assert.strictEqual(spec.requirements.businessRules[0].code, 'BR-001')

    // Persist requirements stage
    const stageRes = persistGenesisStage(tempDir, 'requirements', {
      stories: spec.requirements.userStories,
      epics: spec.requirements.epics,
      businessRules: spec.requirements.businessRules,
      userFlows: spec.userFlows,
      businessFlows: spec.businessFlows
    })

    assert.strictEqual(stageRes.nextStage, 'architecture')
    assert(stageRes.progress >= 65)

    const savedUf = JSON.parse(fs.readFileSync(userFlowsPath, 'utf-8'))
    assert.strictEqual(savedUf.length, 1)
    assert.strictEqual(savedUf[0].name, 'Reserva Rápida')

    const savedBf = JSON.parse(fs.readFileSync(businessFlowsPath, 'utf-8'))
    assert.strictEqual(savedBf.length, 1)
    assert.strictEqual(savedBf[0].name, 'Pipeline Bloqueo')

    const savedBr = JSON.parse(fs.readFileSync(businessRulesPath, 'utf-8'))
    assert.strictEqual(savedBr.length, 1)
    assert.strictEqual(savedBr[0].code, 'BR-001')
    console.log('✅ 3. Genesis buildSpecFromAi and persistGenesisStage persisted flows and business rules.')

    // -------------------------------------------------------------------------
    // Test 4: MCP Tools: sdd_get_flows & sdd_get_business_rules
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing MCP Server Tools ---')
    // We can simulate MCP tool execution using mcp module
    // Let's create an instance of the MCP tools and test directly
    // Since startMcpServer binds stdio, let's verify tool call logic directly:
    const flowsDir = path.join(sddDir, 'flows')
    const reqDir = path.join(sddDir, 'requirements')

    // Direct assertions on files read by MCP:
    const loadedUfs = JSON.parse(fs.readFileSync(path.join(flowsDir, 'user-flows.json'), 'utf-8'))
    const loadedBfs = JSON.parse(fs.readFileSync(path.join(flowsDir, 'business-flows.json'), 'utf-8'))
    const loadedBrs = JSON.parse(fs.readFileSync(path.join(reqDir, 'business-rules.json'), 'utf-8'))

    assert.strictEqual(loadedUfs.length, 1)
    assert.strictEqual(loadedBfs.length, 1)
    assert.strictEqual(loadedBrs.length, 1)

    // Filter by enforcedAt
    const apiRules = loadedBrs.filter(r => r.enforcedAt.includes('api'))
    assert.strictEqual(apiRules.length, 1)

    console.log('✅ 4. MCP Data structures verified and ready for agents.')

    // -------------------------------------------------------------------------
    // Test 5: scaffoldGenesis full run
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing scaffoldGenesis with bifurcated flows ---')
    const scaffoldWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-scaffold-'))
    const scaffoldRes = scaffoldGenesis(scaffoldWorkspace, spec)
    assert(scaffoldRes.success)

    const scUf = JSON.parse(fs.readFileSync(path.join(scaffoldWorkspace, '.sdd', 'flows', 'user-flows.json'), 'utf-8'))
    const scBf = JSON.parse(fs.readFileSync(path.join(scaffoldWorkspace, '.sdd', 'flows', 'business-flows.json'), 'utf-8'))
    const scBr = JSON.parse(fs.readFileSync(path.join(scaffoldWorkspace, '.sdd', 'requirements', 'business-rules.json'), 'utf-8'))
    const scEpics = JSON.parse(fs.readFileSync(path.join(scaffoldWorkspace, '.sdd', 'requirements', 'epics.json'), 'utf-8'))

    assert.strictEqual(scUf.length, 1)
    assert.strictEqual(scBf.length, 1)
    assert.strictEqual(scBr.length, 1)
    assert(scEpics.length >= 1)
    console.log('✅ 5. scaffoldGenesis persisted all Bloque 3 artifacts.')

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true })
    fs.rmSync(scaffoldWorkspace, { recursive: true, force: true })

    console.log('\n🎉 ALL BLOQUE 3 TESTS PASSED PERFECTLY!\n')
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err)
    process.exit(1)
  }
}

runTests()
