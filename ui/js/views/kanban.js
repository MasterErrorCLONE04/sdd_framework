// SDD Studio — Kanban Sprint Board & Handoff Perspective View

import { state } from '../state.js';
import { patchSdd, dispatchExecutionTask, completeExecutionTask } from '../api.js';
import { showToast } from '../utils.js';

let currentPhaseFilter = 'all';

export function renderKanban() {
  const execution = state.appState?.execution || {};
  let tasks = Array.isArray(execution.tasks) && execution.tasks.length > 0
    ? execution.tasks
    : [];

  const phases = Array.isArray(execution.phases) ? execution.phases : [];

  // Fallback si aún no hay execution.tasks: usar requirements.userStories
  if (tasks.length === 0) {
    const stories = state.appState?.requirements?.userStories || [];
    tasks = stories.map(s => ({
      id: s.id,
      title: s.title,
      description: `${s.role || ''} ${s.action || ''} ${s.benefit || ''}`.trim(),
      phaseId: s.epicId || 'phase-1',
      difficulty: s.points <= 2 ? 'S' : (s.points <= 5 ? 'M' : 'L'),
      status: s.status === 'backlog' ? 'planned' : (s.status === 'todo' ? 'planned' : s.status),
      scopeFiles: s.scopeFiles || ['src/**'],
      dependencies: [],
      acceptanceCriteria: s.acceptanceCriteria || [],
      assignedTo: s.assignedTo || 'Antigravity'
    }));
  }

  // Actualizar badge de total de tareas y tab badge en sidebar
  const totalTasksBadge = document.getElementById('kanban-total-tasks-badge');
  if (totalTasksBadge) {
    totalTasksBadge.innerText = `${tasks.length} tareas`;
  }

  const tabBadgeKanban = document.getElementById('tab-badge-kanban');
  if (tabBadgeKanban) {
    const inProg = tasks.filter(t => t.status === 'in_progress').length;
    tabBadgeKanban.innerText = inProg > 0 ? `${inProg} act` : String(tasks.length);
  }

  // Poblar selector de fases
  const phaseSelect = document.getElementById('kanban-phase-filter');
  if (phaseSelect) {
    const previousVal = phaseSelect.value || currentPhaseFilter;
    phaseSelect.innerHTML = '<option value="all">Todas las Fases</option>';
    phases.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      const statusIcon = p.status === 'done' ? '✓ ' : '';
      opt.textContent = `${statusIcon}${p.name} (${p.status})`;
      phaseSelect.appendChild(opt);
    });
    if (Array.from(phaseSelect.options).some(o => o.value === previousVal)) {
      phaseSelect.value = previousVal;
      currentPhaseFilter = previousVal;
    } else {
      phaseSelect.value = 'all';
      currentPhaseFilter = 'all';
    }
  }

  // Renderizar banner de tarea activa
  renderActiveTaskBanner(tasks);

  // Filtrar tareas por fase seleccionada
  const filteredTasks = currentPhaseFilter === 'all'
    ? tasks
    : tasks.filter(t => t.phaseId === currentPhaseFilter);

  // Columnas Kanban
  const colTodo = document.getElementById('kanban-col-todo');
  const colInprog = document.getElementById('kanban-col-inprog');
  const colReview = document.getElementById('kanban-col-review');
  const colDone = document.getElementById('kanban-col-done');

  if (!colTodo || !colInprog || !colDone) return;

  colTodo.innerHTML = '';
  colInprog.innerHTML = '';
  if (colReview) colReview.innerHTML = '';
  colDone.innerHTML = '';

  let cTodo = 0, cInp = 0, cRev = 0, cDone = 0;

  filteredTasks.forEach(task => {
    // Evaluar bloqueos por dependencias
    const uncompletedDeps = (task.dependencies || []).filter(depId => {
      const depTask = tasks.find(t => t.id === depId);
      return !depTask || depTask.status !== 'done';
    });
    const isBlocked = uncompletedDeps.length > 0 && task.status !== 'done';

    // Dificultad color badge
    const diffColor = getDifficultyBadgeColor(task.difficulty);

    // Criterios Gherkin completados
    const totalCrit = task.acceptanceCriteria?.length || 0;
    const doneCrit = task.acceptanceCriteria?.filter(c => c.done).length || 0;

    const card = document.createElement('div');
    card.className = `bg-white border ${isBlocked ? 'border-amber-300/80 bg-amber-50/20' : 'border-zinc-200'} rounded-xl p-3.5 shadow-2xs space-y-2.5 transition-all hover:border-zinc-300`;

    const scopeCount = Array.isArray(task.scopeFiles) ? task.scopeFiles.length : 0;
    const scopeTooltip = (task.scopeFiles || []).slice(0, 3).join(', ') + (scopeCount > 3 ? '...' : '');

    card.innerHTML = `
      <div class="flex items-center justify-between gap-1">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] font-mono font-black text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">${task.id}</span>
          <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${diffColor}">
            ${task.difficulty || 'M'}
          </span>
          ${task.phaseId ? `<span class="text-[9px] text-zinc-500 font-medium px-1 rounded bg-zinc-100">${task.phaseId}</span>` : ''}
        </div>
        ${task.assignedTo ? `<span class="text-[9px] font-mono text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">🤖 ${task.assignedTo}</span>` : ''}
      </div>

      <div>
        <div class="text-xs font-bold text-zinc-900 leading-snug">${escapeHtml(task.title)}</div>
        ${task.description ? `<p class="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">${escapeHtml(task.description)}</p>` : ''}
      </div>

      <!-- Scope Shield & Criterios -->
      <div class="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 text-[10px]">
        <div class="flex items-center gap-1 text-emerald-700 font-mono font-bold" title="${escapeHtml(scopeTooltip)}">
          <span>🛡️ ${scopeCount} arch.</span>
        </div>
        ${totalCrit > 0 ? `
          <div class="text-zinc-500 font-mono font-semibold">
            🧪 <span class="${doneCrit === totalCrit ? 'text-emerald-600 font-bold' : 'text-amber-600'}">${doneCrit}/${totalCrit}</span>
          </div>
        ` : ''}
      </div>

      <!-- Alerta de Bloqueo si aplica -->
      ${isBlocked ? `
        <div class="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-1 rounded-md flex items-center gap-1">
          <span>⚠️ Bloqueada por:</span>
          <span class="font-mono font-bold">${uncompletedDeps.join(', ')}</span>
        </div>
      ` : ''}

      <!-- Acciones y Movimiento de Estado -->
      <div class="flex items-center justify-between pt-1 gap-2">
        <div>
          ${task.status === 'planned' && !isBlocked ? `
            <button onclick="dispatchExecutionTaskUi('${task.id}')" class="text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer">
              <span>⚡ Despachar</span>
            </button>
          ` : (task.status === 'in_progress' ? `
            <button onclick="completeExecutionTaskUi('${task.id}')" class="text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer">
              <span>✓ Aprobar</span>
            </button>
          ` : '')}
        </div>

        <select onchange="updateTaskStatusUi('${task.id}', this.value)" class="text-[10px] font-mono bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-700 cursor-pointer">
          <option value="planned" ${task.status === 'planned' || task.status === 'todo' || task.status === 'backlog' ? 'selected' : ''}>Planificada</option>
          <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>En Curso</option>
          <option value="review" ${task.status === 'review' ? 'selected' : ''}>Revisión</option>
          <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
    `;

    if (task.status === 'done') {
      colDone.appendChild(card);
      cDone++;
    } else if (task.status === 'review') {
      if (colReview) colReview.appendChild(card);
      else colInprog.appendChild(card);
      cRev++;
    } else if (task.status === 'in_progress') {
      colInprog.appendChild(card);
      cInp++;
    } else {
      colTodo.appendChild(card);
      cTodo++;
    }
  });

  const badgeTodo = document.getElementById('kanban-badge-todo');
  const badgeInprog = document.getElementById('kanban-badge-inprog');
  const badgeReview = document.getElementById('kanban-badge-review');
  const badgeDone = document.getElementById('kanban-badge-done');

  if (badgeTodo) badgeTodo.innerText = cTodo;
  if (badgeInprog) badgeInprog.innerText = cInp;
  if (badgeReview) badgeReview.innerText = cRev;
  if (badgeDone) badgeDone.innerText = cDone;
}

function renderActiveTaskBanner(allTasks) {
  const banner = document.getElementById('kanban-active-task-banner');
  if (!banner) return;

  const activeTask = state.appState?.activeTask ||
    state.appState?.governance?.agentContext?.activeTask ||
    allTasks.find(t => t.status === 'in_progress');

  if (!activeTask || activeTask.status !== 'in_progress') {
    banner.classList.add('hidden');
    return;
  }

  banner.classList.remove('hidden');

  const idBadge = document.getElementById('active-task-id-badge');
  const phaseBadge = document.getElementById('active-task-phase-badge');
  const agentBadge = document.getElementById('active-task-agent-badge');
  const titleEl = document.getElementById('active-task-title');
  const descEl = document.getElementById('active-task-desc');
  const scopeContainer = document.getElementById('active-task-scope-chips');
  const critList = document.getElementById('active-task-criteria-list');
  const critScore = document.getElementById('active-task-criteria-score');

  const taskId = activeTask.id || activeTask.taskId || 'ACTIVE';
  if (idBadge) idBadge.innerText = taskId;
  if (phaseBadge) phaseBadge.innerText = activeTask.phaseName || activeTask.phaseId || 'Fase';
  if (agentBadge) agentBadge.innerText = `🤖 ${activeTask.assignedTo || 'Antigravity'}`;
  if (titleEl) titleEl.innerText = activeTask.title || 'Tarea Activa';
  if (descEl) descEl.innerText = activeTask.description || 'Tarea despachada al agente de IA con directivas de convergencia.';

  // Whitelist chips
  if (scopeContainer) {
    scopeContainer.innerHTML = '';
    const scopes = Array.isArray(activeTask.scopeFiles) ? activeTask.scopeFiles : ['src/**'];
    scopes.forEach(sc => {
      const chip = document.createElement('span');
      chip.className = 'text-[10px] font-mono bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-md font-semibold';
      chip.textContent = sc;
      scopeContainer.appendChild(chip);
    });
  }

  // Criterios Gherkin
  const criteria = Array.isArray(activeTask.acceptanceCriteria) ? activeTask.acceptanceCriteria : [];
  if (critScore) {
    const doneCount = criteria.filter(c => c.done).length;
    critScore.innerText = `${doneCount}/${criteria.length} cumplidos`;
  }

  if (critList) {
    critList.innerHTML = '';
    criteria.forEach((crit, idx) => {
      const item = document.createElement('div');
      item.className = 'text-[11px] bg-white/80 border border-zinc-200/80 rounded px-2 py-1 flex items-start gap-1.5';
      item.innerHTML = `
        <span class="${crit.done ? 'text-emerald-600 font-bold' : 'text-zinc-400'}">${crit.done ? '✓' : '○'}</span>
        <div class="flex-1">
          <span class="font-bold text-zinc-800">${escapeHtml(crit.scenario || `Criterio ${idx + 1}`)}:</span>
          <span class="text-zinc-600"> Dado ${escapeHtml(crit.given || '')}, Cuando ${escapeHtml(crit.when || '')}, Entonces ${escapeHtml(crit.then || '')}</span>
        </div>
      `;
      critList.appendChild(item);
    });
  }

  // Configurar botón de completar tarea activa
  const completeBtn = document.getElementById('btn-complete-active-task');
  if (completeBtn) {
    completeBtn.onclick = () => completeExecutionTaskUi(taskId);
  }
}

function getDifficultyBadgeColor(diff) {
  switch ((diff || '').toUpperCase()) {
    case 'XS':
    case 'S':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'M':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'L':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'XL':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function filterKanbanByPhase(phaseId) {
  currentPhaseFilter = phaseId || 'all';
  renderKanban();
}

export async function dispatchExecutionTaskUi(taskId) {
  try {
    showToast(`Despachando tarea ${taskId} al agente...`);
    await dispatchExecutionTask(taskId, 'Antigravity');
    showToast(`⚡ Tarea ${taskId} despachada con éxito a Antigravity`);
    if (window.loadData) await window.loadData();
  } catch (err) {
    showToast(err.message || 'Error al despachar tarea', 'alert-circle');
  }
}

export async function completeExecutionTaskUi(taskId) {
  try {
    showToast(`Aprobando y completando tarea ${taskId}...`);
    const res = await completeExecutionTask(taskId);
    if (res.phaseCompleted) {
      showToast(`🏆 ¡Fase completada! Compuerta de calidad aprobada.`, 'check-circle');
    } else {
      showToast(`✓ Tarea ${taskId} completada con éxito`);
    }
    if (window.loadData) await window.loadData();
  } catch (err) {
    showToast(err.message || 'Error al completar tarea', 'alert-circle');
  }
}

export async function dispatchNextEligibleTask() {
  const execution = state.appState?.execution || {};
  const tasks = Array.isArray(execution.tasks) ? execution.tasks : [];

  const eligible = tasks.find(t => {
    if (t.status !== 'planned') return false;
    const deps = Array.isArray(t.dependencies) ? t.dependencies : [];
    return deps.every(depId => tasks.find(ot => ot.id === depId)?.status === 'done');
  });

  if (!eligible) {
    showToast('No hay tareas elegibles listas para despacho.', 'info');
    return;
  }

  await dispatchExecutionTaskUi(eligible.id);
}

export async function updateTaskStatusUi(taskId, status) {
  try {
    await patchSdd({
      task: { id: taskId, status }
    });
    showToast(`Estado de ${taskId} actualizado a ${status}`);
    if (window.loadData) await window.loadData();
  } catch (err) {
    showToast('Error al actualizar estado de la tarea', 'alert-circle');
  }
}

// Compatibilidad retroactiva con historias de usuario
export async function updateStoryStatus(storyId, status) {
  try {
    await patchSdd({ storyId, status });
    showToast(`Estado: ${status}`);
    if (window.loadData) await window.loadData();
  } catch {
    showToast('Error al actualizar estado', 'alert-circle');
  }
}

// Exponer funciones en window para invocaciones inline de HTML
window.filterKanbanByPhase = filterKanbanByPhase;
window.dispatchExecutionTaskUi = dispatchExecutionTaskUi;
window.completeExecutionTaskUi = completeExecutionTaskUi;
window.dispatchNextEligibleTask = dispatchNextEligibleTask;
window.updateTaskStatusUi = updateTaskStatusUi;
window.updateStoryStatus = updateStoryStatus;
