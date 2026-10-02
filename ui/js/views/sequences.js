// SDD Studio — Sequences & State Machines UML Perspective View

import { state } from '../state.js';
import { showToast, copyTextToClipboard } from '../utils.js';
import { switchTab } from '../navigation.js';

export function switchUmlType(type) {
  state.activeUmlType = type;
  const btnSeq = document.getElementById('uml-mode-sequence');
  const btnFsm = document.getElementById('uml-mode-state');
  if (type === 'sequence') {
    btnSeq?.classList.add('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
    btnSeq?.classList.remove('text-zinc-600');
    btnFsm?.classList.remove('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
    btnFsm?.classList.add('text-zinc-600');
  } else {
    btnFsm?.classList.add('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
    btnFsm?.classList.remove('text-zinc-600');
    btnSeq?.classList.remove('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
    btnSeq?.classList.add('text-zinc-600');
  }
  renderSequences();
}

export function selectSequence(seqId) {
  state.activeSequenceId = seqId;
  renderSequences();
}

export function selectStateMachine(fsmId) {
  state.activeStateId = fsmId;
  renderSequences();
}

export function openSequenceForFlow(flowId) {
  switchTab('sequences');
  state.activeUmlType = 'sequence';
  const seqs = Array.isArray(state.appState?.sequences) ? state.appState.sequences : (state.appState?.sequences ? [state.appState.sequences] : []);
  const match = seqs.find(s => s.flowId === flowId || (s.id && s.id.toLowerCase().includes(flowId.toLowerCase())));
  if (match) {
    state.activeSequenceId = match.id;
  }
  switchUmlType('sequence');
}

export function buildMermaidFromSteps(seq) {
  if (!seq) return null;
  if (seq.mermaid && typeof seq.mermaid === 'string' && seq.mermaid.trim().length > 0) {
    return seq.mermaid;
  }
  if (Array.isArray(seq.steps) && seq.steps.length > 0) {
    let code = `sequenceDiagram\n  autonumber\n`;
    const participants = new Set();
    seq.steps.forEach(s => {
      if (s.actor) participants.add(s.actor);
      if (s.target) participants.add(s.target);
      if (s.from) participants.add(s.from);
      if (s.to) participants.add(s.to);
    });
    participants.forEach(p => {
      const id = p.replace(/[^a-zA-Z0-9]/g, '_');
      const isUser = p.toLowerCase().includes('usuario') || p.toLowerCase().includes('cliente') || p.toLowerCase().includes('comprador') || p.toLowerCase().includes('admin') || p.toLowerCase().includes('repartidor');
      if (isUser) {
        code += `  actor ${id} as ${p}\n`;
      } else {
        code += `  participant ${id} as ${p}\n`;
      }
    });
    seq.steps.forEach(s => {
      const from = (s.from || s.actor || 'Actor').replace(/[^a-zA-Z0-9]/g, '_');
      const to = (s.to || s.target || 'Target').replace(/[^a-zA-Z0-9]/g, '_');
      const act = (s.action || 'Acción').replace(/[\r\n]+/g, ' ').replace(/"/g, "'");
      code += `  ${from}->>${to}: ${act}\n`;
    });
    return code;
  }
  return null;
}

export async function renderSequences() {
  const rawSeqs = state.appState?.sequences;
  const seqs = Array.isArray(rawSeqs) ? rawSeqs : (rawSeqs && (rawSeqs.mermaid || rawSeqs.steps || rawSeqs.name) ? [rawSeqs] : []);
  const fsms = Array.isArray(state.appState?.stateMachines) ? state.appState.stateMachines : (state.appState?.stateMachines ? [state.appState.stateMachines] : []);

  const tabBadgeSeq = document.getElementById('tab-badge-sequences');
  const totalUml = seqs.length + fsms.length;
  if (tabBadgeSeq) tabBadgeSeq.innerText = `${totalUml} UML`;

  const seqLabel = document.getElementById('uml-tab-seq-label');
  const fsmLabel = document.getElementById('uml-tab-fsm-label');
  if (seqLabel) seqLabel.innerText = `Secuencias UML (${seqs.length})`;
  if (fsmLabel) fsmLabel.innerText = `Máquinas de Estado (${fsms.length})`;

  const pillsContainer = document.getElementById('uml-pills-container');
  const metaCard = document.getElementById('uml-metadata-card');
  const badgeEl = document.getElementById('uml-diag-badge');
  const flowBadgeEl = document.getElementById('uml-diag-flow');
  const titleEl = document.getElementById('uml-diag-title');
  const descEl = document.getElementById('uml-diag-desc');
  const actorsContainer = document.getElementById('uml-diag-actors');
  const codeView = document.getElementById('mermaid-code-view');
  const renderOutput = document.getElementById('mermaid-svg-output');
  const selectorCount = document.getElementById('uml-selector-count');
  const selectorTitle = document.getElementById('uml-selector-title');

  if (pillsContainer) pillsContainer.innerHTML = '';

  let mermaidCode = null;

  if (state.activeUmlType === 'sequence') {
    if (selectorTitle) selectorTitle.innerText = 'Secuencias de Procesos por Flujo:';
    if (seqs.length === 0) {
      if (metaCard) metaCard.classList.add('hidden');
      if (renderOutput) {
        renderOutput.innerHTML = `
          <div class="py-12 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <i data-lucide="workflow" class="w-6 h-6"></i>
            </div>
            <h3 class="text-sm font-bold text-zinc-900">No hay diagramas de secuencia registrados</h3>
            <p class="text-xs text-zinc-500 max-w-sm mx-auto">Cuando definas flujos en el Chat, tu Agente de IA creará las secuencias técnicas correspondientes aquí.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }
      return;
    }

    if (metaCard) metaCard.classList.remove('hidden');

    // Determinar secuencia activa
    if (!state.activeSequenceId || !seqs.some(s => s.id === state.activeSequenceId)) {
      state.activeSequenceId = seqs[0].id;
    }

    const activeSeq = seqs.find(s => s.id === state.activeSequenceId) || seqs[0];
    if (selectorCount) selectorCount.innerText = `${activeSeq.id} (${seqs.indexOf(activeSeq) + 1} de ${seqs.length})`;

    // Renderizar pills para todas las secuencias
    seqs.forEach(s => {
      const isSelected = s.id === activeSeq.id;
      const btn = document.createElement('button');
      btn.className = `px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
        isSelected
          ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20 ring-1 ring-purple-600'
          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200/80'
      }`;
      const flowName = s.flowId ? (state.appState?.flows?.find(f => f.id === s.flowId)?.name || s.flowId) : null;
      btn.innerHTML = `
        <span class="font-mono text-[10px] ${isSelected ? 'text-purple-200' : 'text-zinc-500'} font-bold">${s.id || 'SEQ'}</span>
        <span class="truncate max-w-[160px] sm:max-w-[220px]">${s.name}</span>
        ${flowName ? `<span class="hidden lg:inline text-[9px] px-1 rounded ${isSelected ? 'bg-purple-700 text-purple-100' : 'bg-zinc-200 text-zinc-600'}">Flujo</span>` : ''}
      `;
      btn.onclick = () => selectSequence(s.id);
      pillsContainer?.appendChild(btn);
    });

    // Metadatos
    if (badgeEl) badgeEl.innerText = activeSeq.id || 'SEQ';
    if (flowBadgeEl) {
      const matchedFlow = state.appState?.flows?.find(f => f.id === activeSeq.flowId);
      flowBadgeEl.innerText = matchedFlow ? `Flujo: ${matchedFlow.name}` : (activeSeq.flowId ? `Flujo: ${activeSeq.flowId}` : 'Flujo General');
    }
    if (titleEl) titleEl.innerText = activeSeq.name;
    if (descEl) descEl.innerText = activeSeq.description || 'Interacción técnica paso a paso entre actores y servicios.';

    // Actores
    if (actorsContainer) {
      actorsContainer.innerHTML = '';
      const actors = activeSeq.actors || [];
      actors.forEach(act => {
        const tag = document.createElement('span');
        tag.className = 'px-2 py-0.5 rounded-md bg-white border border-purple-200/80 text-[10px] font-mono font-medium text-zinc-700 shadow-2xs';
        tag.innerText = act;
        actorsContainer.appendChild(tag);
      });
    }

    mermaidCode = buildMermaidFromSteps(activeSeq);
  } else {
    // Modo Máquinas de Estado (FSM)
    if (selectorTitle) selectorTitle.innerText = 'Ciclos de Vida y Máquinas de Estado (FSM):';
    if (fsms.length === 0) {
      if (metaCard) metaCard.classList.add('hidden');
      if (renderOutput) {
        renderOutput.innerHTML = `
          <div class="py-12 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <i data-lucide="refresh-cw" class="w-6 h-6"></i>
            </div>
            <h3 class="text-sm font-bold text-zinc-900">No hay máquinas de estado registradas</h3>
            <p class="text-xs text-zinc-500 max-w-sm mx-auto">Las máquinas de estado modelan el ciclo de vida de tus entidades (ej: Órdenes, Pagos, Sesiones).</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }
      return;
    }

    if (metaCard) metaCard.classList.remove('hidden');

    if (!state.activeStateId || !fsms.some(f => f.id === state.activeStateId)) {
      state.activeStateId = fsms[0].id;
    }

    const activeFsm = fsms.find(f => f.id === state.activeStateId) || fsms[0];
    if (selectorCount) selectorCount.innerText = `${activeFsm.id} (${fsms.indexOf(activeFsm) + 1} de ${fsms.length})`;

    // Pills de FSM
    fsms.forEach(f => {
      const isSelected = f.id === activeFsm.id;
      const btn = document.createElement('button');
      btn.className = `px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
        isSelected
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 ring-1 ring-indigo-600'
          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200/80'
      }`;
      btn.innerHTML = `
        <span class="font-mono text-[10px] ${isSelected ? 'text-indigo-200' : 'text-zinc-500'} font-bold">${f.id || 'FSM'}</span>
        <span class="truncate max-w-[180px] sm:max-w-[240px]">${f.name || f.entity}</span>
      `;
      btn.onclick = () => selectStateMachine(f.id);
      pillsContainer?.appendChild(btn);
    });

    // Metadatos FSM
    if (badgeEl) badgeEl.innerText = activeFsm.id || 'FSM';
    if (flowBadgeEl) flowBadgeEl.innerText = `Entidad: ${activeFsm.entity || 'Core'}`;
    if (titleEl) titleEl.innerText = activeFsm.name;
    if (descEl) descEl.innerText = activeFsm.description || 'Estados válidos y transiciones deterministas del modelo.';

    // Estados tags
    if (actorsContainer) {
      actorsContainer.innerHTML = '';
      const states = activeFsm.states || [];
      states.forEach(st => {
        const tag = document.createElement('span');
        tag.className = 'px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-[10px] font-mono font-bold text-indigo-900 shadow-2xs';
        tag.innerText = st.name || st;
        actorsContainer.appendChild(tag);
      });
    }

    mermaidCode = activeFsm.mermaid || null;
  }

  // Renderizar Mermaid Code
  if (codeView) codeView.innerText = mermaidCode || '# Sin código Mermaid';

  if (renderOutput && window.mermaid && mermaidCode) {
    try {
      renderOutput.innerHTML = '<div class="text-xs text-zinc-400 font-mono py-8 flex items-center justify-center gap-2"><span class="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>Renderizando diagrama interactivo...</div>';
      const uniqueId = 'mermaid-uml-' + Math.floor(Math.random() * 100000);
      const { svg } = await window.mermaid.render(uniqueId, mermaidCode);
      renderOutput.innerHTML = svg;
    } catch (err) {
      console.warn('Error renderizando Mermaid:', err);
      renderOutput.innerHTML = `<div class="p-4 bg-rose-50 text-rose-800 rounded-xl text-xs font-mono border border-rose-200">No se pudo procesar la sintaxis visual. Usa la vista de código.</div>`;
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

export function toggleMermaidRaw() {
  state.isMermaidRawVisible = !state.isMermaidRawVisible;
  const rawBox = document.getElementById('mermaid-raw-box');
  const renderContainer = document.getElementById('mermaid-render-container');
  const toggleText = document.getElementById('btn-toggle-mermaid-text');

  if (state.isMermaidRawVisible) {
    rawBox?.classList.remove('hidden');
    renderContainer?.classList.add('hidden');
    if (toggleText) toggleText.innerText = 'Ver Diagrama';
  } else {
    rawBox?.classList.add('hidden');
    renderContainer?.classList.remove('hidden');
    if (toggleText) toggleText.innerText = 'Ver Código';
  }
}

export function copyMermaid() {
  const txt = document.getElementById('mermaid-code-view')?.innerText || '';
  copyTextToClipboard(txt, 'Mermaid copiado al portapapeles');
}
