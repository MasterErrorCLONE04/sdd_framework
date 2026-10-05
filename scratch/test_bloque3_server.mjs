import fs from 'fs'
import path from 'path'
import os from 'os'
import assert from 'assert'
import http from 'http'
import { initializeSdd } from '../src/init.js'
import { createSddServer } from '../src/server.js'

async function runServerTests() {
  console.log('🧪 Starting Bloque 3 Server Integration Tests...\n')
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-server-b3-'))
  initializeSdd(tempDir)

  // Start server on random port
  const port = 39800 + Math.floor(Math.random() * 500)
  const sddServer = createSddServer(tempDir, port)
  const boundPort = await sddServer.start()
  const baseUrl = `http://localhost:${boundPort}`

  try {
    // 1. Test GET /api/sdd
    console.log('--- 1. Testing GET /api/sdd ---')
    const res1 = await fetch(`${baseUrl}/api/sdd`)
    assert.strictEqual(res1.status, 200)
    const data1 = await res1.json()

    assert(Array.isArray(data1.userFlows), 'data.userFlows should be an array')
    assert(Array.isArray(data1.businessFlows), 'data.businessFlows should be an array')
    assert(Array.isArray(data1.businessRules), 'data.businessRules should be an array')
    assert(Array.isArray(data1.requirements.epics), 'data.requirements.epics should be an array')
    console.log('✅ 1. GET /api/sdd returned userFlows, businessFlows, businessRules.')

    // 2. Test PATCH /api/sdd adding a business rule
    console.log('\n--- 2. Testing PATCH /api/sdd for businessRule ---')
    const res2 = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessRule: {
          code: 'BR-005',
          title: 'Límite de intentos de login',
          rule: 'Bloquear cuenta por 15 minutos tras 5 intentos fallidos.',
          category: 'Security',
          enforcedAt: ['api', 'ui'],
          relatedStories: ['US-001']
        }
      })
    })
    assert.strictEqual(res2.status, 200)
    const data2 = await res2.json()
    assert.strictEqual(data2.success, true)
    assert.strictEqual(data2.updatedBusinessRule.code, 'BR-005')

    // Verify on disk
    const brDisk = JSON.parse(fs.readFileSync(path.join(tempDir, '.sdd', 'requirements', 'business-rules.json'), 'utf-8'))
    assert(brDisk.some(r => r.code === 'BR-005'))
    console.log('✅ 2. Business rule added and verified on disk.')

    // 3. Test PATCH /api/sdd adding a userFlow
    console.log('\n--- 3. Testing PATCH /api/sdd for userFlow ---')
    const res3 = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userFlow: {
          id: 'uf-checkout',
          name: 'Flujo de Pago con Stripe',
          actor: 'Comprador',
          steps: [
            { order: 1, screen: '/cart', action: 'Click en Proceder al Pago', outcome: 'Carga formulario' },
            { order: 2, screen: '/pay', action: 'Ingresa tarjeta y confirma', outcome: 'Confirmación de pago' }
          ]
        }
      })
    })
    assert.strictEqual(res3.status, 200)
    const data3 = await res3.json()
    assert.strictEqual(data3.success, true)
    assert.strictEqual(data3.updatedUserFlow.id, 'uf-checkout')

    const ufDisk = JSON.parse(fs.readFileSync(path.join(tempDir, '.sdd', 'flows', 'user-flows.json'), 'utf-8'))
    assert(ufDisk.some(u => u.id === 'uf-checkout'))
    console.log('✅ 3. User flow added and verified on disk.')

    // 4. Test PATCH /api/sdd adding a businessFlow
    console.log('\n--- 4. Testing PATCH /api/sdd for businessFlow ---')
    const res4 = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessFlow: {
          id: 'bf-webhook-stripe',
          name: 'Procesamiento de Webhook Stripe',
          trigger: 'POST /api/webhooks/stripe',
          nodes: [
            { id: 'n1', name: 'Validar firma webhook', status: 'done' },
            { id: 'n2', name: 'Actualizar orden en DB', status: 'in_progress' }
          ]
        }
      })
    })
    assert.strictEqual(res4.status, 200)
    const data4 = await res4.json()
    assert.strictEqual(data4.success, true)
    assert.strictEqual(data4.updatedBusinessFlow.id, 'bf-webhook-stripe')

    const bfDisk = JSON.parse(fs.readFileSync(path.join(tempDir, '.sdd', 'flows', 'business-flows.json'), 'utf-8'))
    assert(bfDisk.some(b => b.id === 'bf-webhook-stripe'))
    console.log('✅ 4. Business flow added and verified on disk.')

    // 5. Test PATCH /api/sdd adding an epic
    console.log('\n--- 5. Testing PATCH /api/sdd for epic ---')
    const res5 = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        epic: {
          id: 'EPIC-09',
          title: 'Sistema de Notificaciones Push',
          priority: 'P1'
        }
      })
    })
    assert.strictEqual(res5.status, 200)
    const data5 = await res5.json()
    assert.strictEqual(data5.success, true)
    assert.strictEqual(data5.updatedEpic.id, 'EPIC-09')

    const epicsDisk = JSON.parse(fs.readFileSync(path.join(tempDir, '.sdd', 'requirements', 'epics.json'), 'utf-8'))
    assert(epicsDisk.some(e => e.id === 'EPIC-09'))
    console.log('✅ 5. Epic added and verified on disk.')

    // 6. Test POST /api/stories with businessRuleIds
    console.log('\n--- 6. Testing POST /api/stories with businessRuleIds ---')
    const res6 = await fetch(`${baseUrl}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Login Seguro de Dos Pasos',
        role: 'usuario',
        action: 'ingresar código 2FA',
        benefit: 'proteger mi cuenta',
        businessRuleIds: ['BR-005']
      })
    })
    assert.strictEqual(res6.status, 200)
    const data6 = await res6.json()
    assert.strictEqual(data6.success, true)
    assert.deepStrictEqual(data6.story.businessRuleIds, ['BR-005'])

    // Verify disk
    const storyDisk = JSON.parse(fs.readFileSync(path.join(tempDir, '.sdd', 'requirements', 'stories', `${data6.story.id}.json`), 'utf-8'))
    assert.deepStrictEqual(storyDisk.businessRuleIds, ['BR-005'])
    console.log('✅ 6. Story created with businessRuleIds and verified on disk.')

    // 7. Test delete operations
    console.log('\n--- 7. Testing DELETE operations via PATCH ---')
    await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteBusinessRuleId: 'BR-005' })
    })
    const brDiskAfter = JSON.parse(fs.readFileSync(path.join(tempDir, '.sdd', 'requirements', 'business-rules.json'), 'utf-8'))
    assert(!brDiskAfter.some(r => r.code === 'BR-005'))

    await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteUserFlowId: 'uf-checkout' })
    })
    const ufDiskAfter = JSON.parse(fs.readFileSync(path.join(tempDir, '.sdd', 'flows', 'user-flows.json'), 'utf-8'))
    assert(!ufDiskAfter.some(u => u.id === 'uf-checkout'))

    console.log('✅ 7. Deletion operations verified cleanly.')

    console.log('\n🎉 ALL SERVER INTEGRATION TESTS FOR BLOQUE 3 PASSED!\n')
  } finally {
    sddServer.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

runServerTests().catch(err => {
  console.error('\n❌ SERVER TEST FAILED:', err)
  process.exit(1)
})
