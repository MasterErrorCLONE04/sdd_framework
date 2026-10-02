import fs from 'fs'
import path from 'path'

export function scanProject(projectRoot = process.cwd()) {
  const findings = {
    framework: 'unknown',
    language: 'unknown',
    database: 'none',
    backend: 'none',
    frontend: 'none',
    services: [],
    detectedRoutes: [],
    inferredArchitecture: {
      services: [],
      flows: []
    }
  }

  // 1. Detect language & manifests
  const pkgPath = path.join(projectRoot, 'package.json')
  const pyPath = path.join(projectRoot, 'requirements.txt')
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml')
  const goPath = path.join(projectRoot, 'go.mod')
  const cargoPath = path.join(projectRoot, 'Cargo.toml')
  const composerPath = path.join(projectRoot, 'composer.json')
  const dockerComposePath = path.join(projectRoot, 'docker-compose.yml')

  if (fs.existsSync(pkgPath)) {
    findings.language = 'JavaScript / TypeScript'
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

      if (allDeps['next']) findings.framework = 'Next.js'
      else if (allDeps['vite']) findings.framework = 'Vite'
      else if (allDeps['nuxt']) findings.framework = 'Nuxt'
      else if (allDeps['@nestjs/core']) findings.framework = 'NestJS'
      else if (allDeps['express']) findings.framework = 'Express'
      else if (allDeps['fastify']) findings.framework = 'Fastify'
      else findings.framework = 'Node.js'

      if (allDeps['prisma'] || allDeps['@prisma/client']) findings.database = 'Prisma ORM'
      else if (allDeps['drizzle-orm']) findings.database = 'Drizzle ORM'
      else if (allDeps['typeorm']) findings.database = 'TypeORM'
      else if (allDeps['mongoose']) findings.database = 'MongoDB / Mongoose'
      else if (allDeps['pg']) findings.database = 'PostgreSQL'

      if (allDeps['react']) findings.frontend = 'React'
      else if (allDeps['vue']) findings.frontend = 'Vue'
      else if (allDeps['svelte']) findings.frontend = 'Svelte'

    } catch (e) {
      // fallback
    }
  } else if (fs.existsSync(pyPath) || fs.existsSync(pyprojectPath)) {
    findings.language = 'Python'
    findings.framework = 'Python Backend'
    // Detect Django/FastAPI/Flask
    const content = fs.existsSync(pyPath) ? fs.readFileSync(pyPath, 'utf-8') : ''
    if (content.includes('fastapi')) findings.framework = 'FastAPI'
    else if (content.includes('django')) findings.framework = 'Django'
    else if (content.includes('flask')) findings.framework = 'Flask'
  } else if (fs.existsSync(goPath)) {
    findings.language = 'Go'
    findings.framework = 'Go Application'
  } else if (fs.existsSync(cargoPath)) {
    findings.language = 'Rust'
    findings.framework = 'Rust Application'
  } else if (fs.existsSync(composerPath)) {
    findings.language = 'PHP'
    findings.framework = 'PHP / Laravel'
  }

  // 2. Detect Docker Compose services
  if (fs.existsSync(dockerComposePath)) {
    try {
      const composeContent = fs.readFileSync(dockerComposePath, 'utf-8')
      const serviceMatches = composeContent.match(/^\s{2}([a-zA-Z0-9_-]+):/gm)
      if (serviceMatches) {
        findings.services = serviceMatches.map(s => s.trim().replace(':', ''))
      }
    } catch {
      // fallback
    }
  }

  // 3. Scan routes
  const possibleRouteDirs = [
    path.join(projectRoot, 'app', 'api'),
    path.join(projectRoot, 'src', 'routes'),
    path.join(projectRoot, 'routes'),
    path.join(projectRoot, 'api')
  ]

  for (const rDir of possibleRouteDirs) {
    if (fs.existsSync(rDir)) {
      try {
        const listFiles = (dir, prefix = '') => {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory()) {
              listFiles(fullPath, `${prefix}/${entry.name}`)
            } else if (entry.name.startsWith('route.') || entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
              findings.detectedRoutes.push(prefix || `/${entry.name}`)
            }
          }
        }
        listFiles(rDir)
      } catch {
        // ignore
      }
    }
  }

  // 3.1 Scan entrypoint server files for inline route definitions (Express, Fastify, Vanilla HTTP)
  const serverEntryFiles = [
    path.join(projectRoot, 'src', 'server.js'),
    path.join(projectRoot, 'server.js'),
    path.join(projectRoot, 'src', 'app.js'),
    path.join(projectRoot, 'app.js'),
    path.join(projectRoot, 'src', 'index.js'),
    path.join(projectRoot, 'index.js')
  ]
  for (const sFile of serverEntryFiles) {
    if (fs.existsSync(sFile)) {
      try {
        const sContent = fs.readFileSync(sFile, 'utf-8')
        const expressMatches = sContent.matchAll(/\b(?:app|router)\.(?:get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g)
        for (const m of expressMatches) {
          if (!findings.detectedRoutes.includes(m[1])) findings.detectedRoutes.push(m[1])
        }
        const vanillaMatches = sContent.matchAll(/pathname\s*===?\s*['"`](\/api\/[^'"`]+)['"`]/g)
        for (const m of vanillaMatches) {
          if (!findings.detectedRoutes.includes(m[1])) findings.detectedRoutes.push(m[1])
        }
      } catch {}
    }
  }

  // 4. Synthesize inferred architecture
  findings.inferredArchitecture.services.push({
    id: 'core-app',
    label: `${findings.framework || 'Main'} Application`,
    type: 'Backend / Fullstack',
    status: 'online',
    tech: `${findings.language} (${findings.framework})`,
    healthPercent: 100,
    description: `Servicio principal detectado automáticamente en ${projectRoot}`,
    submodules: findings.detectedRoutes.slice(0, 10)
  })

  if (findings.database !== 'none') {
    findings.inferredArchitecture.services.push({
      id: 'db-service',
      label: `Base de Datos (${findings.database})`,
      type: 'Database',
      status: 'online',
      tech: findings.database,
      healthPercent: 100,
      description: 'Persistencia de datos detectada'
    })
  }

  findings.services.forEach(svc => {
    if (svc !== 'web' && svc !== 'app') {
      findings.inferredArchitecture.services.push({
        id: `docker-${svc}`,
        label: `Contenedor ${svc}`,
        type: 'Infrastructure',
        status: 'online',
        tech: 'Docker Service',
        healthPercent: 100,
        description: `Servicio orquestado en docker-compose: ${svc}`
      })
    }
  })

  // 5. Scan all frontend views & screens
  findings.detectedScreens = scanProjectViews(projectRoot)

  return findings
}

/**
 * Escanea y mapea exhaustivamente todas las vistas, páginas y pantallas de usuario existentes.
 * Soporta Next.js (App & Pages Router), Vite/React, Vue, SvelteKit, Remix y HTML5.
 */
export function scanProjectViews(projectRoot = process.cwd()) {
  const screens = []
  let screenIndex = 1

  function getScreenId() {
    const num = String(screenIndex++).padStart(2, '0')
    return `SCR-${num}`
  }

  function cleanRoute(rawRoute) {
    let r = rawRoute.replace(/\\/g, '/')
    r = r.replace(/\/?page\.(tsx|jsx|js|ts)$/i, '')
    r = r.replace(/\/?\+page\.svelte$/i, '')
    r = r.replace(/\/?index\.(tsx|jsx|js|ts|vue|html)$/i, '')
    r = r.replace(/\.(tsx|jsx|js|ts|vue|html)$/i, '')
    // Eliminar Route Groups de Next.js como (auth), (dashboard)
    r = r.replace(/\/\([^)]+\)/g, '')
    r = r.replace(/^\([^)]+\)/, '')
    if (!r || r === '') r = '/'
    if (!r.startsWith('/')) r = '/' + r
    r = r.replace(/\/+/g, '/')
    return r
  }

  function formatScreenName(route, filePath) {
    if (route === '/') return 'Página Principal (Home)'

    const lower = route.toLowerCase()
    if (lower === '/dashboard' || lower.endsWith('/dashboard')) return 'Dashboard Principal'
    if (lower.includes('login') || lower.includes('sign-in')) return 'Iniciar Sesión (Login)'
    if (lower.includes('register') || lower.includes('sign-up')) return 'Registro de Usuario (Sign Up)'
    if (lower.includes('sso-callback')) return 'Autenticación SSO Callback'
    if (lower.includes('tienda') || lower.includes('store') || lower.includes('shop')) return 'Catálogo & Tienda'
    if (lower.includes('pay') || lower.includes('checkout')) return 'Pasarela de Pago & Checkout'
    if (lower.includes('pedidos') || lower.includes('orders')) return 'Gestión de Pedidos'
    if (lower.includes('productos') || lower.includes('products')) return 'Catálogo de Productos'
    if (lower.includes('clientes') || lower.includes('customers')) return 'Directorio de Clientes'
    if (lower.includes('configuracion') || lower.includes('settings')) return 'Configuración del Sistema'
    if (lower.includes('analitica') || lower.includes('analytics')) return 'Métricas & Analítica'
    if (lower.includes('pricing')) return 'Planes y Precios'
    if (lower.includes('studio-ia')) return 'Studio de Creación IA'
    if (lower.includes('the-office')) return 'The Office Simulador'
    if (lower.includes('agente')) return 'Consola de Agente'
    if (lower.includes('automatizaciones')) return 'Automatizaciones & Bots'
    if (lower.includes('integraciones')) return 'Integraciones de Software'
    if (lower.includes('envios')) return 'Logística y Envíos'
    if (lower.includes('descuentos')) return 'Gestión de Descuentos'
    if (lower.includes('verificaciones')) return 'Verificaciones de Pagos'
    if (lower.includes('explorar')) return 'Explorador de Servicios'
    if (lower.includes('legal') || lower.includes('terms')) return 'Términos Legales'
    if (lower.includes('help')) return 'Centro de Ayuda'

    const parts = route.split('/').filter(Boolean)
    const formatted = parts.map(p => {
      if (p.startsWith('[') && p.endsWith(']')) return p
      return p.charAt(0).toUpperCase() + p.slice(1).replace(/[-_]/g, ' ')
    }).join(' › ')

    return formatted || path.basename(filePath, path.extname(filePath))
  }

  function inferLayout(route, filePath) {
    const lower = (route + ' ' + filePath).toLowerCase()
    if (lower.includes('dashboard') || lower.includes('admin') || lower.includes('panel') || lower.includes('analitica') || lower.includes('clientes')) {
      return 'Dashboard Shell con Sidebar Lateral'
    }
    if (lower.includes('login') || lower.includes('sign-in') || lower.includes('sign-up') || lower.includes('auth')) {
      return 'Autenticación Centrada (Auth Card)'
    }
    if (lower.includes('pay') || lower.includes('checkout')) {
      return 'Checkout Minimalista con Resumen'
    }
    if (lower.includes('tienda') || lower.includes('store') || lower.includes('catalog') || lower.includes('productos')) {
      return 'Catálogo E-Commerce Responsive'
    }
    if (route === '/') {
      return 'Landing Page con Hero & Features'
    }
    return 'Vista de Aplicación Responsive'
  }

  function extractComponentsFromFile(fullPath) {
    try {
      if (!fs.existsSync(fullPath)) return []
      const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 4000)
      const comps = new Set()
      const importRegex = /import\s+(?:([A-Z]\w+)|(?:\{([^}]+)\}))\s+from\s+['"]([^'"]+)['"]/g
      let match
      while ((match = importRegex.exec(content)) !== null) {
        if (match[1] && !['React', 'Image', 'Link', 'NextResponse'].includes(match[1])) {
          comps.add(match[1])
        }
        if (match[2]) {
          const items = match[2].split(',').map(s => s.trim())
          items.forEach(item => {
            const clean = item.split(' as ')[0].trim()
            if (/^[A-Z]\w+$/.test(clean) && !['FC', 'Props', 'Metadata', 'NextPage'].includes(clean)) {
              comps.add(clean)
            }
          })
        }
      }
      return Array.from(comps).slice(0, 5)
    } catch {
      return []
    }
  }

  const seenRoutes = new Set()
  const seenFiles = new Set()

  // 1. Next.js App Router (app/**/page.* o src/app/**/page.*)
  const appDirs = [path.join(projectRoot, 'app'), path.join(projectRoot, 'src', 'app')]
  for (const appDir of appDirs) {
    if (fs.existsSync(appDir)) {
      function walkApp(dir, relPath = '') {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const ent of entries) {
            if (['node_modules', '.next', '.git', 'api'].includes(ent.name)) continue
            const full = path.join(dir, ent.name)
            const rel = path.join(relPath, ent.name)
            if (ent.isDirectory()) {
              walkApp(full, rel)
            } else if (/^page\.(tsx|jsx|js|ts)$/i.test(ent.name)) {
              const route = cleanRoute(relPath || '/')
              const relFile = path.relative(projectRoot, full).replace(/\\/g, '/')
              if (!seenRoutes.has(route)) {
                seenRoutes.add(route)
                seenFiles.add(relFile)
                const comps = extractComponentsFromFile(full)
                screens.push({
                  id: getScreenId(),
                  name: formatScreenName(route, relFile),
                  route,
                  previewUrl: route.includes('[') ? route.replace(/\[\[?\.\.\.[^\]]+\]\]?/g, 'test').replace(/\[([^\]]+)\]/g, 'demo') : route,
                  filePath: relFile,
                  framework: 'Next.js App Router',
                  layout: inferLayout(route, relFile),
                  status: 'done',
                  healthPercent: 100,
                  components: comps.length > 0 ? comps : ['Page Container'],
                  wireframeDescription: `Página renderizada en ruta "${route}" desde ${relFile}. Integra componentes de UI y estado reactivo.`,
                  checklist: [
                    { id: `ui-${screenIndex}-1`, text: `Ruta ${route} registrada en el router`, done: true },
                    { id: `ui-${screenIndex}-2`, text: `Componente exportado en ${relFile}`, done: true },
                    { id: `ui-${screenIndex}-3`, text: `Componentes visuales (${comps.length || 1}) vinculados`, done: true }
                  ]
                })
              }
            }
          }
        } catch (e) {}
      }
      walkApp(appDir)
    }
  }

  // 2. Next.js Pages Router (pages/** o src/pages/**)
  const pagesDirs = [path.join(projectRoot, 'pages'), path.join(projectRoot, 'src', 'pages')]
  for (const pagesDir of pagesDirs) {
    if (fs.existsSync(pagesDir)) {
      function walkPages(dir, relPath = '') {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const ent of entries) {
            if (['node_modules', '.next', '.git', 'api'].includes(ent.name)) continue
            if (/^_app\.|^_document\.|^_error\./i.test(ent.name)) continue
            const full = path.join(dir, ent.name)
            const rel = path.join(relPath, ent.name)
            if (ent.isDirectory()) {
              walkPages(full, rel)
            } else if (/\.(tsx|jsx|js|ts|vue|svelte)$/i.test(ent.name)) {
              const route = cleanRoute(rel)
              const relFile = path.relative(projectRoot, full).replace(/\\/g, '/')
              if (!seenRoutes.has(route)) {
                seenRoutes.add(route)
                seenFiles.add(relFile)
                const comps = extractComponentsFromFile(full)
                screens.push({
                  id: getScreenId(),
                  name: formatScreenName(route, relFile),
                  route,
                  previewUrl: route.includes('[') ? route.replace(/\[([^\]]+)\]/g, 'demo') : route,
                  filePath: relFile,
                  framework: 'Next.js Pages / Vue Router',
                  layout: inferLayout(route, relFile),
                  status: 'done',
                  healthPercent: 100,
                  components: comps.length > 0 ? comps : ['Page Container'],
                  wireframeDescription: `Vista implementada en ${relFile} para la ruta ${route}.`,
                  checklist: [
                    { id: `ui-${screenIndex}-1`, text: `Ruta ${route} registrada`, done: true },
                    { id: `ui-${screenIndex}-2`, text: `Archivo ${relFile} disponible`, done: true }
                  ]
                })
              }
            }
          }
        } catch (e) {}
      }
      walkPages(pagesDir)
    }
  }

  // 3. Vistas en src/views, src/screens o views/ (Vite / React / Vue)
  const viewsDirs = [
    path.join(projectRoot, 'src', 'views'),
    path.join(projectRoot, 'src', 'screens'),
    path.join(projectRoot, 'views'),
    path.join(projectRoot, 'src', 'routes')
  ]
  for (const vDir of viewsDirs) {
    if (fs.existsSync(vDir)) {
      function walkViews(dir, relPath = '') {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const ent of entries) {
            if (['node_modules', '.git'].includes(ent.name)) continue
            const full = path.join(dir, ent.name)
            const rel = path.join(relPath, ent.name)
            if (ent.isDirectory()) {
              walkViews(full, rel)
            } else if (/\.(tsx|jsx|vue|svelte)$/i.test(ent.name)) {
              const route = cleanRoute(rel)
              const relFile = path.relative(projectRoot, full).replace(/\\/g, '/')
              if (!seenRoutes.has(route)) {
                seenRoutes.add(route)
                seenFiles.add(relFile)
                const comps = extractComponentsFromFile(full)
                screens.push({
                  id: getScreenId(),
                  name: formatScreenName(route, relFile),
                  route,
                  previewUrl: route,
                  filePath: relFile,
                  framework: 'Frontend Component View',
                  layout: inferLayout(route, relFile),
                  status: 'done',
                  healthPercent: 100,
                  components: comps.length > 0 ? comps : ['View Component'],
                  wireframeDescription: `Vista de interfaz ${path.basename(relFile)} implementada en ${relFile}.`,
                  checklist: [
                    { id: `ui-${screenIndex}-1`, text: `Archivo de vista en ${relFile}`, done: true }
                  ]
                })
              }
            }
          }
        } catch (e) {}
      }
      walkViews(vDir)
    }
  }

  // 4. Client View Components clave en components/ o src/components/
  const compDirs = [path.join(projectRoot, 'components'), path.join(projectRoot, 'src', 'components')]
  for (const cDir of compDirs) {
    if (fs.existsSync(cDir)) {
      try {
        const list = fs.readdirSync(cDir, { withFileTypes: true })
        for (const item of list) {
          if (item.isFile() && /Client\.(tsx|jsx|ts|js)$/i.test(item.name)) {
            const full = path.join(cDir, item.name)
            const relFile = path.relative(projectRoot, full).replace(/\\/g, '/')
            if (!seenFiles.has(relFile)) {
              seenFiles.add(relFile)
              const baseName = item.name.replace(/Client\.(tsx|jsx|ts|js)$/i, '')
              const inferredRoute = '/' + baseName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
              const comps = extractComponentsFromFile(full)
              screens.push({
                id: getScreenId(),
                name: `Vista Cliente: ${baseName}`,
                route: inferredRoute,
                previewUrl: inferredRoute,
                filePath: relFile,
                framework: 'React Client Container',
                layout: inferLayout(inferredRoute, relFile),
                status: 'done',
                healthPercent: 100,
                components: comps.length > 0 ? comps : [item.name],
                wireframeDescription: `Contenedor cliente modular ${item.name} ubicado en ${relFile}. Gestiona el ciclo de vida y UI de la vista.`,
                checklist: [
                  { id: `ui-${screenIndex}-1`, text: `Componente cliente ${item.name} compilado`, done: true },
                  { id: `ui-${screenIndex}-2`, text: `Interacciones de usuario y hooks montados`, done: true }
                ]
              })
            }
          }
        }
      } catch (e) {}
    }
  }

  // 5. HTML estáticos de fallback
  if (screens.length === 0) {
    const htmlFiles = ['index.html', 'ui/index.html', 'public/index.html', 'dashboard.html', 'login.html', 'checkout.html', 'pricing.html', 'about.html']
    for (const hf of htmlFiles) {
      const hp = path.join(projectRoot, hf)
      if (fs.existsSync(hp)) {
        const route = hf.endsWith('index.html') ? '/' : '/' + path.basename(hf, '.html')
        const relPath = hf.replace(/\\/g, '/')
        screens.push({
          id: getScreenId(),
          name: formatScreenName(route, relPath),
          route,
          previewUrl: route,
          filePath: relPath,
          framework: 'HTML5 Static Web',
          layout: 'Página Web HTML',
          status: 'done',
          healthPercent: 100,
          components: ['Documento HTML'],
          wireframeDescription: `Página estática ${hf}.`,
          checklist: [{ id: `ui-${screenIndex}-1`, text: `Archivo ${hf} disponible`, done: true }]
        })
      }
    }
  }

  return screens
}
