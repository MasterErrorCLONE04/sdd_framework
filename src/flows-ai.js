import fs from 'fs'
import path from 'path'
import os from 'os'
import { scanProject, scanProjectViews } from './scanner.js'
import { callOpenRouter } from './genesis.js'

/**
 * Extrae evidencia objetiva del repositorio para fundamentar el análisis de la IA (Grounding).
 * Cero heurísticas inventadas: solo inspección de archivos, rutas, modelos y dependencias reales.
 */
export function collectCodebaseEvidence(projectRoot = process.cwd()) {
  const baseFindings = scanProject(projectRoot)
  const screens = scanProjectViews(projectRoot)

  // 1. Detectar dependencias de integración relevantes (Auth, Pagos, IA, Email, ORM)
  const integrations = []
  const pkgPath = path.join(projectRoot, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      const keywords = {
        'stripe': 'Pasarela de Pagos (Stripe)',
        '@paypal/checkout-server-sdk': 'Pasarela de Pagos (PayPal)',
        'mercadopago': 'Pasarela de Pagos (MercadoPago)',
        'next-auth': 'Autenticación (NextAuth / Auth.js)',
        '@clerk/nextjs': 'Autenticación (Clerk)',
        '@supabase/supabase-js': 'Backend BaaS / Auth (Supabase)',
        'firebase': 'Firebase SDK',
        'jsonwebtoken': 'Autenticación JWT',
        'bcrypt': 'Encriptación y Hash de Contraseñas',
        'argon2': 'Encriptación de Contraseñas',
        'resend': 'Servicio de Emails Transaccionales (Resend)',
        'nodemailer': 'Envío de Correos SMTP',
        '@sendgrid/mail': 'Email Marketing / Transaccional (SendGrid)',
        'openai': 'Integración con OpenAI API',
        '@anthropic-ai/sdk': 'Integración con Anthropic Claude',
        'redis': 'Caché / Colas (Redis)',
        'bull': 'Colas de Procesamiento en Segundo Plano',
        'bullmq': 'Colas de Mensajería BullMQ',
        'socket.io': 'WebSockets en Tiempo Real',
        'zod': 'Validación de Esquemas de Entrada (Zod)'
      }

      for (const [dep, label] of Object.entries(keywords)) {
        if (allDeps[dep]) integrations.push(label)
      }
    } catch {}
  }

  // 2. Extraer esquemas de Base de Datos reales (Prisma, SQL, Mongoose, Drizzle)
  const databaseModels = []
  const prismaPath = path.join(projectRoot, 'prisma', 'schema.prisma')
  if (fs.existsSync(prismaPath)) {
    try {
      const prismaContent = fs.readFileSync(prismaPath, 'utf-8')
      const modelMatches = prismaContent.match(/model\s+(\w+)\s+\{([^}]+)\}/g) || []
      modelMatches.forEach(m => {
        const nameMatch = m.match(/model\s+(\w+)/)
        if (nameMatch) {
          const lines = m.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('model') && !l.startsWith('}'))
          const fields = lines.slice(0, 8).map(l => l.split(/\s+/).slice(0, 2).join(': '))
          databaseModels.push({
            model: nameMatch[1],
            sampleFields: fields
          })
        }
      })
    } catch {}
  }

  // Si no hay Prisma, buscar archivos en models/ o src/models/
  if (databaseModels.length === 0) {
    const modelDirs = [path.join(projectRoot, 'src', 'models'), path.join(projectRoot, 'models'), path.join(projectRoot, 'src', 'entities')]
    for (const mDir of modelDirs) {
      if (fs.existsSync(mDir)) {
        try {
          const files = fs.readdirSync(mDir).filter(f => /\.(ts|js|py)$/.test(f))
          files.forEach(f => {
            databaseModels.push({
              model: f.replace(/\.(ts|js|py)$/, ''),
              file: path.relative(projectRoot, path.join(mDir, f)).replace(/\\/g, '/')
            })
          })
        } catch {}
      }
    }
  }

  // 3. Inspeccionar muestras de rutas y controladores para entender operaciones
  const routeEvidence = []
  const maxRoutesToInspect = 15
  let inspectedCount = 0

  function inspectFile(fullPath, relPath) {
    if (inspectedCount >= maxRoutesToInspect) return
    try {
      const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 2500)
      const methods = []
      if (/export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)/.test(content)) {
        const matches = content.matchAll(/export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)/g)
        for (const m of matches) methods.push(m[2])
      } else if (/\.(get|post|put|patch|delete)\s*\(/.test(content)) {
        const matches = content.matchAll(/\.(get|post|put|patch|delete)\s*\(/g)
        for (const m of matches) methods.push(m[1].toUpperCase())
      }

      routeEvidence.push({
        file: relPath.replace(/\\/g, '/'),
        methods: Array.from(new Set(methods)),
        hasDbOperations: /prisma\.|db\.|Model\.|findUnique|findMany|create|update|delete|SELECT|INSERT/i.test(content),
        hasAuthChecks: /session|auth|token|jwt|verify|user|req\.headers/i.test(content)
      })
      inspectedCount++
    } catch {}
  }

  const routeFolders = [
    path.join(projectRoot, 'app', 'api'),
    path.join(projectRoot, 'src', 'app', 'api'),
    path.join(projectRoot, 'src', 'routes'),
    path.join(projectRoot, 'routes'),
    path.join(projectRoot, 'src', 'controllers'),
    path.join(projectRoot, 'controllers')
  ]

  for (const rDir of routeFolders) {
    if (fs.existsSync(rDir)) {
      function walk(dir) {
        if (inspectedCount >= maxRoutesToInspect) return
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const ent of entries) {
            const full = path.join(dir, ent.name)
            if (ent.isDirectory() && !['node_modules', '.git'].includes(ent.name)) {
              walk(full)
            } else if (/\.(ts|js|py)$/.test(ent.name)) {
              inspectFile(full, path.relative(projectRoot, full))
            }
          }
        } catch {}
      }
      walk(rDir)
    }
  }

  // Si no se encontraron rutas en carpetas estándar, inspeccionar archivos de entrada de servidor
  if (routeEvidence.length === 0) {
    const entryFiles = [
      path.join(projectRoot, 'src', 'server.js'),
      path.join(projectRoot, 'server.js'),
      path.join(projectRoot, 'src', 'app.js'),
      path.join(projectRoot, 'app.js'),
      path.join(projectRoot, 'src', 'index.js'),
      path.join(projectRoot, 'index.js')
    ]
    for (const ef of entryFiles) {
      if (fs.existsSync(ef)) {
        inspectFile(ef, path.relative(projectRoot, ef))
      }
    }
  }

  return {
    projectName: path.basename(projectRoot),
    language: baseFindings.language,
    framework: baseFindings.framework,
    database: baseFindings.database,
    services: baseFindings.services,
    detectedRoutes: baseFindings.detectedRoutes,
    detectedScreens: screens.map(s => ({
      name: s.name,
      route: s.route,
      filePath: s.filePath,
      components: s.components
    })),
    databaseModels,
    integrations,
    routeEvidence
  }
}

function readConfigJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {}
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return {}
  }
}

export function resolveOpenRouterSettings(projectRoot, passedKey, passedModel) {
  const localConfig = readConfigJson(path.join(projectRoot, '.sdd', 'config.json'))
  const globalConfig = readConfigJson(path.join(os.homedir(), '.sdd', 'config.json'))

  let fileEnvKey = ''
  const envFiles = ['.env', '.env.local', '.env.development']
  for (const f of envFiles) {
    const p = path.join(projectRoot, f)
    if (fs.existsSync(p)) {
      try {
        const lines = fs.readFileSync(p, 'utf-8').split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('OPENROUTER_API_KEY=')) {
            let val = trimmed.split('=')[1]?.trim() || ''
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1)
            }
            if (val) { fileEnvKey = val; break }
          }
        }
      } catch {}
    }
  }

  const effectiveKey = (passedKey || localConfig.openrouterApiKey || globalConfig.openrouterApiKey || process.env.OPENROUTER_API_KEY || fileEnvKey || '').trim()
  const effectiveModel = (passedModel || localConfig.openrouterModel || globalConfig.openrouterModel || process.env.OPENROUTER_MODEL || 'inclusionai/ling-3.0-flash-sante:free').trim()

  return { effectiveKey, effectiveModel }
}

export function extractJsonFromAi(text) {
  if (!text) return null
  const trimmed = text.trim()

  // 1. Intentar parseo directo
  try {
    return JSON.parse(trimmed)
  } catch {}

  // 2. Intentar capturar bloque ```json ... ``` o ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {}
  }

  // 3. Extraer desde el primer '{' hasta el último '}'
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(candidate)
    } catch {}
  }

  // 4. Auto-reparación inteligente en caso de truncado por tokens
  if (firstBrace !== -1) {
    let candidate = trimmed.slice(firstBrace)
    candidate = candidate.replace(/```[\s\S]*$/, '').trim()
    const lastValidDelim = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'))
    if (lastValidDelim > 10) {
      let repaired = candidate.slice(0, lastValidDelim + 1)
      let openBraces = 0, openBrackets = 0
      let inString = false
      for (let i = 0; i < repaired.length; i++) {
        const c = repaired[i]
        if (c === '"' && repaired[i - 1] !== '\\') inString = !inString
        if (!inString) {
          if (c === '{') openBraces++
          else if (c === '}') openBraces--
          else if (c === '[') openBrackets++
          else if (c === ']') openBrackets--
        }
      }
      while (openBrackets > 0) { repaired += ']'; openBrackets-- }
      while (openBraces > 0) { repaired += '}'; openBraces-- }
      try {
        return JSON.parse(repaired)
      } catch {}
    }
  }

  return null
}

/**
 * Ejecuta el descubrimiento inteligente de todos los flujos de negocio del proyecto usando IA real (OpenRouter).
 * Cero heurísticas inventadas: la IA analiza el mapa de código y sintetiza los flujos y secuencias UML.
 */
export async function discoverFlowsWithAi({ projectRoot = process.cwd(), apiKey, model }) {
  // 1. Recolectar la evidencia de código fuente
  const evidence = collectCodebaseEvidence(projectRoot)

  // 2. Comprobar clave y modelo de OpenRouter
  const { effectiveKey, effectiveModel } = resolveOpenRouterSettings(projectRoot, apiKey, model)
  if (!effectiveKey) {
    throw new Error('OPENROUTER_KEY_REQUIRED: Para descubrir los flujos del proyecto con IA necesitas configurar tu API Key de OpenRouter en la barra superior o en tu archivo .env. (Usa los modelos gratuitos :free si lo deseas).')
  }

  const selectedModel = effectiveModel || 'inclusionai/ling-3.0-flash-sante:free'

  // 3. Preparar el prompt de Ingeniería Inversa Semántica para la IA
  const systemPrompt = `Eres el Arquitecto de Software Principal de Spec-Driven Development (SDD).
Tu misión es realizar INGENIERÍA INVERSA SEMÁNTICA de un proyecto real existente.
A partir de la evidencia del código fuente (rutas, controladores, pantallas, modelos de base de datos e integraciones), debes descubrir y mapear TODOS los flujos de negocio de punta a punta que existen en la aplicación (por ejemplo: Autenticación & Sesión, Catálogo & Compra/Checkout, Gestión de Entidades/Recursos, Procesamiento Asíncrono, etc.).

REGLAS ESTRICTAS:
1. No inventes código ni uses heurísticas fijas. Basa cada flujo en las rutas, vistas y modelos reales encontrados en la evidencia.
2. Cada flujo debe tener sus nodos ordenados cronológicamente (desde el trigger de UI o API hasta la persistencia o respuesta).
3. Cada nodo debe especificar sus 'scopeFiles' reales tomados del repositorio.
4. Para cada flujo descubierto, genera un diagrama de secuencia Mermaid válido (sequenceDiagram con autonumber y participantes claros).

Debes responder ÚNICAMENTE con un bloque JSON delimitado por \`\`\`json y \`\`\` con la siguiente estructura exacta:
{
  "summary": "Resumen ejecutivo del análisis de flujos del repositorio",
  "flows": [
    {
      "id": "slug-kebab-case-del-flujo",
      "name": "Nombre descriptivo del flujo de negocio",
      "description": "Qué hace este flujo en el negocio y qué resuelve",
      "priority": "P0|P1|P2",
      "progress": 100,
      "nodes": [
        {
          "id": "node-1",
          "name": "Nombre del paso",
          "type": "UI|API|Database|Service|Worker",
          "status": "done",
          "scopeFiles": ["archivos/reales/involucrados.ts"],
          "checklist": [
            { "id": "task-1", "text": "Descripción concreta de la operación", "done": true }
          ]
        }
      ]
    }
  ],
  "sequences": [
    {
      "id": "seq-slug-del-flujo",
      "flowId": "slug-kebab-case-del-flujo",
      "name": "Secuencia: Nombre del Flujo",
      "description": "Intercambio de mensajes entre actores",
      "mermaid": "sequenceDiagram\\n    autonumber\\n    actor U as 👤 Usuario\\n    participant FE as 🖥️ Frontend\\n    participant API as ⚡ Backend API\\n    participant DB as 🐘 Base de Datos\\n    U->>FE: Interacción\\n    FE->>API: Llamada HTTP\\n    API->>DB: Consulta / Mutación\\n    DB-->>API: Confirmación\\n    API-->>FE: Respuesta JSON\\n    FE-->>U: Renderizado final"
    }
  ]
}`

  const userPrompt = `A continuación tienes la EVIDENCIA REAL del código fuente de este proyecto:

${JSON.stringify(evidence, null, 2)}

Por favor, analiza la arquitectura completa y deduce todos los flujos de negocio reales con sus nodos y diagramas de secuencia UML.`

  // 4. Invocar a la IA
  const aiResult = await callOpenRouter({
    apiKey: effectiveKey,
    model: selectedModel,
    messages: [{ role: 'user', content: userPrompt }],
    systemPrompt,
    maxTokens: 8000
  })

  // 5. Parsear el JSON emitido por la IA
  try {
    fs.writeFileSync(path.join(projectRoot, 'scratch_ai_response.txt'), aiResult.content, 'utf-8')
  } catch {}
  const parsed = extractJsonFromAi(aiResult.content)
  if (!parsed) {
    throw new Error(`No se pudo decodificar la respuesta JSON de la IA. Contenido recibido: ${aiResult.content.slice(0, 300)}...`)
  }

  if (!parsed || !Array.isArray(parsed.flows) || parsed.flows.length === 0) {
    throw new Error('La IA no identificó flujos estructurados válidos a partir de la evidencia del código.')
  }

  // 6. Escribir atómicamente los flujos en .sdd/flows/<id>.json
  const sddDir = path.join(projectRoot, '.sdd')
  const flowsDir = path.join(sddDir, 'flows')
  const seqDir = path.join(sddDir, 'sequences')

  if (!fs.existsSync(flowsDir)) fs.mkdirSync(flowsDir, { recursive: true })
  if (!fs.existsSync(seqDir)) fs.mkdirSync(seqDir, { recursive: true })

  const savedFlows = []
  for (let i = 0; i < parsed.flows.length; i++) {
    const fl = parsed.flows[i]
    const cleanId = (fl.id || `flujo-${i + 1}`).toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    const flowPayload = {
      id: cleanId,
      name: fl.name || `Flujo ${i + 1}`,
      description: fl.description || '',
      priority: fl.priority || 'P0',
      progress: fl.progress !== undefined ? fl.progress : 100,
      origin: 'ai_detected',
      detectedAt: new Date().toISOString(),
      nodes: Array.isArray(fl.nodes) ? fl.nodes : []
    }

    const filePath = path.join(flowsDir, `${cleanId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(flowPayload, null, 2), 'utf-8')
    savedFlows.push(flowPayload)
  }

  // 7. Escribir diagramas de secuencias generados por la IA en .sdd/sequences/sequences.json
  const savedSequences = []
  if (Array.isArray(parsed.sequences) && parsed.sequences.length > 0) {
    const seqFile = path.join(seqDir, 'sequences.json')
    let existingSeqs = []
    if (fs.existsSync(seqFile)) {
      try {
        const loaded = JSON.parse(fs.readFileSync(seqFile, 'utf-8'))
        existingSeqs = Array.isArray(loaded) ? loaded : [loaded]
      } catch {}
    }

    // Fusionar por flowId
    parsed.sequences.forEach(newSeq => {
      const idx = existingSeqs.findIndex(s => s.flowId === newSeq.flowId || s.id === newSeq.id)
      if (idx !== -1) {
        existingSeqs[idx] = { ...existingSeqs[idx], ...newSeq }
      } else {
        existingSeqs.push(newSeq)
      }
      savedSequences.push(newSeq)
    })

    fs.writeFileSync(seqFile, JSON.stringify(existingSeqs, null, 2), 'utf-8')
  }

  return {
    success: true,
    summary: parsed.summary || `Se detectaron ${savedFlows.length} flujos de negocio mediante IA.`,
    flowsCount: savedFlows.length,
    flows: savedFlows,
    sequences: savedSequences,
    modelUsed: aiResult.model,
    tokens: aiResult.usage
  }
}
