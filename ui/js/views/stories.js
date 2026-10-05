// SDD Studio — Stories & Gherkin Agile Perspective View

import { state } from '../state.js';
import { patchSdd } from '../api.js';
import { showToast, escapeHtml } from '../utils.js';

export function renderStories() {
  const container = document.getElementById('stories-cards-container');
  if (!container) return;
  container.innerHTML = '';
  const stories = state.appState?.requirements?.userStories || [];

  const tabBadge = document.getElementById('tab-badge-stories');
  if (tabBadge) tabBadge.innerText = stories.length;

  const statCount = document.getElementById('stories-stat-count');
  if (statCount) statCount.innerText = stories.length;

  const totalPoints = stories.reduce((acc, s) => acc + (Number(s.points) || 3), 0);
  const statPoints = document.getElementById('stories-stat-points');
  if (statPoints) statPoints.innerText = totalPoints;

  let totalCriteria = 0;
  let passedCriteria = 0;
  stories.forEach(s => {
    (s.acceptanceCriteria || []).forEach(c => {
      totalCriteria++;
      if (c.done) passedCriteria++;
    });
  });
  const passedPct = totalCriteria > 0 ? Math.round((passedCriteria / totalCriteria) * 100) : 100;
  const statPassed = document.getElementById('stories-stat-passed');
  if (statPassed) statPassed.innerText = `${passedPct}%`;

  if (stories.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <i data-lucide="file-question" class="w-6 h-6"></i>
        </div>
        <h3 class="text-sm font-bold text-zinc-900">No hay historias creadas</h3>
        <p class="text-xs text-zinc-500 max-w-sm mx-auto">Escribe tus requerimientos en el Chat para que tu Agente de IA estructure historias atómicas gobernadas por Gherkin.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  stories.forEach(s => {
    const isInferred = s.origin === 'inferred';
    const card = document.createElement('div');
    card.className = 'bg-white border border-zinc-200 hover:border-purple-300 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-5';

    const criteriaList = s.acceptanceCriteria || [];
    const doneCount = criteriaList.filter(c => c.done).length;

    card.innerHTML = `
      <!-- Top Row: ID, Title, Badges, Status -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            ${escapeHtml(s.id)}
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black ${
            s.type === 'bug'
              ? 'bg-rose-100 text-rose-800 border border-rose-200'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }">
            ${s.type === 'bug' ? '🐛 BUG / FIX' : '✨ FEATURE'}
          </span>
          <h3 class="text-sm md:text-base font-bold text-zinc-950 tracking-tight">
            ${escapeHtml(s.title)}
          </h3>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            isInferred ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          } flex items-center gap-1">
            <i data-lucide="${isInferred ? 'help-circle' : 'check'}" class="w-3 h-3 ${isInferred ? 'text-amber-600' : 'text-emerald-600'}"></i>
            <span>${isInferred ? 'Inferido' : 'Confirmado'}</span>
          </span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            ${s.points || 3} pts
          </span>
          ${isInferred ? `<button onclick="confirmOrigin('story', '${s.id}')" class="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer">Confirmar</button>` : ''}
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto">
          <select
            onchange="updateStoryStatus('${s.id}', this.value)"
            class="text-xs font-bold font-mono px-3 py-1.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-200 ${
              s.status === 'done' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                : s.status === 'in_progress' 
                ? 'bg-purple-50 text-purple-900 border-purple-300' 
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }"
          >
            <option value="backlog" ${s.status === 'backlog' || s.status === 'todo' ? 'selected' : ''}>📋 BACKLOG</option>
            <option value="in_progress" ${s.status === 'in_progress' ? 'selected' : ''}>⚡ EN CURSO</option>
            <option value="done" ${s.status === 'done' ? 'selected' : ''}>✓ TERMINADO</option>
          </select>
        </div>
      </div>

      <!-- Narrative Section: Como / Quiero / Para -->
      <div class="rounded-xl bg-gradient-to-r from-zinc-50 to-purple-50/20 border border-zinc-200/80 p-4 space-y-1.5">
        <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
          <i data-lucide="user-check" class="w-3.5 h-3.5 text-purple-600"></i>
          <span>Narrativa de Usuario (Jira Spec)</span>
        </div>
        <div class="text-xs text-zinc-700 leading-relaxed font-normal">
          <span class="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px] uppercase">Como</span>
          <b class="text-zinc-950 font-semibold">${escapeHtml(s.role || s.asA || 'usuario')}</b>,
          <span class="inline-block px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px] uppercase ml-1">Quiero</span>
          <b class="text-zinc-950 font-semibold">${escapeHtml(s.action || s.iWant || '')}</b>
          <span class="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] uppercase ml-1">Para</span>
          <span class="text-zinc-800">${escapeHtml(s.benefit || s.soThat || '')}</span>.
        </div>
      </div>

      ${s.type === 'bug' ? `
        <!-- Spec Kit Bug Diagnostic & Root Cause Box -->
        <div class="rounded-xl bg-rose-50/50 border border-rose-200 p-4 space-y-2">
          <div class="text-[10px] font-mono font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
            <i data-lucide="bug" class="w-3.5 h-3.5 text-rose-600"></i>
            <span>Diagnóstico & Causa Raíz (Bug Fix Workflow)</span>
          </div>
          ${s.reproductionSteps ? `
            <div class="text-xs text-zinc-700">
              <b class="text-rose-950">Pasos de Reproducción:</b> ${escapeHtml(s.reproductionSteps)}
            </div>
          ` : ''}
          ${s.rootCause ? `
            <div class="text-xs text-zinc-700">
              <b class="text-rose-950">Causa Raíz Identificada:</b> ${escapeHtml(s.rootCause)}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Acceptance Criteria (Gherkin Scenarios) -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
            <span>Criterios de Aceptación Gherkin:</span>
          </span>
          <span class="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full border border-zinc-200">
            ${doneCount}/${criteriaList.length} Validados
          </span>
        </div>

        <div class="space-y-2">
          ${criteriaList.map(c => `
            <label class="flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
              c.done ? 'bg-emerald-50/40 border-emerald-200/80 text-zinc-500' : 'bg-white border-zinc-200/80 hover:border-purple-200 shadow-2xs text-zinc-800'
            }">
              <input
                type="checkbox"
                ${c.done ? 'checked' : ''}
                onchange="toggleCriterion('${s.id}', '${c.id}', this.checked)"
                class="mt-0.5 w-4 h-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
              >
              <div class="text-xs leading-relaxed flex-1">
                ${c.scenario ? `<span class="font-bold text-zinc-900 block mb-0.5">${escapeHtml(c.scenario)}</span>` : ''}
                <span class="${c.done ? 'line-through text-zinc-400' : 'text-zinc-800 font-medium'}">
                  ${c.text ? escapeHtml(c.text) : `${c.given ? `<b class="text-purple-700">Dado:</b> ${escapeHtml(c.given)} ` : ''}${c.when ? `<b class="text-indigo-700">Cuando:</b> ${escapeHtml(c.when)} ` : ''}${c.then ? `<b class="text-emerald-700">Entonces:</b> ${escapeHtml(c.then)}` : ''}`}
                </span>
              </div>
              <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                c.done ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : 'text-zinc-400 bg-zinc-100 border border-zinc-200'
              }">
                ${c.done ? 'PASSED' : 'PENDING'}
              </span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Scope Protection Files -->
      <div class="pt-3 border-t border-zinc-100 space-y-2">
        <div class="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          <span class="flex items-center gap-1.5">
            <i data-lucide="shield" class="w-3.5 h-3.5 text-purple-600"></i>
            <span>Archivos en Alcance Blindados (Scope Protection):</span>
          </span>
          <span class="text-emerald-700 font-bold">Sin Deriva de Código</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${(s.scopeFiles || []).map(f => `
            <span class="inline-flex items-center gap-1.5 text-[11px] font-mono bg-zinc-50 text-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 shadow-2xs font-semibold hover:border-purple-300 transition-colors">
              <i data-lucide="file-code" class="w-3 h-3 text-purple-600"></i>
              <code>${escapeHtml(f)}</code>
            </span>
          `).join('')}
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

export async function toggleCriterion(storyId, criterionId, isDone) {
  try {
    await patchSdd({ storyId, criterionId, done: isDone });
    showToast('Criterio guardado en disco');
    if (window.loadData) await window.loadData();
  } catch {
    showToast('Error', 'alert-circle');
  }
}

export async function confirmOrigin(entityType, entityId) {
  try {
    await patchSdd({ confirmOrigin: true, entityType, entityId });
    showToast('Especificación confirmada formalmente');
    if (window.loadData) await window.loadData();
  } catch {
    showToast('Error', 'alert-circle');
  }
}
