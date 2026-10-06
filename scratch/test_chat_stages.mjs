import assert from 'assert'
import { buildSpecFromAi, getStagePromptInstructions } from '../src/genesis.js'

console.log('--- Testing Progressive Genesis Stages & buildSpecFromAi ---')

// 1. Stage 1 (Discovery)
const stage1Data = {
  stage: 'discovery',
  currentPhase: 1,
  projectName: 'VetClinicApp',
  tagline: 'Gestión moderna y compasiva para clínicas veterinarias',
  problem: {
    statement: 'Las clínicas veterinarias pierden 40% del tiempo en historiales físicos y citas desorganizadas.',
    painPoints: [
      { id: 'p-1', pain: 'Historiales médicos en papel extraviados', severity: 'alta', evidence: 'Demora de 15m por consulta', solution: 'Historial clínico digital indexado' },
      { id: 'p-2', pain: 'Inasistencias a turnos de vacunación', severity: 'media', evidence: '25% de citas no atendidas', solution: 'Recordatorios automatizados' }
    ]
  },
  targetUsers: [
    { id: 'usr-1', role: 'Médico Veterinario', need: 'Registrar diagnósticos y recetas en 30 segundos', frequency: 'Diaria' },
    { id: 'usr-2', role: 'Tutor de Mascota', need: 'Ver historial de vacunas y próximas citas', frequency: 'Recurrente' }
  ]
}

const spec1 = buildSpecFromAi(stage1Data, 'Quiero una app para clínica veterinaria')
assert.strictEqual(spec1.project.name, 'VetClinicApp')
assert.strictEqual(spec1.stage, 'discovery')
assert.strictEqual(spec1.currentPhase, 1)
assert.strictEqual(spec1.readyToScaffold, false, 'Stage 1 MUST NOT be readyToScaffold')
assert.strictEqual(spec1.core.problem.painPoints.length, 2)
assert.strictEqual(spec1.core.targetUsers.personas.length, 2)
console.log('✅ Stage 1 (Discovery) verified: readyToScaffold is FALSE, problem and users correctly populated.')

// 2. Stage 2 (Product & Scope)
const stage2Data = {
  stage: 'product',
  currentPhase: 2,
  modules: [
    { id: 'mod-1', name: 'Gestión de Pacientes & Tutores', description: 'Registro de mascotas y sus tutores' },
    { id: 'mod-2', name: 'Historial Clínico & Vacunación', description: 'Fichas médicas y planes sanitarios' },
    { id: 'mod-3', name: 'Agenda & Recordatorios', description: 'Calendario de turnos veterinarios' }
  ],
  inScopeV1: ['Ficha médica básica', 'Registro de vacunas', 'Calendario de citas'],
  nonGoals: [
    { feature: 'Venta de productos / E-commerce de alimentos', rationale: 'Congelado para V2 para priorizar atención médica' },
    { feature: 'Facturación electrónica compleja multi-país', rationale: 'Congelado para V2 para simplificar lanzamiento MVP' },
    { feature: 'App móvil nativa en iOS/Android', rationale: 'V1 será Progressive Web App (PWA) responsiva' }
  ]
}

const spec2 = buildSpecFromAi(stage2Data, 'Avancemos a la Etapa 2: Alcance y Non-Goals', spec1)
assert.strictEqual(spec2.project.name, 'VetClinicApp', 'Must preserve project name from stage 1')
assert.strictEqual(spec2.stage, 'product')
assert.strictEqual(spec2.currentPhase, 2)
assert.strictEqual(spec2.readyToScaffold, false, 'Stage 2 MUST NOT be readyToScaffold')
assert.strictEqual(spec2.product.modules.length, 3, 'Must have 3 modules')
assert.strictEqual(spec2.core.scopeBoundaries.explicitNonGoals.length, 3, 'Must have 3 explicit non-goals')
assert.strictEqual(spec2.core.problem.painPoints.length, 2, 'Must preserve pain points from stage 1')
console.log('✅ Stage 2 (Product) verified: accumulated from stage 1, readyToScaffold is FALSE, modules and non-goals populated.')

// 3. Stage 3 (Requirements & Gherkin)
const stage3Data = {
  stage: 'requirements',
  currentPhase: 3,
  businessRules: [
    { id: 'BR-001', code: 'BR-001', rule: 'Toda mascota debe estar vinculada obligatoriamente a un tutor con número de contacto.', category: 'Business Logic' },
    { id: 'BR-002', code: 'BR-002', rule: 'Las dosis de vacunación deben registrar fecha de aplicación y lote.', category: 'Clinical Safety' }
  ],
  stories: [
    {
      id: 'US-001',
      title: 'Registro de nuevo paciente canino/felino',
      role: 'veterinario',
      action: 'registrar una nueva mascota con los datos del tutor',
      benefit: 'iniciar el historial médico del animal',
      priority: 'P0',
      scopeFiles: ['src/patients/**'],
      acceptanceCriteria: [
        { id: 'c-1', scenario: 'Registro exitoso con tutor válido', given: 'un veterinario autenticado', when: 'ingresa datos de mascota y tutor válido', then: 'se genera ficha médica única', done: false }
      ]
    }
  ]
}

const spec3 = buildSpecFromAi(stage3Data, 'Avancemos a Etapa 3', spec2)
assert.strictEqual(spec3.currentPhase, 3)
assert.strictEqual(spec3.readyToScaffold, false, 'Stage 3 MUST NOT be readyToScaffold')
assert.strictEqual(spec3.requirements.userStories.length, 1)
assert.strictEqual(spec3.businessRules.length, 2)
assert.strictEqual(spec3.product.modules.length, 3, 'Must preserve modules from stage 2')
console.log('✅ Stage 3 (Requirements) verified: stories and business rules added, stage 1 & 2 preserved, readyToScaffold is FALSE.')

// 4. Stage 6 (Execution & Ready)
const stage6Data = {
  stage: 'ready',
  currentPhase: 6,
  readyToScaffold: true,
  phases: [
    { id: 'phase-1', name: 'Fase 1: Configuración & Base de Datos', order: 1, status: 'planned' },
    { id: 'phase-2', name: 'Fase 2: Core API & Lógica Clínica', order: 2, status: 'planned' }
  ],
  tasks: [
    { id: 'task-1', title: 'Crear esquema ERD y migraciones', scopeFiles: ['src/db/**'], status: 'planned' }
  ]
}

const spec6 = buildSpecFromAi(stage6Data, 'Finalizar y compilar', spec3)
assert.strictEqual(spec6.currentPhase, 6)
assert.strictEqual(spec6.stage, 'ready')
assert.strictEqual(spec6.readyToScaffold, true, 'Stage 6 MUST be readyToScaffold TRUE')
assert.strictEqual(spec6.product.modules.length, 3, 'Must preserve modules')
assert.strictEqual(spec6.requirements.userStories.length, 1, 'Must preserve stories')
console.log('✅ Stage 6 (Execution/Ready) verified: readyToScaffold is TRUE, entire specification preserved.')

// 5. Test Stage Instructions
for (const stage of ['discovery', 'product', 'requirements', 'ux', 'architecture', 'execution']) {
  const instructions = getStagePromptInstructions(stage, 1)
  assert.ok(instructions.includes('ETAPA ACTIVA'), `Instructions for ${stage} must include active stage`)
  assert.ok(instructions.includes('FORMATO JSON ESPERADO'), `Instructions for ${stage} must include JSON schema`)
}
console.log('✅ All 6 stage prompt instructions verified.')

console.log('\n🎉 ALL PROGRESSIVE GENESIS STAGE TESTS PASSED!')
