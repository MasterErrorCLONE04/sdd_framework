// Test suite for Bloque 7: Reorganización Visual del Cockpit UI (6 Dominios Cohesivos)
import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { createSddServer } from '../src/server.js'
import { initializeSdd } from '../src/init.js'

const testDir = path.join(process.cwd(), 'scratch', 'test_env_bloque7_' + Date.now())

async function runTests() {
  console.log('🧪 INICIANDO TEST SUITE: BLOQUE 7 — REORGANIZACIÓN VISUAL DEL COCKPIT UI\n')
  fs.mkdirSync(testDir, { recursive: true })
  initializeSdd(testDir, { name: 'CockpitTestProject' })

  try {
    // -------------------------------------------------------------------------
    // 1. Verificación Estructural de Componentes UI en los 6 Dominios
    // -------------------------------------------------------------------------
    console.log('1. Verificando Componentes del Cockpit y 6 Dominios Cohesivos...')

    const sidebarPath = path.join(process.cwd(), 'ui', 'components', 'cockpit', 'cockpit-sidebar.html')
    const headerPath = path.join(process.cwd(), 'ui', 'components', 'cockpit', 'cockpit-header.html')
    const chatMainPath = path.join(process.cwd(), 'ui', 'components', 'chat', 'chat-main.html')
    const indexPath = path.join(process.cwd(), 'ui', 'index.html')

    assert(fs.existsSync(sidebarPath), 'cockpit-sidebar.html debe existir')
    assert(fs.existsSync(headerPath), 'cockpit-header.html debe existir')
    assert(fs.existsSync(chatMainPath), 'chat-main.html debe existir')
    assert(fs.existsSync(indexPath), 'index.html debe existir')

    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8')
    assert(sidebarContent.includes('1. Producto & Estrategia'), 'Sidebar debe tener Dominio 1: Producto & Estrategia')
    assert(sidebarContent.includes('2. Requerimientos Funcionales'), 'Sidebar debe tener Dominio 2: Requerimientos Funcionales')
    assert(sidebarContent.includes('3. Procesos & Flujos'), 'Sidebar debe tener Dominio 3: Procesos & Flujos')
    assert(sidebarContent.includes('4. Diseño Técnico'), 'Sidebar debe tener Dominio 4: Diseño Técnico')
    assert(sidebarContent.includes('5. UI/UX & Prototipos'), 'Sidebar debe tener Dominio 5: UI/UX & Prototipos')
    assert(sidebarContent.includes('6. Ejecución & Handoff'), 'Sidebar debe tener Dominio 6: Ejecución & Handoff')

    // Verificar las 12 perspectivas
    const expectedTabs = [
      'tab-discovery', 'tab-core', 'tab-roles',
      'tab-stories',
      'tab-flows', 'tab-sequences',
      'tab-architecture', 'tab-database',
      'tab-uiux',
      'tab-kanban', 'tab-drift', 'tab-qa'
    ]
    expectedTabs.forEach(tab => {
      assert(sidebarContent.includes(`id="${tab}"`), `Sidebar debe contener el tab interactivo ${tab}`)
    })

    const headerContent = fs.readFileSync(headerPath, 'utf-8')
    assert(headerContent.includes('id="header-stage-container"'), 'Header debe contener contenedor de etapa')
    assert(headerContent.includes('id="header-stage-text"'), 'Header debe contener texto dinámico de etapa')

    const chatContent = fs.readFileSync(chatMainPath, 'utf-8')
    assert(chatContent.includes('id="step-pill-6"'), 'Chat stepper debe incluir el paso 6: Plan & Handoff')
    assert(chatContent.includes('Cabina SDD (6 Dominios)'), 'Chat header debe indicar los 6 Dominios')

    const indexContent = fs.readFileSync(indexPath, 'utf-8')
    const expectedViews = [
      'view-core.html', 'view-discovery.html', 'view-stories.html', 'view-sequences.html',
      'view-flows.html', 'view-architecture.html', 'view-database.html', 'view-roles.html',
      'view-qa.html', 'view-drift.html', 'view-uiux.html', 'view-kanban.html'
    ]
    expectedViews.forEach(v => {
      assert(indexContent.includes(v), `index.html debe montar la vista ${v}`)
    })
    console.log('  ✓ Estructura de componentes y los 6 dominios cohesivos validados.')

    // -------------------------------------------------------------------------
    // 2. Servidor HTTP y Distribución de Vistas Estáticas & Componentes
    // -------------------------------------------------------------------------
    console.log('\n2. Probando Servidor HTTP y Servido de Componentes Modulares...')
    const serverInstance = createSddServer(testDir, 0)
    const boundPort = await serverInstance.start()
    const baseUrl = `http://127.0.0.1:${boundPort}`

    try {
      // 2.1 Servir index.html
      const resIndex = await fetch(`${baseUrl}/`)
      assert.strictEqual(resIndex.status, 200)
      const htmlText = await resIndex.text()
      assert(htmlText.includes('<!DOCTYPE html>'), 'Debe devolver HTML válido')
      assert(htmlText.includes('screen-cockpit'), 'Debe contener el cockpit')
      console.log('  ✓ Servidor entrega index.html (200 OK).')

      // 2.2 Servir componentes dinámicos
      const resSidebar = await fetch(`${baseUrl}/components/cockpit/cockpit-sidebar.html`)
      assert.strictEqual(resSidebar.status, 200)
      console.log('  ✓ Servidor entrega cockpit-sidebar.html (200 OK).')

      const resHeader = await fetch(`${baseUrl}/components/cockpit/cockpit-header.html`)
      assert.strictEqual(resHeader.status, 200)
      console.log('  ✓ Servidor entrega cockpit-header.html (200 OK).')

      const resKanban = await fetch(`${baseUrl}/components/views/view-kanban.html`)
      assert.strictEqual(resKanban.status, 200)
      console.log('  ✓ Servidor entrega view-kanban.html (200 OK).')

      const resUiux = await fetch(`${baseUrl}/components/views/view-uiux.html`)
      assert.strictEqual(resUiux.status, 200)
      console.log('  ✓ Servidor entrega view-uiux.html (200 OK).')

      // 2.3 Servir scripts de vistas
      const resAppJs = await fetch(`${baseUrl}/js/app.js`)
      assert.strictEqual(resAppJs.status, 200)
      console.log('  ✓ Servidor entrega js/app.js (200 OK).')

      // -----------------------------------------------------------------------
      // 3. API Data Completa para los 6 Dominios
      // -----------------------------------------------------------------------
      console.log('\n3. Validando Entrega de Datos de la API para los 6 Dominios...')
      const apiRes = await fetch(`${baseUrl}/api/sdd`)
      assert.strictEqual(apiRes.status, 200)
      const data = await apiRes.json()

      // Dominio 1: Producto
      assert(data.product, 'Debe incluir data.product')
      assert(data.core, 'Debe incluir data.core')

      // Dominio 2: Requerimientos
      assert(data.requirements, 'Debe incluir data.requirements')
      assert(Array.isArray(data.requirements.userStories), 'Debe incluir userStories')

      // Dominio 3: Procesos & Flujos
      assert(data.flows || data.businessFlows, 'Debe incluir flujos')

      // Dominio 4: Diseño Técnico
      assert(data.architecture, 'Debe incluir arquitectura')
      assert(data.database, 'Debe incluir database')

      // Dominio 5: UI/UX
      assert(data.uiUx, 'Debe incluir uiUx')

      // Dominio 6: Ejecución & Gobernanza
      assert(data.execution, 'Debe incluir execution')
      assert(data.governance, 'Debe incluir governance')
      assert(data.activeTask !== undefined, 'Debe incluir activeTask')
      console.log('  ✓ API /api/sdd entrega la especificación íntegra de los 6 Dominios.')

    } finally {
      serverInstance.close()
      console.log('  ✓ Servidor de prueba cerrado con éxito.')
    }

    // Limpieza
    try {
      fs.rmSync(testDir, { recursive: true, force: true })
    } catch {}

    console.log('\n======================================================================')
    console.log('🎉 TODOS LOS TESTS DEL BLOQUE 7 PASARON AL 100% (EXITOSO)')
    console.log('======================================================================')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ ERROR EN EL TEST SUITE DEL BLOQUE 7:')
    console.error(err)
    try {
      fs.rmSync(testDir, { recursive: true, force: true })
    } catch {}
    process.exit(1)
  }
}

runTests()
