// SDD Studio — 14 UML Diagrams OMG Suite Perspective View

import { state } from '../state.js';
import { showToast, copyTextToClipboard } from '../utils.js';
import { switchTab } from '../navigation.js';

// Icons mapping for all 14 UML diagram types
const UML_TYPE_ICONS = {
  class: 'box',
  object: 'layers',
  component: 'package',
  deployment: 'server',
  package: 'folder',
  composite: 'cpu',
  profile: 'tag',
  usecase: 'users',
  activity: 'zap',
  state: 'refresh-cw',
  sequence: 'git-commit',
  communication: 'share-2',
  timing: 'clock',
  'interaction-overview': 'workflow'
};

export function switchUmlCategory(category) {
  state.activeUmlCategory = category;
  
  const btnAll = document.getElementById('uml-cat-all');
  const btnStruct = document.getElementById('uml-cat-structural');
  const btnBehav = document.getElementById('uml-cat-behavioral');

  // Reset classes
  [btnAll, btnStruct, btnBehav].forEach(btn => {
    btn?.classList.remove('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
    btn?.classList.add('text-zinc-600');
  });

  if (category === 'structural') {
    btnStruct?.classList.add('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
    btnStruct?.classList.remove('text-zinc-600');
  } else if (category === 'behavioral') {
    btnBehav?.classList.add('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
    btnBehav?.classList.remove('text-zinc-600');
  } else {
    btnAll?.classList.add('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
    btnAll?.classList.remove('text-zinc-600');
  }

  const categoryPill = document.getElementById('uml-category-pill');
  if (categoryPill) {
    if (category === 'structural') {
      categoryPill.innerText = '📐 7 Estructurales';
      categoryPill.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200';
    } else if (category === 'behavioral') {
      categoryPill.innerText = '⚡ 7 de Comportamiento';
      categoryPill.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200';
    } else {
      categoryPill.innerText = '14 Diagramas Oficiales';
      categoryPill.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 border border-zinc-200';
    }
  }

  renderSequences();
}

export function selectUmlDiagram(diagId) {
  state.activeUmlDiagramId = diagId;
  renderSequences();
}

// Backwards compatibility functions
export function switchUmlType(type) {
  if (type === 'state') {
    state.activeUmlCategory = 'behavioral';
    state.activeUmlDiagramId = 'UML-10-STATE';
  } else if (type === 'sequence') {
    state.activeUmlCategory = 'behavioral';
    state.activeUmlDiagramId = 'UML-11-SEQUENCE';
  } else {
    state.activeUmlType = type;
  }
  renderSequences();
}

export function selectSequence(seqId) {
  state.activeSequenceId = seqId;
  state.activeUmlDiagramId = seqId;
  renderSequences();
}

export function selectStateMachine(fsmId) {
  state.activeStateId = fsmId;
  state.activeUmlDiagramId = fsmId;
  renderSequences();
}

export function openSequenceForFlow(flowId) {
  switchTab('sequences');
  state.activeUmlCategory = 'all';
  const allDiags = getAllDiagramsList();
  const match = allDiags.find(d => d.flowId === flowId || (d.id && d.id.toLowerCase().includes(flowId.toLowerCase())) || d.type === 'sequence');
  if (match) {
    state.activeUmlDiagramId = match.id;
  }
  renderSequences();
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
      const isUser = p.toLowerCase().includes('usuario') || p.toLowerCase().includes('cliente') || p.toLowerCase().includes('dev') || p.toLowerCase().includes('admin');
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

function getAllDiagramsList() {
  const loadedUml = Array.isArray(state.appState?.umlDiagrams) ? state.appState.umlDiagrams : [];
  if (loadedUml.length > 0) {
    return loadedUml;
  }

  // Fallback a secuencias y state machines si umlDiagrams aún no se ha sincronizado
  const seqs = Array.isArray(state.appState?.sequences) ? state.appState.sequences : (state.appState?.sequences ? [state.appState.sequences] : []);
  const fsms = Array.isArray(state.appState?.stateMachines) ? state.appState.stateMachines : (state.appState?.stateMachines ? [state.appState.stateMachines] : []);

  const list = [];
  seqs.forEach((s, idx) => {
    list.push({
      id: s.id || `SEQ-${idx + 1}`,
      category: 'behavioral',
      categoryName: 'Comportamiento (Interacción)',
      type: 'sequence',
      typeName: 'Diagrama de Secuencia',
      name: s.name || 'Secuencia de Interacción',
      description: s.description || 'Interacción técnica paso a paso entre actores y servicios.',
      mermaid: s.mermaid || buildMermaidFromSteps(s),
      elements: s.actors || ['Dev', 'Server']
    });
  });

  fsms.forEach((f, idx) => {
    list.push({
      id: f.id || `FSM-${idx + 1}`,
      category: 'behavioral',
      categoryName: 'Comportamiento',
      type: 'state',
      typeName: 'Máquina de Estados (FSM)',
      name: f.name || `Estados de ${f.entity || 'Entidad'}`,
      description: f.description || 'Estados y transiciones válidas del modelo.',
      mermaid: f.mermaid || null,
      elements: (f.states || []).map(st => st.name || st)
    });
  });

  return list;
}

export async function renderSequences() {
  // Si umlDiagrams aún no está cargado en memoria, sincronizarlo directamente desde la API
  if (!Array.isArray(state.appState?.umlDiagrams) || state.appState.umlDiagrams.length === 0) {
    try {
      const res = await fetch('/api/uml');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.diagrams) && data.diagrams.length > 0) {
          if (!state.appState) state.appState = {};
          state.appState.umlDiagrams = data.diagrams;
        }
      }
    } catch {
      // fallback
    }
  }

  const allDiagrams = getAllDiagramsList();
  const currentCategory = state.activeUmlCategory || 'all';

  const structCount = allDiagrams.filter(d => d.category === 'structural').length;
  const behavCount = allDiagrams.filter(d => d.category === 'behavioral').length;

  // Actualizar conteos dinámicos en los botones superiores
  const lblAll = document.getElementById('uml-cat-all-label');
  const lblStruct = document.getElementById('uml-cat-struct-label');
  const lblBehav = document.getElementById('uml-cat-behav-label');
  if (lblAll) lblAll.innerText = `Todos (${allDiagrams.length})`;
  if (lblStruct) lblStruct.innerText = `📐 Estructurales (${structCount})`;
  if (lblBehav) lblBehav.innerText = `⚡ Comportamiento (${behavCount})`;

  // Actualizar badge lateral en Cockpit
  const tabBadgeSeq = document.getElementById('tab-badge-sequences');
  if (tabBadgeSeq) {
    tabBadgeSeq.innerText = `${allDiagrams.length} UML`;
  }

  // Filtrar según categoría activa
  let filtered = allDiagrams;
  if (currentCategory === 'structural') {
    filtered = allDiagrams.filter(d => d.category === 'structural');
  } else if (currentCategory === 'behavioral') {
    filtered = allDiagrams.filter(d => d.category === 'behavioral');
  }

  const pillsContainer = document.getElementById('uml-pills-container');
  const metaCard = document.getElementById('uml-metadata-card');
  const badgeEl = document.getElementById('uml-diag-badge');
  const catBadgeEl = document.getElementById('uml-diag-cat-badge');
  const typeBadgeEl = document.getElementById('uml-diag-flow');
  const titleEl = document.getElementById('uml-diag-title');
  const descEl = document.getElementById('uml-diag-desc');
  const actorsContainer = document.getElementById('uml-diag-actors');
  const codeView = document.getElementById('mermaid-code-view');
  const renderOutput = document.getElementById('mermaid-svg-output');
  const selectorCount = document.getElementById('uml-selector-count');

  if (pillsContainer) pillsContainer.innerHTML = '';

  if (filtered.length === 0) {
    if (metaCard) metaCard.classList.add('hidden');
    if (renderOutput) {
      renderOutput.innerHTML = `
        <div class="py-12 text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <i data-lucide="workflow" class="w-6 h-6"></i>
          </div>
          <h3 class="text-sm font-bold text-zinc-900">No hay diagramas en esta categoría</h3>
          <p class="text-xs text-zinc-500 max-w-sm mx-auto">Selecciona "Todos" para explorar la suite completa de 14 diagramas UML.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    return;
  }

  if (metaCard) metaCard.classList.remove('hidden');

  // Determinar diagrama activo
  if (!state.activeUmlDiagramId || !filtered.some(d => d.id === state.activeUmlDiagramId)) {
    state.activeUmlDiagramId = filtered[0].id;
  }

  const activeDiag = filtered.find(d => d.id === state.activeUmlDiagramId) || filtered[0];
  const activeIndex = filtered.indexOf(activeDiag) + 1;

  if (selectorCount) {
    selectorCount.innerText = `${activeDiag.id} (${activeIndex} de ${filtered.length})`;
  }

  // Renderizar pills horizontales
  filtered.forEach(d => {
    const isSelected = d.id === activeDiag.id;
    const btn = document.createElement('button');
    const iconName = UML_TYPE_ICONS[d.type] || 'git-commit';
    const isStructural = d.category === 'structural';

    btn.className = `px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
      isSelected
        ? (isStructural
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 ring-1 ring-blue-600'
            : 'bg-purple-600 text-white shadow-sm shadow-purple-600/20 ring-1 ring-purple-600')
        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200/80'
    }`;

    btn.innerHTML = `
      <i data-lucide="${iconName}" class="w-3.5 h-3.5 ${isSelected ? 'text-white' : (isStructural ? 'text-blue-600' : 'text-purple-600')}"></i>
      <span class="font-mono text-[10px] ${isSelected ? 'text-white/80' : 'text-zinc-500'} font-bold">${d.number ? String(d.number).padStart(2, '0') : d.id}</span>
      <span class="truncate max-w-[150px] sm:max-w-[210px]">${d.typeName || d.name}</span>
      <span class="text-[9px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : (isStructural ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200')}">
        ${isStructural ? 'ESTR' : 'COMP'}
      </span>
    `;

    btn.onclick = () => selectUmlDiagram(d.id);
    pillsContainer?.appendChild(btn);
  });

  // Metadatos del diagrama activo
  if (badgeEl) badgeEl.innerText = activeDiag.id || 'UML';
  if (catBadgeEl) {
    const isStructural = activeDiag.category === 'structural';
    catBadgeEl.innerText = isStructural ? '📐 Estructural' : '⚡ Comportamiento';
    catBadgeEl.className = `px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
      isStructural ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-purple-50 text-purple-800 border-purple-200'
    }`;
  }
  if (typeBadgeEl) typeBadgeEl.innerText = activeDiag.typeName || 'Diagrama UML';
  if (titleEl) titleEl.innerText = activeDiag.name || 'Diagrama UML';
  if (descEl) descEl.innerText = activeDiag.description || 'Definición de modelo y arquitectura del sistema.';

  // Renderizar tags de actores/elementos
  if (actorsContainer) {
    actorsContainer.innerHTML = '';
    const tags = activeDiag.elements || activeDiag.actors || [];
    tags.forEach(tagText => {
      const tag = document.createElement('span');
      tag.className = 'px-2 py-0.5 rounded-md bg-white border border-purple-200/80 text-[10px] font-mono font-medium text-zinc-700 shadow-2xs';
      tag.innerText = tagText;
      actorsContainer.appendChild(tag);
    });
  }

  // Obtener código Mermaid
  const mermaidCode = activeDiag.mermaid || buildMermaidFromSteps(activeDiag);

  // Renderizar código en el visualizador
  if (codeView) {
    codeView.innerText = mermaidCode || '# Sin especificación Mermaid disponible';
  }

  if (renderOutput && window.mermaid && mermaidCode) {
    try {
      renderOutput.innerHTML = '<div class="text-xs text-zinc-400 font-mono py-12 flex items-center justify-center gap-2"><span class="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>Renderizando diagrama interactivo UML...</div>';
      const uniqueId = 'mermaid-uml-' + Math.floor(Math.random() * 100000);
      const { svg } = await window.mermaid.render(uniqueId, mermaidCode);
      renderOutput.innerHTML = svg;
    } catch (err) {
      console.warn('Error renderizando Mermaid, intentando sanitización automática:', err);
      // Auto-sanitize fallback: envolver etiquetas de subgrafos y nodos con caracteres especiales en comillas
      const sanitizedCode = mermaidCode
        .replace(/subgraph\s+([a-zA-Z0-9_]+)\s+\[([^"\]\r\n]+)\]/g, 'subgraph $1 ["$2"]')
        .replace(/([a-zA-Z0-9_]+)\[([^"\]\r\n]+)\]/g, (match, id, text) => {
          if (id === 'subgraph' || id === 'class') return match;
          return `${id}["${text}"]`;
        });

      if (sanitizedCode !== mermaidCode) {
        try {
          const retryId = 'mermaid-retry-' + Math.floor(Math.random() * 100000);
          const { svg } = await window.mermaid.render(retryId, sanitizedCode);
          renderOutput.innerHTML = svg;
          if (window.lucide) window.lucide.createIcons();
          return;
        } catch (retryErr) {
          console.warn('Reintento con sanitización falló:', retryErr);
        }
      }

      renderOutput.innerHTML = `
        <div class="p-6 bg-rose-50 text-rose-800 rounded-2xl text-xs font-mono border border-rose-200 max-w-lg mx-auto text-center space-y-2">
          <div class="font-bold flex items-center justify-center gap-1.5 text-rose-900">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-600"></i>
            <span>No se pudo procesar la sintaxis visual Mermaid</span>
          </div>
          <p class="text-[11px] text-rose-700">Puedes inspeccionar el código fuente haciendo clic en <strong>Ver Código</strong>.</p>
        </div>
      `;
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
  copyTextToClipboard(txt, 'Código Mermaid copiado al portapapeles');
}
