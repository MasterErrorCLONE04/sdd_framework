import fs from 'fs'
import path from 'path'
import os from 'os'
import { buildSpecFromAi, persistGenesisStage, scaffoldGenesis } from '../src/genesis.js'

async function runTests() {
  console.log('🧪 Iniciando verificación de ciclo de vida UML en Modo Génesis...')

  // 1. Simular respuesta de la IA en la conversación del usuario
  console.log('\n--- 1. buildSpecFromAi con diálogo conversacional ---')
  const aiTurn1 = {
    projectName: 'GymTrackerPro',
    tagline: 'Plataforma inteligente de rutinas de entrenamiento',
    problem: {
      statement: 'Los usuarios pierden consistencia en sus entrenamientos.',
      painPoints: [
        { id: 'p-1', pain: 'Falta de seguimiento de progreso', severity: 'alta' }
      ]
    },
    services: [
      { id: 'svc-1', label: 'Frontend Web & PWA', tech: 'Vite / React', type: 'Frontend' },
      { id: 'svc-2', label: 'API de Entrenamientos', tech: 'Node.js / Express', type: 'Backend API' },
      { id: 'svc-3', label: 'PostgreSQL DB', tech: 'PostgreSQL 16', type: 'Database' }
    ],
    stories: [
      { id: 'US-001', role: 'Atleta', action: 'Registrar nueva serie de ejercicio', benefit: 'Medir sobrecarga progresiva' }
    ],
    tables: [
      { table: 'atleta', columns: ['id (UUID)', 'nombre (VARCHAR)', 'email (VARCHAR)'] },
      { table: 'rutina', columns: ['id (UUID)', 'atleta_id (UUID)', 'nombre (VARCHAR)', 'fecha (TIMESTAMP)'] },
      { table: 'serie', columns: ['id (UUID)', 'rutina_id (UUID)', 'repeticiones (INT)', 'peso_kg (NUMERIC)'] }
    ],
    currentPhase: 3,
    stage: 'requirements'
  }

  const spec1 = buildSpecFromAi(aiTurn1, 'Quiero una app para registrar mis entrenamientos en el gym')

  if (!Array.isArray(spec1.umlDiagrams) || spec1.umlDiagrams.length !== 14) {
    throw new Error(`❌ Error: Se esperaban 14 diagramas UML en spec1, pero se obtuvieron: ${spec1.umlDiagrams?.length}`)
  }
  console.log(`✅ 1. buildSpecFromAi generó ${spec1.umlDiagrams.length} diagramas UML durante el chat.`)

  const structDiags = spec1.umlDiagrams.filter(d => d.category === 'structural')
  const behavDiags = spec1.umlDiagrams.filter(d => d.category === 'behavioral')
  if (structDiags.length !== 7 || behavDiags.length !== 7) {
    throw new Error(`❌ Error en categorías: ${structDiags.length} estructurales, ${behavDiags.length} comportamiento.`)
  }
  console.log(`✅ Categorías verificadas: 7 estructurales y 7 de comportamiento.`)

  // Verificar que las entidades del dominio de la conversación estén presentes
  const classDiag = spec1.umlDiagrams.find(d => d.id === 'UML-01-CLASS')
  if (!classDiag.mermaid.includes('atleta') || !classDiag.mermaid.includes('rutina')) {
    throw new Error('❌ Error: El diagrama de clases no integró las tablas/entidades del usuario')
  }
  console.log('✅ El diagrama de clases integró las entidades de la conversación (atleta, rutina).')

  // 2. Probar persistGenesisStage
  console.log('\n--- 2. persistGenesisStage persistiendo uml-diagrams.json ---')
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-genesis-uml-'))
  try {
    const stageRes = persistGenesisStage(tempDir, 'architecture', {
      architecture: { services: aiTurn1.services },
      database: { tables: aiTurn1.tables },
      umlDiagrams: spec1.umlDiagrams
    })

    const stageUmlFile = path.join(tempDir, '.sdd', 'sequences', 'uml-diagrams.json')
    if (!fs.existsSync(stageUmlFile)) {
      throw new Error(`❌ Error: No se creó el archivo ${stageUmlFile} en persistGenesisStage`)
    }
    const stageLoaded = JSON.parse(fs.readFileSync(stageUmlFile, 'utf-8'))
    if (!Array.isArray(stageLoaded) || stageLoaded.length !== 14) {
      throw new Error(`❌ Error: El archivo ${stageUmlFile} no contiene los 14 diagramas`)
    }
    console.log(`✅ 2. persistGenesisStage persistió exitosamente ${stageLoaded.length} diagramas UML en disco.`)

    // 3. Probar scaffoldGenesis (Paso final de aprobación del usuario)
    console.log('\n--- 3. scaffoldGenesis (Aprobación y compilación final en cabina) ---')
    const scaffoldTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-scaffold-uml-'))
    const scaffoldRes = scaffoldGenesis(scaffoldTempDir, spec1)

    const scaffoldUmlFile = path.join(scaffoldTempDir, '.sdd', 'sequences', 'uml-diagrams.json')
    if (!fs.existsSync(scaffoldUmlFile)) {
      throw new Error(`❌ Error: No se creó ${scaffoldUmlFile} al ejecutar scaffoldGenesis`)
    }
    const scaffoldLoaded = JSON.parse(fs.readFileSync(scaffoldUmlFile, 'utf-8'))
    if (!Array.isArray(scaffoldLoaded) || scaffoldLoaded.length !== 14) {
      throw new Error(`❌ Error: El archivo scaffold no contiene los 14 diagramas (encontrados: ${scaffoldLoaded.length})`)
    }
    console.log(`✅ 3. scaffoldGenesis compiló exitosamente los ${scaffoldLoaded.length} diagramas UML en .sdd/sequences/uml-diagrams.json`)

    // Limpieza
    fs.rmSync(scaffoldTempDir, { recursive: true, force: true })
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!')
}

runTests().catch(err => {
  console.error(err)
  process.exit(1)
})
