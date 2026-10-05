// SDD Studio — Database & ERD Perspective View

import { state } from '../state.js';

export function renderDatabase() {
  const container = document.getElementById('erd-cards-container');
  if (!container) return;
  container.innerHTML = '';
  const tables = state.appState?.database?.tables || state.appState?.database?.models || state.appState?.database?.entities || [];
  const relationships = state.appState?.database?.relationships || [];

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

  // 1. Render Relationships section if present
  if (relationships.length > 0) {
    const relsCard = document.createElement('div');
    relsCard.className = 'col-span-full bg-white border border-cyan-200/90 rounded-2xl p-5 shadow-xs space-y-3';
    relsCard.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-zinc-100">
        <div class="flex items-center gap-2">
          <i data-lucide="git-fork" class="w-4 h-4 text-cyan-600"></i>
          <span class="text-xs font-black text-zinc-950 uppercase tracking-wider">Grafo de Relaciones & Cardinalidad (ERD)</span>
        </div>
        <span class="text-[10px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-full">${relationships.length} relaciones</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        ${relationships.map(r => `
          <div class="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs font-mono flex items-center justify-between gap-2">
            <span class="font-bold text-zinc-900">${r.fromTable || 'Origen'}.${r.fromColumn || 'id'}</span>
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-200">${r.type || '1:N'}</span>
            <span class="font-bold text-zinc-900">${r.toTable || 'Destino'}.${r.toColumn || 'id'}</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(relsCard);
  }

  // 2. Render Table Cards
  tables.forEach(t => {
    const tableName = t.table || t.name || 'tabla';
    const cols = t.columns || t.fields || t.attributes || [];
    const card = document.createElement('div');
    card.className = 'p-5 rounded-2xl border border-zinc-200 hover:border-cyan-300 bg-white shadow-xs space-y-3 transition-all';
    card.innerHTML = `
      <div class="border-b border-zinc-100 pb-2 flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <i data-lucide="table" class="w-4 h-4 text-cyan-600"></i>
          <span class="text-xs font-black text-zinc-950 font-mono">${tableName}</span>
        </div>
        <span class="text-[10px] font-mono text-zinc-400 font-bold">${cols.length} cols</span>
      </div>
      <div class="space-y-1.5 font-mono text-[11px]">
        ${cols.map(f => {
          const isPk = Boolean(f.isPk || f.isId || f.primaryKey);
          return `
            <div class="flex items-center justify-between py-1 px-1.5 rounded-lg ${isPk ? 'bg-amber-50/70 border border-amber-200/80 font-bold text-amber-950' : 'hover:bg-zinc-50 text-zinc-700'}">
              <span class="flex items-center gap-1.5">
                ${isPk ? '<i data-lucide="key" class="w-3 h-3 text-amber-600"></i>' : '<span class="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>'}
                <span>${f.name || f.field || f.column}</span>
              </span>
              <span class="text-[10px] text-zinc-400 font-normal">${f.type || 'TEXT'}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.appendChild(card);
  });
  if (window.lucide) window.lucide.createIcons();
}
