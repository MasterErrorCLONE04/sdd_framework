// SDD Studio — Quality Assurance (QA) Test Suites View

import { state } from '../state.js';

export function renderQA() {
  const suites = state.appState?.testPlan?.testSuites || state.appState?.testPlan?.suites || [];
  const container = document.getElementById('qa-suites-container');
  if (!container) return;

  if (suites.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <i data-lucide="test-tube-2" class="w-6 h-6"></i>
        </div>
        <h3 class="text-sm font-bold text-zinc-900">No hay suites de prueba QA registradas</h3>
        <p class="text-xs text-zinc-500 max-w-sm mx-auto">El plan de pruebas automatizadas y casos E2E se definirá cuando consolides tus historias en el Chat.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = suites.map(s => `
    <div class="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-zinc-950">${s.name}</span>
        <span class="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">${s.type}</span>
      </div>
      <p class="text-xs text-zinc-600">${s.description || ''}</p>
      <div class="space-y-1 pt-1">
        ${(s.testCases || []).map(tc => `
          <div class="flex items-center justify-between p-2 rounded bg-white border border-zinc-200 text-xs">
            <span><b>${tc.id}:</b> ${tc.title}</span>
            <span class="text-[9px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-1 rounded">${tc.status || 'passed'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  if (window.lucide) window.lucide.createIcons();
}
