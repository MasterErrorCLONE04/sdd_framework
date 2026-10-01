#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import { initializeSdd } from '../src/init.js'
import { scanProject } from '../src/scanner.js'
import { createSddServer } from '../src/server.js'
import { startMcpServer } from '../src/mcp.js'

const args = process.argv.slice(2)
const command = args[0] || 'studio'

let targetDir = process.cwd()
const dirArgIdx = args.indexOf('--dir')
if (dirArgIdx !== -1 && args[dirArgIdx + 1]) {
  targetDir = path.resolve(args[dirArgIdx + 1])
} else if (args[1] && !args[1].startsWith('-') && (command === 'studio' || command === 'init' || command === 'scan' || command === 'genesis')) {
  targetDir = path.resolve(args[1])
}
const projectRoot = targetDir

if (command !== 'mcp') {
  console.log(`\n⚡ Spec-Driven Development (SDD) CLI v1.0.0`)
}

switch (command) {
  case 'init': {
    const isScan = args.includes('--scan')
    console.log(`📦 Inicializando entorno SDD en: ${projectRoot}`)
    if (isScan) console.log(`🔍 Modo --scan activado: detectando arquitectura y código existente...`)
    const res = initializeSdd(projectRoot, { scan: isScan })
    console.log(`✅ Estructura .sdd/ lista.`)
    console.log(`✅ AGENTS.md generado con reglas de calidad y scope protection.`)
    console.log(`\n💡 Tip: Ejecuta 'sdd studio' o 'npx sdd' para abrir la interfaz visual.`)
    break
  }

  case 'scan': {
    console.log(`🔍 Analizando repositorio en: ${projectRoot}...`)
    const findings = scanProject(projectRoot)
    console.log(`\n📊 Diagnóstico Heurístico:`)
    console.log(` - Lenguaje principal: ${findings.language}`)
    console.log(` - Framework: ${findings.framework}`)
    console.log(` - Base de datos: ${findings.database}`)
    console.log(` - Rutas detectadas: ${findings.detectedRoutes.length}`)
    console.log(` - Servicios: ${findings.services.join(', ') || 'N/A'}`)
    
    // Save or update architecture.json
    const archPath = path.join(projectRoot, '.sdd', 'architecture.json')
    if (fs.existsSync(path.join(projectRoot, '.sdd'))) {
      fs.writeFileSync(archPath, JSON.stringify({
        services: findings.inferredArchitecture.services,
        origin: 'inferred',
        lastScan: new Date().toISOString()
      }, null, 2), 'utf-8')
      console.log(`✅ Arquitectura actualizada en .sdd/architecture.json con origen [INFERIDO].`)
    }
    break
  }

  case 'drift': {
    console.log(`🔍 Auditando deriva de Git en: ${projectRoot}...`)
    const { execSync } = await import('child_process')
    try {
      const output = execSync('node scripts/sdd-drift-check.mjs', { cwd: projectRoot, encoding: 'utf-8' })
      console.log(output)
    } catch (e) {
      console.log(e.stdout || e.message)
    }
    break
  }

  case 'genesis': {
    const prompt = args.slice(1).join(' ')
    if (!prompt) {
      console.log(`❌ Especifica tu idea: sdd genesis "una app web para..."`)
      break
    }
    const sddDir = path.join(projectRoot, '.sdd')
    fs.mkdirSync(sddDir, { recursive: true })
    const task = {
      taskId: `genesis-task-${Date.now()}`,
      status: 'pending',
      prompt: prompt,
      assignedTo: 'Antigravity',
      createdAt: new Date().toISOString(),
      projectRoot: projectRoot,
      targetOutputs: [
        '.sdd/project.json',
        '.sdd/core/problem.json',
        '.sdd/core/target-user.json',
        '.sdd/core/scope-boundaries.json',
        '.sdd/core/success-criteria.json',
        '.sdd/core/risks.json',
        '.sdd/requirements/stories/*.json',
        '.sdd/architecture.json',
        '.sdd/database/schema-erd.json',
        '.sdd/flows/*.json',
        'AGENTS.md'
      ]
    }
    fs.writeFileSync(path.join(sddDir, 'genesis_task.json'), JSON.stringify(task, null, 2), 'utf-8')
    console.log(`\n📋 Orden de génesis agéntica creada en .sdd/genesis_task.json`)
    console.log(`💡 Idea: "${prompt}"`)
    console.log(`🤖 Tu agente de Antigravity leerá esta orden, consumirá tokens en el editor y redactará la especificación SDD.`)
    console.log(`🌐 Ejecuta 'sdd studio' para monitorear en vivo la transformación a la cabina.`)
    break
  }

  case 'mcp': {
    // Silencio de logs para no corromper el canal stdio JSON-RPC
    startMcpServer(projectRoot)
    break
  }

  case '--help':
  case '-h':
  case 'help': {
    console.log(`\nComandos disponibles:`)
    console.log(`  sdd studio [--port 3030]  Inicia el servidor local y abre SDD Studio en el navegador`)
    console.log(`  sdd init [--scan]         Inicializa la estructura .sdd/ y AGENTS.md`)
    console.log(`  sdd scan                  Analiza heurísticamente el código y arquitectura del proyecto`)
    console.log(`  sdd drift                 Audita la deriva de Git contra los scopeFiles declarados`)
    console.log(`  sdd mcp                   Inicia el servidor MCP para Antigravity, Cursor y Claude Code`)
    console.log(`  sdd --version             Muestra la versión de SDD CLI`)
    break
  }

  case '--version':
  case '-v': {
    console.log(`sdd version 1.0.0`)
    break
  }

  case 'studio':
  default: {
    // If .sdd does not exist, initialize it automatically first
    const sddDir = path.join(projectRoot, '.sdd')
    if (!fs.existsSync(sddDir)) {
      console.log(`ℹ️  No se detectó .sdd/. Inicializando automáticamente...`)
      initializeSdd(projectRoot, { scan: true })
    }

    const portArgIdx = args.indexOf('--port')
    const port = portArgIdx !== -1 && args[portArgIdx + 1] ? parseInt(args[portArgIdx + 1], 10) : 3030

    try {
      const server = createSddServer(projectRoot, port)
      const boundPort = await server.start()

      // Auto-open browser
      try {
        const { exec } = await import('child_process')
        const startCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open')
        exec(`${startCmd} http://localhost:${boundPort}`)
      } catch {
        // ignore
      }
    } catch {
      process.exit(1)
    }
    break
  }
}
