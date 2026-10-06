// Comprehensive Test Suite for Bloque 5: UI/UX, Wireframes y Mockups Declarativos
import fs from 'fs'
import path from 'path'
import os from 'os'
import assert from 'assert'
import {
  normalizeScreen,
  normalizeWireframe,
  normalizeDesignSystem,
  normalizeProjectModel
} from '../src/model-schema.js'
import { initializeSdd } from '../src/init.js'
import { buildSpecFromAi, persistGenesisStage } from '../src/genesis.js'
import { createSddServer } from '../src/server.js'

async function runBloque5Tests() {
  console.log('🧪 Starting Bloque 5: UI/UX, Wireframes y Mockups Declarativos Tests...\n')

  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-b5-'))
  console.log(`📁 Test Workspace: ${testDir}\n`)

  try {
    // ----------------------------------------------------
    // 1. UNIT TESTS: Normalizers
    // ----------------------------------------------------
    console.log('--- 1. Testing UI/UX Normalizers ---')

    const rawScreen = {
      name: 'Panel de Clientes',
      actor: 'Gerente Comercial',
      purpose: 'Visualizar cartera de clientes y estado de pagos.',
      components: ['CustomerTable', 'FilterBar'],
      states: {
        loading: 'Cargando clientes...',
        empty: 'No se encontraron clientes registrados.'
      },
      dataRequired: ['clients', 'invoices'],
      relatedFlows: ['fl-clientes'],
      relatedStories: ['US-02']
    }
    const normScreen = normalizeScreen(rawScreen, 0)
    assert.strictEqual(normScreen.id, 'SCR-01')
    assert.strictEqual(normScreen.name, 'Panel de Clientes')
    assert.strictEqual(normScreen.route, '/panel-de-clientes')
    assert.strictEqual(normScreen.actor, 'Gerente Comercial')
    assert.strictEqual(normScreen.states.loading, 'Cargando clientes...')
    assert.strictEqual(normScreen.states.empty, 'No se encontraron clientes registrados.')
    assert.ok(normScreen.states.error.length > 0)
    assert.ok(normScreen.states.success.length > 0)
    assert.deepStrictEqual(normScreen.dataRequired, ['clients', 'invoices'])
    assert.deepStrictEqual(normScreen.relatedFlows, ['fl-clientes'])

    const rawWireframe = {
      screenId: 'SCR-01',
      title: 'Layout Panel Clientes',
      layout: 'dashboard',
      blocks: [
        { type: 'navbar', properties: { brand: 'ClientHub', links: ['Inicio', 'Clientes'] } },
        { type: 'stats-grid', properties: { items: [{ label: 'Total', value: '450' }] } },
        { type: 'table', title: 'Clientes Activos', properties: { columns: ['ID', 'Nombre', 'Saldo'] } }
      ]
    }
    const normWf = normalizeWireframe(rawWireframe, 0)
    assert.strictEqual(normWf.id, 'WF-01')
    assert.strictEqual(normWf.screenId, 'SCR-01')
    assert.strictEqual(normWf.layout, 'dashboard')
    assert.strictEqual(normWf.blocks.length, 3)
    assert.strictEqual(normWf.blocks[0].type, 'navbar')
    assert.strictEqual(normWf.blocks[1].type, 'stats-grid')
    assert.strictEqual(normWf.blocks[2].type, 'table')

    const rawDs = {
      theme: 'cyber-dark',
      colors: {
        primary: '#ec4899',
        accent: '#06b6d4'
      }
    }
    const normDs = normalizeDesignSystem(rawDs)
    assert.strictEqual(normDs.theme, 'cyber-dark')
    assert.strictEqual(normDs.colors.primary, '#ec4899')
    assert.strictEqual(normDs.colors.accent, '#06b6d4')
    assert.ok(normDs.colors.background)
    assert.ok(normDs.typography.fontFamily)
    assert.ok(normDs.radius.md)

    console.log('✅ 1. All UI/UX Normalizers verified.\n')

    // ----------------------------------------------------
    // 2. SEEDING TESTS: initializeSdd
    // ----------------------------------------------------
    console.log('--- 2. Testing initializeSdd Seeding ---')
    initializeSdd(testDir, { scan: false })

    const sddDir = path.join(testDir, '.sdd')
    const uiDir = path.join(sddDir, 'ui-ux')

    assert.ok(fs.existsSync(path.join(uiDir, 'screens.json')), 'screens.json must exist')
    assert.ok(fs.existsSync(path.join(uiDir, 'wireframes.json')), 'wireframes.json must exist')
    assert.ok(fs.existsSync(path.join(uiDir, 'design-system.json')), 'design-system.json must exist')
    assert.ok(fs.existsSync(path.join(uiDir, 'components.json')), 'components.json must exist')

    const seededScreens = JSON.parse(fs.readFileSync(path.join(uiDir, 'screens.json'), 'utf-8'))
    const seededWfs = JSON.parse(fs.readFileSync(path.join(uiDir, 'wireframes.json'), 'utf-8'))
    const seededDs = JSON.parse(fs.readFileSync(path.join(uiDir, 'design-system.json'), 'utf-8'))
    const seededComps = JSON.parse(fs.readFileSync(path.join(uiDir, 'components.json'), 'utf-8'))

    assert.ok(Array.isArray(seededScreens) && seededScreens.length > 0)
    assert.ok(seededScreens[0].states && seededScreens[0].states.loading)
    assert.ok(Array.isArray(seededWfs) && seededWfs.length > 0)
    assert.ok(seededDs.colors && seededDs.colors.primary)
    assert.ok(Array.isArray(seededComps) && seededComps.length > 0)

    console.log('✅ 2. initializeSdd seeded all UI/UX canonical files.\n')

    // ----------------------------------------------------
    // 3. GENESIS ORCHESTRATOR: buildSpecFromAi & persistGenesisStage
    // ----------------------------------------------------
    console.log('--- 3. Testing Genesis UI/UX Generation & Stage Persistence ---')
    const aiSpec = buildSpecFromAi({
      projectName: 'TiendaPro',
      screens: [
        {
          id: 'SCR-01',
          name: 'Catálogo de Productos',
          route: '/catalogo',
          actor: 'Comprador',
          purpose: 'Explorar productos con filtros por categoría y precio.',
          components: ['ProductGrid', 'CategoryFilter'],
          states: {
            loading: 'Skeleton de productos cargando...',
            empty: 'No hay productos disponibles en esta categoría.'
          },
          dataRequired: ['products', 'categories'],
          relatedFlows: ['fl-compras']
        }
      ],
      wireframes: [
        {
          screenId: 'SCR-01',
          title: 'Wireframe: Catálogo',
          layout: 'dashboard',
          blocks: [
            { type: 'navbar', properties: { brand: 'TiendaPro' } },
            { type: 'table', title: 'Productos', properties: { columns: ['SKU', 'Nombre', 'Precio'] } }
          ]
        }
      ],
      designSystem: {
        theme: 'emerald-fresh',
        colors: { primary: '#10b981' }
      }
    })

    assert.strictEqual(aiSpec.uiUx.screens[0].name, 'Catálogo de Productos')
    assert.strictEqual(aiSpec.uiUx.screens[0].actor, 'Comprador')
    assert.strictEqual(aiSpec.uiUx.screens[0].states.loading, 'Skeleton de productos cargando...')
    assert.strictEqual(aiSpec.uiUx.wireframes[0].blocks.length, 2)
    assert.strictEqual(aiSpec.uiUx.designSystem.colors.primary, '#10b981')

    const persistRes = persistGenesisStage(testDir, 'ux', {
      screens: aiSpec.uiUx.screens,
      wireframes: aiSpec.uiUx.wireframes,
      designSystem: aiSpec.uiUx.designSystem,
      components: ['ProductCard', 'CartDrawer']
    })

    assert.strictEqual(persistRes.success, true)
    assert.strictEqual(persistRes.nextStage, 'execution')

    const persistedScreens = JSON.parse(fs.readFileSync(path.join(uiDir, 'screens.json'), 'utf-8'))
    assert.strictEqual(persistedScreens[0].name, 'Catálogo de Productos')
    assert.strictEqual(persistedScreens[0].actor, 'Comprador')

    const persistedWfs = JSON.parse(fs.readFileSync(path.join(uiDir, 'wireframes.json'), 'utf-8'))
    assert.strictEqual(persistedWfs[0].title, 'Wireframe: Catálogo')

    console.log('✅ 3. Genesis UI/UX generation and stage persistence verified.\n')

    // ----------------------------------------------------
    // 4. HTTP SERVER INTEGRATION: GET & PATCH /api/sdd
    // ----------------------------------------------------
    console.log('--- 4. Testing HTTP Server UI/UX Endpoints ---')
    const sddServer = createSddServer(testDir, 41000)
    const boundPort = await sddServer.start()
    const baseUrl = `http://localhost:${boundPort}`

    // 4.1 GET /api/sdd
    const getRes = await fetch(`${baseUrl}/api/sdd`)
    assert.strictEqual(getRes.status, 200)
    const getData = await getRes.json()
    assert.ok(getData.uiUx, 'getData.uiUx must exist')
    assert.ok(Array.isArray(getData.uiUx.screens) && getData.uiUx.screens.length > 0)
    assert.ok(Array.isArray(getData.uiUx.wireframes) && getData.uiUx.wireframes.length > 0)
    assert.ok(getData.uiUx.designSystem && getData.uiUx.designSystem.colors)
    assert.ok(Array.isArray(getData.wireframes), 'getData.wireframes top-level must exist')
    assert.ok(getData.designSystem, 'getData.designSystem top-level must exist')
    console.log('✅ 4.1 GET /api/sdd returned full UI/UX model.')

    // 4.2 PATCH /api/sdd with screen
    const patchScreenRes = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screen: {
          id: 'SCR-02',
          name: 'Detalle de Pedido',
          route: '/pedidos/[id]',
          actor: 'Cliente',
          purpose: 'Visualizar resumen, tracking y comprobante del pedido.',
          components: ['OrderSummary', 'TrackingTimeline'],
          states: {
            loading: 'Buscando pedido...',
            empty: 'Pedido no encontrado.',
            error: 'Error al consultar estado del pedido.'
          },
          dataRequired: ['order', 'shipping_status'],
          relatedFlows: ['fl-checkout'],
          relatedStories: ['US-03']
        }
      })
    })
    assert.strictEqual(patchScreenRes.status, 200)
    const patchScreenData = await patchScreenRes.json()
    assert.strictEqual(patchScreenData.success, true)
    assert.strictEqual(patchScreenData.updatedScreen.id, 'SCR-02')
    assert.strictEqual(patchScreenData.updatedScreen.isDynamic, true)
    console.log('✅ 4.2 Screen addition and dynamic route detection verified.')

    // 4.3 PATCH /api/sdd with wireframe
    const patchWfRes = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wireframe: {
          id: 'WF-02',
          screenId: 'SCR-02',
          title: 'Wireframe: Detalle Pedido',
          layout: 'split',
          blocks: [
            { type: 'navbar', properties: { brand: 'TiendaPro' } },
            { type: 'card', title: 'Resumen del Pedido' },
            { type: 'actions', properties: { buttons: ['Descargar Factura', 'Rastrear Enví­o'] } }
          ]
        }
      })
    })
    assert.strictEqual(patchWfRes.status, 200)
    const patchWfData = await patchWfRes.json()
    assert.strictEqual(patchWfData.success, true)
    assert.strictEqual(patchWfData.updatedWireframe.id, 'WF-02')
    assert.strictEqual(patchWfData.updatedWireframe.layout, 'split')
    console.log('✅ 4.3 Declarative Wireframe addition verified.')

    // 4.4 PATCH /api/sdd with designSystem
    const patchDsRes = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        designSystem: {
          theme: 'ocean-blue',
          colors: { primary: '#2563eb' }
        }
      })
    })
    assert.strictEqual(patchDsRes.status, 200)
    const patchDsData = await patchDsRes.json()
    assert.strictEqual(patchDsData.success, true)
    assert.strictEqual(patchDsData.updatedDesignSystem.theme, 'ocean-blue')
    assert.strictEqual(patchDsData.updatedDesignSystem.colors.primary, '#2563eb')
    console.log('✅ 4.4 Design System mutation verified.')

    // 4.5 PATCH /api/sdd deleteScreenId
    const delScreenRes = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteScreenId: 'SCR-02' })
    })
    assert.strictEqual(delScreenRes.status, 200)
    const delScreenData = await delScreenRes.json()
    assert.strictEqual(delScreenData.success, true)
    assert.ok(!delScreenData.screens.some(s => s.id === 'SCR-02'))
    console.log('✅ 4.5 Screen deletion verified.')

    // 4.6 PATCH /api/sdd deleteWireframeId
    const delWfRes = await fetch(`${baseUrl}/api/sdd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteWireframeId: 'WF-02' })
    })
    assert.strictEqual(delWfRes.status, 200)
    const delWfData = await delWfRes.json()
    assert.strictEqual(delWfData.success, true)
    assert.ok(!delWfData.wireframes.some(w => w.id === 'WF-02'))
    console.log('✅ 4.6 Wireframe deletion verified.')

    // Stop server
    sddServer.close()
    console.log('\n🎉 ALL BLOQUE 5 UI/UX & WIREFRAME TESTS PASSED!\n')
  } finally {
    try {
      fs.rmSync(testDir, { recursive: true, force: true })
    } catch {}
  }
}

runBloque5Tests().catch(err => {
  console.error('\n❌ BLOQUE 5 TEST FAILED:', err)
  process.exit(1)
})
