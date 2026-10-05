import fs from 'fs'
import path from 'path'
import os from 'os'
import assert from 'assert'
import { initializeSdd } from '../src/init.js'
import {
  normalizeProjectModel,
  normalizeTechStack,
  normalizeEndpoint,
  normalizeApiContract,
  normalizeDatabaseTable,
  normalizeDatabaseRelationship
} from '../src/model-schema.js'
import { buildSpecFromAi, persistGenesisStage, scaffoldGenesis } from '../src/genesis.js'
import { createSddServer } from '../src/server.js'

async function runBloque4Tests() {
  console.log('🧪 Starting Bloque 4: Technical Design (Stack, DB, API) Tests...\n')
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-b4-'))
  console.log(`📁 Test Workspace: ${tempDir}`)

  try {
    // -------------------------------------------------------------------------
    // Test 1: Normalizers
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Technical Design Normalizers ---')
    const stack = normalizeTechStack({
      frontend: 'Next.js 15',
      backend: 'Fastify',
      database: 'PostgreSQL',
      auth: { strategy: 'OAuth2 / Google', rbac: true }
    })
    assert.strictEqual(stack.frontend.framework, 'Next.js 15')
    assert.strictEqual(stack.backend.framework, 'Fastify')
    assert.strictEqual(stack.auth.strategy, 'OAuth2 / Google')
    assert.strictEqual(stack.auth.rbac, true)

    const ep = normalizeEndpoint({
      method: 'post',
      path: '/api/v1/orders',
      actor: 'customer',
      requestDto: 'CreateOrderDTO',
      responseDto: 'OrderDetailDTO',
      relatedRuleIds: ['BR-001']
    }, 0)
    assert.strictEqual(ep.method, 'POST')
    assert.strictEqual(ep.path, '/api/v1/orders')
    assert.strictEqual(ep.actor, 'customer')
    assert.deepStrictEqual(ep.relatedRuleIds, ['BR-001'])
    assert(ep.statusCodes.includes(201))

    const contract = normalizeApiContract({
      name: 'CreateOrderDTO',
      properties: {
        item_id: { type: 'string', required: true },
        quantity: { type: 'number', required: true }
      }
    }, 0)
    assert.strictEqual(contract.name, 'CreateOrderDTO')
    assert.strictEqual(contract.properties.length, 2)
    assert.strictEqual(contract.properties[0].name, 'item_id')

    const table = normalizeDatabaseTable({
      table: 'orders',
      columns: [
        { name: 'id', type: 'UUID', isPk: true },
        { name: 'amount', type: 'DECIMAL(10,2)', notNull: true }
      ]
    }, 0)
    assert.strictEqual(table.table, 'orders')
    assert.strictEqual(table.columns.length, 2)
    assert.strictEqual(table.primaryKey, 'id')

    const rel = normalizeDatabaseRelationship({
      fromTable: 'orders',
      fromColumn: 'user_id',
      toTable: 'users',
      toColumn: 'id',
      type: '1:N'
    }, 0)
    assert.strictEqual(rel.fromTable, 'orders')
    assert.strictEqual(rel.toTable, 'users')
    assert.strictEqual(rel.type, '1:N')

    console.log('✅ 1. All Technical Design Normalizers verified.')

    // -------------------------------------------------------------------------
    // Test 2: File Seeding in initializeSdd
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing initializeSdd Seeding ---')
    initializeSdd(tempDir)
    const sddDir = path.join(tempDir, '.sdd')

    assert(fs.existsSync(path.join(sddDir, 'architecture', 'stack.json')), 'stack.json should exist')
    assert(fs.existsSync(path.join(sddDir, 'api', 'endpoints.json')), 'endpoints.json should exist')
    assert(fs.existsSync(path.join(sddDir, 'api', 'contracts.json')), 'contracts.json should exist')
    assert(fs.existsSync(path.join(sddDir, 'database', 'schema-erd.json')), 'schema-erd.json should exist')
    assert(fs.existsSync(path.join(sddDir, 'database', 'relationships.json')), 'relationships.json should exist')
    assert(fs.existsSync(path.join(sddDir, 'sequences', 'sequences.json')), 'sequences.json should exist')
    console.log('✅ 2. initializeSdd seeded all Technical Design files.')

    // -------------------------------------------------------------------------
    // Test 3: Genesis Orchestrator Technical Design Generation & Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Genesis Technical Design Generation ---')
    const spec = buildSpecFromAi({
      projectName: 'PayFlow',
      stack: {
        frontend: 'Vite React',
        backend: 'Express Node',
        database: 'PostgreSQL 16'
      },
      endpoints: [
        { method: 'GET', path: '/api/v1/health', summary: 'Health check' },
        { method: 'POST', path: '/api/v1/charge', summary: 'Procesar cargo', actor: 'merchant', requestDto: 'ChargeDTO' }
      ],
      apiContracts: [
        { name: 'ChargeDTO', properties: [{ name: 'amount', type: 'number', required: true }] }
      ],
      database: [
        { table: 'merchants', columns: [{ name: 'id', type: 'UUID', isPk: true }, { name: 'name', type: 'TEXT' }] },
        { table: 'charges', columns: [{ name: 'id', type: 'UUID', isPk: true }, { name: 'merchant_id', type: 'UUID' }] }
      ],
      relationships: [
        { fromTable: 'charges', fromColumn: 'merchant_id', toTable: 'merchants', toColumn: 'id', type: '1:N' }
      ]
    })

    assert(spec.stack.frontend.framework.includes('Vite React'))
    assert.strictEqual(spec.api.endpoints.length, 2)
    assert.strictEqual(spec.api.contracts.length, 1)
    assert.strictEqual(spec.database.tables.length, 2)
    assert.strictEqual(spec.database.relationships.length, 1)

    // Persist stage architecture
    persistGenesisStage(tempDir, 'architecture', {
      architecture: spec.architecture,
      stack: spec.stack,
      database: spec.database,
      endpoints: spec.api.endpoints,
      contracts: spec.api.contracts
    })

    const savedStack = JSON.parse(fs.readFileSync(path.join(sddDir, 'architecture', 'stack.json'), 'utf-8'))
    assert.strictEqual(savedStack.frontend.framework, 'Vite React')

    const savedEndpoints = JSON.parse(fs.readFileSync(path.join(sddDir, 'api', 'endpoints.json'), 'utf-8'))
    assert.strictEqual(savedEndpoints.length, 2)

    const savedContracts = JSON.parse(fs.readFileSync(path.join(sddDir, 'api', 'contracts.json'), 'utf-8'))
    assert.strictEqual(savedContracts.length, 1)

    const savedErd = JSON.parse(fs.readFileSync(path.join(sddDir, 'database', 'schema-erd.json'), 'utf-8'))
    assert.strictEqual(savedErd.tables.length, 2)

    const savedRels = JSON.parse(fs.readFileSync(path.join(sddDir, 'database', 'relationships.json'), 'utf-8'))
    assert.strictEqual(savedRels.length, 1)

    console.log('✅ 3. Genesis Technical Design generation and stage persistence verified.')

    // -------------------------------------------------------------------------
    // Test 4: HTTP Server Endpoints & Mutations
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing HTTP Server API & Database Mutations ---')
    const port = 39850 + Math.floor(Math.random() * 100)
    const sddServer = createSddServer(tempDir, port)
    const boundPort = await sddServer.start()
    const baseUrl = `http://localhost:${boundPort}`

    try {
      // 4.1 GET /api/sdd
      const resGet = await fetch(`${baseUrl}/api/sdd`)
      assert.strictEqual(resGet.status, 200)
      const dataGet = await resGet.json()

      assert(dataGet.stack, 'data.stack should exist')
      assert(Array.isArray(dataGet.api.endpoints), 'data.api.endpoints should be an array')
      assert(Array.isArray(dataGet.api.contracts), 'data.api.contracts should be an array')
      assert(Array.isArray(dataGet.database.tables), 'data.database.tables should be an array')
      assert(Array.isArray(dataGet.database.relationships), 'data.database.relationships should be an array')
      console.log('✅ 4.1 GET /api/sdd returned full technical model.')

      // 4.2 PATCH /api/sdd stack mutation
      const resStack = await fetch(`${baseUrl}/api/sdd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stack: {
            database: { engine: 'SQLite 3 (Local MVP)', orm: 'Prisma' }
          }
        })
      })
      assert.strictEqual(resStack.status, 200)
      const dataStack = await resStack.json()
      assert.strictEqual(dataStack.updatedStack.database.engine, 'SQLite 3 (Local MVP)')
      console.log('✅ 4.2 Stack mutation verified.')

      // 4.3 PATCH /api/sdd endpoint mutation
      const resEp = await fetch(`${baseUrl}/api/sdd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: {
            method: 'DELETE',
            path: '/api/v1/orders/:id',
            summary: 'Cancelar orden',
            actor: 'customer',
            statusCodes: [204, 400, 404]
          }
        })
      })
      assert.strictEqual(resEp.status, 200)
      const dataEp = await resEp.json()
      assert.strictEqual(dataEp.updatedEndpoint.method, 'DELETE')
      console.log('✅ 4.3 Endpoint addition verified.')

      // 4.4 PATCH /api/sdd contract mutation
      const resCt = await fetch(`${baseUrl}/api/sdd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: {
            name: 'RefundOrderDTO',
            properties: [
              { name: 'order_id', type: 'string', required: true },
              { name: 'reason', type: 'string', required: true }
            ]
          }
        })
      })
      assert.strictEqual(resCt.status, 200)
      const dataCt = await resCt.json()
      assert.strictEqual(dataCt.updatedContract.name, 'RefundOrderDTO')
      console.log('✅ 4.4 Contract DTO mutation verified.')

      // 4.5 PATCH /api/sdd table & relationship mutation
      const resTbl = await fetch(`${baseUrl}/api/sdd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: {
            table: 'refunds',
            columns: [
              { name: 'id', type: 'UUID', isPk: true },
              { name: 'order_id', type: 'UUID', notNull: true }
            ]
          }
        })
      })
      assert.strictEqual(resTbl.status, 200)
      const dataTbl = await resTbl.json()
      assert.strictEqual(dataTbl.updatedTable.table, 'refunds')
      console.log('✅ 4.5 Table addition verified.')

      const resRel = await fetch(`${baseUrl}/api/sdd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship: {
            fromTable: 'refunds',
            fromColumn: 'order_id',
            toTable: 'orders',
            toColumn: 'id',
            type: '1:1'
          }
        })
      })
      assert.strictEqual(resRel.status, 200)
      const dataRel = await resRel.json()
      assert.strictEqual(dataRel.updatedRelationship.type, '1:1')
      console.log('✅ 4.6 Relationship addition verified.')

      // 4.7 Delete operations
      await fetch(`${baseUrl}/api/sdd`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteTableId: 'refunds' })
      })
      const finalErd = JSON.parse(fs.readFileSync(path.join(sddDir, 'database', 'schema-erd.json'), 'utf-8'))
      assert(!finalErd.tables.some(t => t.table === 'refunds'))
      console.log('✅ 4.7 Table deletion verified.')
    } finally {
      sddServer.close()
    }

    console.log('\n🎉 ALL BLOQUE 4 TECHNICAL DESIGN TESTS PASSED!\n')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

runBloque4Tests().catch(err => {
  console.error('\n❌ BLOQUE 4 TEST FAILED:', err)
  process.exit(1)
})
