// SDD Studio — Database & ERD Perspective View

import { state } from '../state.js';

export function renderDatabase() {
  const container = document.getElementById('erd-cards-container');
  if (!container) return;
  container.innerHTML = '';
  const tables = state.appState?.database?.models || state.appState?.database?.entities || state.appState?.database?.tables || [];

  const tabBadgeDb = document.getElementById('tab-badge-db');
  if (tabBadgeDb) tabBadgeDb.innerText = tables.length;

  if (tables.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <div class="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto">
          <i data-lucide="database" class="w-6 h-6"></i>
        </div>
        <h3 class="text-sm font-bold text-zinc-900">No hay modelos de base de datos definidos</h3>
        <p class="text-xs text-zinc-500 max-w-sm mx-auto">Los esquemas de datos relacionales se estructurarán automáticamente cuando especifiques las entidades de tu aplicación en el Chat.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tables.forEach(t => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2';
    card.innerHTML = `
      <div class="text-xs font-black text-cyan-900 border-b border-zinc-200 pb-1 flex items-center justify-between">
        <span>${t.name}</span>
        <span class="text-[10px] font-mono text-zinc-400">${(t.fields || t.attributes || []).length} campos</span>
      </div>
      <div class="space-y-1 font-mono text-[10px]">
        ${(t.fields || t.attributes || []).map(f => `
          <div class="flex justify-between text-zinc-600">
            <span class="${f.isId ? 'font-bold text-amber-700' : ''}">${f.name}</span>
            <span class="text-zinc-400">${f.type}</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(card);
  });
  if (window.lucide) window.lucide.createIcons();
}
