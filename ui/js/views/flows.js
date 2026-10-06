// SDD Studio — Flows & Node Pipelines Perspective View

import { state } from '../state.js';
import { patchSdd } from '../api.js';
import { showToast } from '../utils.js';

let currentFlowsTab = 'all'; // 'all' | 'business' | 'user'

export function renderFlows() {
  const container = document.getElementById('flows-cards-container');
  if (!container) return;
  container.innerHTML = '';
  const businessFlows = state.appState?.businessFlows || state.appState?.flows || [];
  const userFlows = state.appState?.userFlows || [];

  const tabBadgeFlows = document.getElementById('tab-badge-flows');
  if (tabBadgeFlows) {
    tabBadgeFlows.innerText = String(businessFlows.length + userFlows.length);
  }

  // Bind discover button in top bar if present
  const topBtn = document.getElementById('btn-discover-flows-ai');
  if (topBtn) {
    topBtn.onclick = () => discoverFlowsWithAi();
  }

  if (businessFlows.length === 0 && userFlows.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-4 shadow-2xs">
        <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
          <i data-lucide="layers" class="w-6 h-6"></i>
        </div>
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-zinc-900">No hay flujos de proceso registrados</h3>
          <p class="text-xs text-zinc-500 max-w-md mx-auto">La IA puede inspeccionar las rutas, vistas y esquemas de base de datos reales de este proyecto para deducir todos los flujos de punta a punta.</p>
        </div>
        <div class="pt-2">
          <button onclick="discoverFlowsWithAi()" class="px-4 py-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold inline-flex items-center gap-2 transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-95">
            <i data-lucide="sparkles" class="w-4 h-4 text-teal-400"></i>
            <span>Descubrir Flujos de este Proyecto con IA</span>
          </button>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Segmented Tab Selector
  const filterRow = document.createElement('div');
  filterRow.className = 'col-span-full flex flex-wrap items-center gap-2 pb-2';
  filterRow.innerHTML = `
    <button onclick="window.setFlowsTab('all')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentFlowsTab === 'all' ? 'bg-zinc-950 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}">
      Todos (${businessFlows.length + userFlows.length})
    </button>
    <button onclick="window.setFlowsTab('business')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentFlowsTab === 'business' ? 'bg-teal-700 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}">
      ⚙️ Flujos de Negocio (${businessFlows.length})
    </button>
    <button onclick="window.setFlowsTab('user')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentFlowsTab === 'user' ? 'bg-indigo-700 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}">
      👤 Flujos de Usuario (${userFlows.length})
    </button>
  `;
  container.appendChild(filterRow);

  // 1. Render User Flows
  if (currentFlowsTab === 'all' || currentFlowsTab === 'user') {
    userFlows.forEach(uf => {
      const card = document.createElement('div');
      card.className = 'bg-white border border-indigo-200/90 hover:border-indigo-400 rounded-2xl p-5 shadow-xs space-y-4 transition-all';
      card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-black text-zinc-950">${uf.name}</span>
            <span class="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
              👤 ${uf.actor || 'Usuario'}
            </span>
          </div>
          <span class="text-[11px] font-mono font-bold text-zinc-400">${(uf.steps || []).length} pasos</span>
        </div>
        <p class="text-xs text-zinc-600">${uf.description || ''}</p>
        <div class="space-y-2 pt-2 border-t border-zinc-100">
          ${(uf.steps || []).map((step, idx) => `
            <div class="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 text-xs">
              <span class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                ${step.order || idx + 1}
              </span>
              <div class="space-y-0.5 flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-bold text-zinc-900">${step.action}</span>
                  <code class="text-[10px] text-zinc-500 font-mono shrink-0">${step.screen || '/'}</code>
                </div>
                <div class="text-[11px] text-zinc-500">↳ ${step.outcome}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      container.appendChild(card);
    });
  }

  // 2. Render Business Flows
  if (currentFlowsTab === 'all' || currentFlowsTab === 'business') {
    businessFlows.forEach(f => {
      const card = document.createElement('div');
      card.className = 'bg-white border border-zinc-200 hover:border-teal-300 rounded-2xl p-5 shadow-xs space-y-4 transition-all';
      card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-black text-zinc-950">${f.name}</span>
            <span class="text-[9px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded uppercase">Backend</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="openSequenceForFlow('${f.id}')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer" title="Ver diagrama de secuencia para este flujo">
              <i data-lucide="workflow" class="w-3 h-3 text-purple-600"></i>
              <span>Secuencia UML →</span>
            </button>
            <span class="text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">${f.progress || 0}%</span>
          </div>
        </div>
        <p class="text-xs text-zinc-600">${f.description || ''}</p>
        <div class="space-y-3">
          ${(f.nodes || []).map(n => `
            <div class="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-zinc-900">${n.name}</span>
                <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${n.status === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${n.status}</span>
              </div>
              <div class="space-y-1">
                ${(n.checklist || []).map(t => `
                  <div class="flex items-center gap-2 text-xs">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleFlowTask('${f.id}', '${n.id}', '${t.id}', this.checked)" class="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer">
                    <span class="${t.done ? 'line-through text-zinc-400' : 'text-zinc-700'}">${t.text}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
      container.appendChild(card);
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

window.setFlowsTab = function(tab) {
  currentFlowsTab = tab;
  renderFlows();
};

export async function toggleFlowTask(flowId, nodeId, taskId, isDone) {
  try {
    await patchSdd({ flowId, nodeId, taskId, done: isDone });
    showToast('Tarea actualizada');
    if (window.loadData) await window.loadData();
  } catch {
    showToast('Error', 'alert-circle');
  }
}

export async function discoverFlowsWithAi() {
  const btns = [
    document.getElementById('btn-discover-flows-ai'),
    document.querySelector('button[onclick="discoverFlowsWithAi()"]')
  ].filter(Boolean);

  btns.forEach(b => {
    b.disabled = true;
    b.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Analizando código con IA...</span>
    `;
  });

  showToast('Iniciando ingeniería inversa con IA sobre el código...', 'sparkles');

  try {
    const res = await fetch('/api/flows/discover-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error && data.error.includes('OPENROUTER_KEY_REQUIRED')) {
        showToast('Conecta tu API Key de OpenRouter para usar la IA', 'alert-circle');
        if (window.openOpenRouterModal) window.openOpenRouterModal();
      } else {
        showToast(data.error || 'Error al analizar flujos con IA', 'alert-circle');
      }
      return;
    }

    showToast(`¡${data.flows?.length || data.count || 0} flujos reales descubiertos con éxito!`, 'check-circle');
    if (window.loadData) await window.loadData();
  } catch (err) {
    showToast(`Error de red: ${err.message}`, 'alert-circle');
  } finally {
    btns.forEach(b => {
      b.disabled = false;
      b.innerHTML = `
        <i data-lucide="sparkles" class="w-3.5 h-3.5 text-teal-400"></i>
        <span>Descubrir Flujos con IA</span>
      `;
    });
    if (window.lucide) window.lucide.createIcons();
  }
}

window.discoverFlowsWithAi = discoverFlowsWithAi;
