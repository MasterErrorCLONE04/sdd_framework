// SDD Studio — Modals Controller

import { state } from './state.js';
import { showToast, copyTextToClipboard } from './utils.js';
import { saveOpenRouterConfig, reverseEngineerProject } from './api.js';
import { switchScreen } from './navigation.js';

export function openDispatchModal() {
  const qg = state.appState?.project?.qualityGates || {};
  let isAllPassed = true;
  if (Array.isArray(qg)) isAllPassed = qg.every(g => g.status === 'passed');
  else isAllPassed = Object.values(qg).every(v => v === true);

  const modal = document.getElementById('dispatch-modal');
  const title = document.getElementById('modal-title');
  const content = document.getElementById('modal-content');
  const actionBtn = document.getElementById('modal-action-btn');

  if (!isAllPassed) {
    title.innerHTML = '<i data-lucide="shield-alert" class="w-4 h-4 text-rose-600"></i> Despacho Bloqueado';
    content.innerHTML = `
      <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 font-bold">
        ⚠️ Compuertas de Calidad Pendientes (Regla 0 de AGENTS.md)
      </div>
      <p>No se puede despachar un agente a codificar sin haber aprobado las 5 compuertas mínimas de especificación en la pestaña <b>🧭 Núcleo & Compuertas</b>.</p>
    `;
    actionBtn?.classList.add('hidden');
  } else {
    title.innerHTML = '<i data-lucide="bot" class="w-4 h-4 text-zinc-900"></i> Despacho Habilitado';
    content.innerHTML = `
      <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold">
        ✓ 5/5 Compuertas Aprobadas
      </div>
      <p>Copia el siguiente prompt protegido para tu agente en Cursor, Windsurf, Claude Code o Antigravity:</p>
      <pre class="p-2.5 rounded-lg bg-zinc-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">Lee AGENTS.md y atiende la historia activa en .sdd/requirements/stories/ respetando estrictamente los scopeFiles y criterios Gherkin.</pre>
    `;
    actionBtn?.classList.remove('hidden');
  }

  modal?.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

export function closeDispatchModal() {
  document.getElementById('dispatch-modal')?.classList.add('hidden');
}

export function copyPromptText() {
  copyTextToClipboard(
    "Lee AGENTS.md y atiende la historia activa en .sdd/requirements/stories/ respetando estrictamente los scopeFiles y criterios Gherkin.",
    'Prompt copiado'
  );
  closeDispatchModal();
}

export function openGenesisModal() {
  switchScreen('chat');
}

export function closeGenesisModal() {
  switchScreen('cockpit');
}

export function openOpenRouterModal() {
  const modal = document.getElementById('openrouter-modal');
  const input = document.getElementById('openrouter-api-key-input');
  const modelSelect = document.getElementById('openrouter-model-select');
  const statusText = document.getElementById('openrouter-test-status');

  if (state.openRouterConfig?.keyMasked && input) {
    input.placeholder = `Actual: ${state.openRouterConfig.keyMasked}`;
  }
  if (state.selectedModel && modelSelect) {
    modelSelect.value = state.selectedModel;
  }
  if (statusText) statusText.innerText = '';
  modal?.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

export function closeOpenRouterModal() {
  document.getElementById('openrouter-modal')?.classList.add('hidden');
}

export function toggleApiKeyVisibility() {
  const input = document.getElementById('openrouter-api-key-input');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

export async function saveOpenRouterConfiguration() {
  const input = document.getElementById('openrouter-api-key-input');
  const modelSelect = document.getElementById('openrouter-model-select');
  const saveBtn = document.getElementById('btn-save-openrouter');
  const statusText = document.getElementById('openrouter-test-status');

  const apiKey = input ? input.value.trim() : '';
  const model = modelSelect?.value || state.selectedModel;

  if (saveBtn) saveBtn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Guardando...</span>';
  if (window.lucide) window.lucide.createIcons();

  try {
    const data = await saveOpenRouterConfig(apiKey, model);
    if (!data.success) throw new Error(data.error || 'Fallo al guardar');

    state.openRouterConfig = data;
    state.selectedModel = model;
    state.selectedEngine = 'openrouter';

    // Actualizar labels
    const labelEl = document.getElementById('current-engine-label');
    if (labelEl) {
      const modelItem = data.freeModels?.find(m => m.id === model);
      if (modelItem) labelEl.innerText = `${modelItem.name} (:free)`;
    }

    const badgeText = document.getElementById('openrouter-badge-text');
    const statusBtn = document.getElementById('btn-openrouter-status');
    if (data.configured) {
      if (badgeText) badgeText.innerText = 'OpenRouter Conectado';
      if (statusBtn) {
        statusBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
      }
    }

    closeOpenRouterModal();
    showToast('¡OpenRouter configurado con modelos gratuitos!', 'check-circle');
  } catch (err) {
    if (statusText) statusText.innerText = `Error: ${err.message}`;
  } finally {
    if (saveBtn) saveBtn.innerHTML = '<i data-lucide="save" class="w-3.5 h-3.5"></i><span>Guardar y Conectar</span>';
    if (window.lucide) window.lucide.createIcons();
  }
}

export function openReverseEngineerModal() {
  const modal = document.getElementById('modal-reverse-engineer');
  if (!modal) return;
  
  // Reset state
  document.getElementById('re-intro-section')?.classList.remove('hidden');
  document.getElementById('re-pipeline-container')?.classList.add('hidden');
  document.getElementById('re-results-container')?.classList.add('hidden');
  document.getElementById('btn-start-reverse-engineer')?.classList.remove('hidden');
  document.getElementById('btn-view-re-results')?.classList.add('hidden');

  const modelLabel = document.getElementById('re-model-label');
  if (modelLabel) {
    modelLabel.innerText = state.selectedModel ? (state.selectedModel.split('/')[1]?.split(':')[0] || state.selectedModel) : 'Ling 3.0 Flash (:free)';
  }

  modal.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

export function closeReverseEngineerModal() {
  document.getElementById('modal-reverse-engineer')?.classList.add('hidden');
}

export async function startReverseEngineeringWithAi() {
  const introSec = document.getElementById('re-intro-section');
  const pipeSec = document.getElementById('re-pipeline-container');
  const resSec = document.getElementById('re-results-container');
  const startBtn = document.getElementById('btn-start-reverse-engineer');
  const viewBtn = document.getElementById('btn-view-re-results');

  const bar = document.getElementById('re-pipeline-bar');
  const pct = document.getElementById('re-pipeline-pct');
  const statusText = document.getElementById('re-pipeline-status-text');

  introSec?.classList.add('hidden');
  pipeSec?.classList.remove('hidden');
  startBtn?.classList.add('hidden');

  const setStep = (stepNum, text, progressPct) => {
    if (bar) bar.style.width = `${progressPct}%`;
    if (pct) pct.innerText = `${progressPct}%`;
    if (statusText) statusText.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 text-purple-600 animate-spin"></i><span>${text}</span>`;
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`re-step-${i}`);
      if (!el) continue;
      if (i < stepNum) {
        el.className = 'flex items-center gap-2 text-emerald-700 font-bold';
        el.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i><span>${el.innerText.replace(/^[✓\s\[\d\/\s\]]+/, `[${i}/4] `)}</span>`;
      } else if (i === stepNum) {
        el.className = 'flex items-center gap-2 text-purple-700 font-bold animate-pulse';
        el.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-purple-600"></i><span>${el.innerText.replace(/^[✓\s\[\d\/\s\]]+/, `[${i}/4] `)}</span>`;
      } else {
        el.className = 'flex items-center gap-2 text-zinc-400';
        el.innerHTML = `<i data-lucide="circle" class="w-3.5 h-3.5"></i><span>${el.innerText.replace(/^[✓\s\[\d\/\s\]]+/, `[${i}/4] `)}</span>`;
      }
    }
    if (window.lucide) window.lucide.createIcons();
  };

  setStep(1, 'Inspeccionando rutas, controladores y modelos...', 25);

  try {
    const timer1 = setTimeout(() => setStep(2, 'Razonando arquitectura e historias con IA...', 50), 1200);
    const timer2 = setTimeout(() => setStep(3, 'Deduciendo historias Jira y diagramas UML...', 75), 3500);

    const res = await reverseEngineerProject({
      model: state.selectedModel
    });

    clearTimeout(timer1);
    clearTimeout(timer2);

    setStep(4, 'Sincronizando especificación en disco...', 95);
    await new Promise(r => setTimeout(r, 600));

    // Mostrar completado al 100%
    if (bar) bar.style.width = '100%';
    if (pct) pct.innerText = '100%';
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`re-step-${i}`);
      if (el) {
        el.className = 'flex items-center gap-2 text-emerald-700 font-bold';
        el.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i><span>${el.innerText.replace(/^[✓\s\[\d\/\s\]]+/, `[${i}/4] `)}</span>`;
      }
    }

    // Mostrar resumen de resultados
    pipeSec?.classList.add('hidden');
    resSec?.classList.remove('hidden');
    viewBtn?.classList.remove('hidden');

    const summaryEl = document.getElementById('re-results-summary');
    if (summaryEl) summaryEl.innerText = res.summary || 'Especificación reconstruida con éxito.';

    const stEl = document.getElementById('re-stat-stories');
    const svEl = document.getElementById('re-stat-services');
    const tbEl = document.getElementById('re-stat-tables');
    const flEl = document.getElementById('re-stat-flows');

    if (stEl) stEl.innerText = String(res.storiesCount || 0);
    if (svEl) svEl.innerText = String(res.servicesCount || 0);
    if (tbEl) tbEl.innerText = String(res.tablesCount || 0);
    if (flEl) flEl.innerText = String(res.flowsCount || 0);

    showToast('¡Ingeniería Inversa con IA completada!', 'check-circle');
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    pipeSec?.classList.add('hidden');
    introSec?.classList.remove('hidden');
    startBtn?.classList.remove('hidden');
    showToast(err.message || 'Error en ingeniería inversa', 'alert-circle');
  }
}

export async function finishAndRefreshWorkbench() {
  closeReverseEngineerModal();
  if (window.loadData) await window.loadData();
  showToast('Plataforma actualizada con especificación de código real', 'sparkles');
}

// Window bindings
window.openReverseEngineerModal = openReverseEngineerModal;
window.closeReverseEngineerModal = closeReverseEngineerModal;
window.startReverseEngineeringWithAi = startReverseEngineeringWithAi;
window.finishAndRefreshWorkbench = finishAndRefreshWorkbench;

