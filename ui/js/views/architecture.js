// SDD Studio — Architecture C4 Interactive Canvas & Service Inspector

import { state, loadSavedArchPositions, saveCurrentArchPositions, getArchStorageKey } from '../state.js';
import { showToast, escapeHtml } from '../utils.js';
import { createStory, dispatchStoryTask, patchSdd } from '../api.js';

export function setArchViewMode(mode) {
  const canvasWrapper = document.getElementById('arch-canvas-container');
  const cardsGrid = document.getElementById('arch-cards-container');
  const btnCanvas = document.getElementById('arch-viewmode-canvas');
  const btnGrid = document.getElementById('arch-viewmode-grid');

  if (mode === 'canvas') {
    canvasWrapper?.classList.remove('hidden');
    cardsGrid?.classList.add('hidden');
    btnCanvas?.classList.add('bg-white', 'text-purple-950', 'font-black', 'shadow-2xs');
    btnCanvas?.classList.remove('text-zinc-600');
    btnGrid?.classList.remove('bg-white', 'text-purple-950', 'font-black', 'shadow-2xs');
    btnGrid?.classList.add('text-zinc-600');
    setTimeout(() => {
      applyArchTransform();
      renderArchWires();
    }, 50);
  } else {
    canvasWrapper?.classList.add('hidden');
    cardsGrid?.classList.remove('hidden');
    btnGrid?.classList.add('bg-white', 'text-purple-950', 'font-black', 'shadow-2xs');
    btnGrid?.classList.remove('text-zinc-600');
    btnCanvas?.classList.remove('bg-white', 'text-purple-950', 'font-black', 'shadow-2xs');
    btnCanvas?.classList.add('text-zinc-600');
  }
  if (window.lucide) window.lucide.createIcons();
}

export function applyArchTransform() {
  const viewport = document.getElementById('arch-viewport');
  const stage = document.getElementById('arch-canvas-stage');
  const zoomText = document.getElementById('arch-zoom-level');
  if (viewport) {
    viewport.style.transform = `translate(${state.archPanX}px, ${state.archPanY}px) scale(${state.archZoom})`;
  }
  if (stage) {
    stage.style.backgroundPosition = `${state.archPanX}px ${state.archPanY}px`;
    stage.style.backgroundSize = `${24 * state.archZoom}px ${24 * state.archZoom}px`;
  }
  if (zoomText) {
    zoomText.innerText = `${Math.round(state.archZoom * 100)}%`;
  }
}

export function zoomArchCanvas(delta) {
  const stage = document.getElementById('arch-canvas-stage');
  const rect = stage ? stage.getBoundingClientRect() : { width: 800, height: 600, left: 0, top: 0 };
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const oldZoom = state.archZoom;
  const newZoom = Math.min(2.0, Math.max(0.4, Number((state.archZoom + delta).toFixed(2))));
  if (oldZoom === newZoom) return;

  state.archPanX = centerX - (centerX - state.archPanX) * (newZoom / oldZoom);
  state.archPanY = centerY - (centerY - state.archPanY) * (newZoom / oldZoom);
  state.archZoom = newZoom;

  applyArchTransform();
}

export function resetArchCanvas() {
  const services = state.appState?.architecture?.services || state.appState?.architecture?.nodes || [];
  if (services.length === 0) {
    state.archZoom = 1.0;
    state.archPanX = 60;
    state.archPanY = 50;
    applyArchTransform();
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  services.forEach(s => {
    const pos = state.nodePositions[s.id] || { x: 100, y: 100 };
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + 260);
    maxY = Math.max(maxY, pos.y + 160);
  });

  const stage = document.getElementById('arch-canvas-stage');
  const width = stage ? stage.clientWidth : 800;
  const height = stage ? stage.clientHeight : 600;

  const contentWidth = Math.max(200, maxX - minX + 120);
  const contentHeight = Math.max(200, maxY - minY + 120);

  const scaleX = (width - 60) / contentWidth;
  const scaleY = (height - 60) / contentHeight;
  state.archZoom = Math.min(1.05, Math.max(0.65, Math.min(scaleX, scaleY, 1.0)));

  state.archPanX = Math.round((width - (maxX + minX) * state.archZoom) / 2);
  state.archPanY = Math.round((height - (maxY + minY) * state.archZoom) / 2);

  applyArchTransform();
}

export function autoLayoutArch() {
  try {
    localStorage.removeItem(getArchStorageKey());
  } catch (e) {}
  state.nodePositions = {};
  const services = state.appState?.architecture?.services || state.appState?.architecture?.nodes || [];
  state.nodePositions = calculateInitialPositions(services);
  renderArchitecture();
  resetArchCanvas();
  showToast('Componentes auto-alineados por Tiers', 'check-circle');
}

export function calculateInitialPositions(services) {
  const saved = loadSavedArchPositions();
  const tiers = [
    { id: 'tier-frontend', services: [] },
    { id: 'tier-backend', services: [] },
    { id: 'tier-database', services: [] },
    { id: 'tier-gateways', services: [] }
  ];

  services.forEach(s => {
    const t = ((s.type || '') + ' ' + (s.tech || '') + ' ' + (s.label || '')).toLowerCase();
    if (t.includes('front') || t.includes('web') || t.includes('client') || t.includes('ui') || t.includes('next')) {
      tiers[0].services.push(s);
    } else if (t.includes('data') || t.includes('db') || t.includes('postgres') || t.includes('sql') || t.includes('sqlite') || t.includes('mongo')) {
      tiers[2].services.push(s);
    } else if (t.includes('gate') || t.includes('extern') || t.includes('third') || t.includes('stripe') || t.includes('payment') || t.includes('bre-b') || t.includes('whatsapp')) {
      tiers[3].services.push(s);
    } else {
      tiers[1].services.push(s);
    }
  });

  const activeTiers = tiers.filter(t => t.services.length > 0);
  const positions = {};

  activeTiers.forEach((tier, tIdx) => {
    const colX = 60 + tIdx * 340;
    tier.services.forEach((s, idx) => {
      if (saved[s.id] && typeof saved[s.id].x === 'number' && typeof saved[s.id].y === 'number') {
        positions[s.id] = {
          x: saved[s.id].x,
          y: saved[s.id].y
        };
      } else {
        positions[s.id] = {
          x: colX,
          y: 70 + idx * 190
        };
      }
    });
  });

  services.forEach((s, idx) => {
    if (!positions[s.id]) {
      if (saved[s.id] && typeof saved[s.id].x === 'number') {
        positions[s.id] = {
          x: saved[s.id].x,
          y: saved[s.id].y
        };
      } else {
        positions[s.id] = { x: 60 + idx * 340, y: 70 };
      }
    }
  });

  return positions;
}

export function calculateConnections(services) {
  const connections = [];
  const frontends = [];
  const backends = [];
  const databases = [];
  const gateways = [];

  services.forEach(s => {
    const t = ((s.type || '') + ' ' + (s.tech || '') + ' ' + (s.label || '')).toLowerCase();
    if (t.includes('front') || t.includes('web') || t.includes('client') || t.includes('ui') || t.includes('next')) {
      frontends.push(s);
    } else if (t.includes('data') || t.includes('db') || t.includes('postgres') || t.includes('sql') || t.includes('sqlite') || t.includes('mongo')) {
      databases.push(s);
    } else if (t.includes('gate') || t.includes('extern') || t.includes('third') || t.includes('stripe') || t.includes('payment') || t.includes('bre-b') || t.includes('whatsapp')) {
      gateways.push(s);
    } else {
      backends.push(s);
    }
  });

  frontends.forEach(f => {
    backends.forEach(b => connections.push({ from: f.id, to: b.id }));
  });
  backends.forEach(b => {
    databases.forEach(d => connections.push({ from: b.id, to: d.id }));
    gateways.forEach(g => connections.push({ from: b.id, to: g.id }));
  });

  if (connections.length === 0 && services.length >= 2) {
    for (let i = 0; i < services.length - 1; i++) {
      connections.push({ from: services[i].id, to: services[i + 1].id });
    }
  }

  return connections;
}

export function renderArchWires() {
  const wiresSvg = document.getElementById('arch-wires-svg');
  if (!wiresSvg) return;

  let pathsHtml = `
    <defs>
      <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#9333ea" stop-opacity="0.85" />
        <stop offset="50%" stop-color="#6366f1" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#10b981" stop-opacity="0.85" />
      </linearGradient>
    </defs>
  `;

  state.archConnections.forEach(conn => {
    const posFrom = state.nodePositions[conn.from];
    const posTo = state.nodePositions[conn.to];
    if (!posFrom || !posTo) return;

    const elFrom = document.getElementById(`arch-node-${conn.from}`);
    const elTo = document.getElementById(`arch-node-${conn.to}`);

    const wFrom = elFrom ? elFrom.offsetWidth : 260;
    const hFrom = (elFrom && elFrom.offsetHeight > 50) ? elFrom.offsetHeight : 156;
    const wTo = elTo ? elTo.offsetWidth : 260;
    const hTo = (elTo && elTo.offsetHeight > 50) ? elTo.offsetHeight : 156;

    // Centro vertical exacto coincidiendo con 'top: 50%' del punto de contacto
    const yFromCenter = posFrom.y + Math.round(hFrom / 2);
    const yToCenter = posTo.y + Math.round(hTo / 2);

    let x1, y1, x2, y2, cp1x, cp1y, cp2x, cp2y;

    if (posTo.x >= posFrom.x + wFrom - 30) {
      // De izquierda a derecha (From: Salida / Derecha -> To: Entrada / Izquierda)
      x1 = posFrom.x + wFrom;
      y1 = yFromCenter;
      x2 = posTo.x;
      y2 = yToCenter;
      const dx = x2 - x1;
      const curve = Math.max(35, dx * 0.45);
      cp1x = x1 + curve;
      cp1y = y1;
      cp2x = x2 - curve;
      cp2y = y2;
    } else if (posFrom.x >= posTo.x + wTo - 30) {
      // De derecha a izquierda (From: Entrada / Izquierda -> To: Salida / Derecha)
      x1 = posFrom.x;
      y1 = yFromCenter;
      x2 = posTo.x + wTo;
      y2 = yToCenter;
      const dx = x1 - x2;
      const curve = Math.max(35, dx * 0.45);
      cp1x = x1 - curve;
      cp1y = y1;
      cp2x = x2 + curve;
      cp2y = y2;
    } else {
      // Superposición vertical
      x1 = posFrom.x + wFrom;
      y1 = yFromCenter;
      x2 = posTo.x + wTo;
      y2 = yToCenter;
      const curve = 60;
      cp1x = Math.max(x1, x2) + curve;
      cp1y = y1;
      cp2x = Math.max(x1, x2) + curve;
      cp2y = y2;
    }

    const pathData = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;

    pathsHtml += `
      <path d="${pathData}" stroke="#818cf8" stroke-opacity="0.25" stroke-width="5" fill="none" stroke-linecap="round" />
      <path d="${pathData}" stroke="url(#wireGrad)" stroke-width="2.5" fill="none" class="animate-wire-flow" stroke-linecap="round" />
      <!-- Terminal contact point halos -->
      <circle cx="${x1}" cy="${y1}" r="3" fill="#9333ea" />
      <circle cx="${x2}" cy="${y2}" r="3" fill="#10b981" />
    `;
  });

  wiresSvg.innerHTML = pathsHtml;
}

export function renderArchNode(s, pos) {
  const isSelected = state.selectedServiceId === s.id;
  const allStories = state.appState?.requirements?.userStories || [];
  const sLabelLower = (s.label || s.id || '').toLowerCase();
  const nodeStories = allStories.filter(st => {
    if (st.serviceId && st.serviceId === s.id) return true;
    if (!st.serviceId && st.title && st.title.toLowerCase().includes(sLabelLower)) return true;
    return false;
  });
  const inProgressCount = nodeStories.filter(st => st.status === 'in_progress').length;
  const doneCount = nodeStories.filter(st => st.status === 'done').length;

  const el = document.createElement('div');
  el.id = `arch-node-${s.id}`;
  el.dataset.serviceId = s.id;
  el.style.left = `${pos.x}px`;
  el.style.top = `${pos.y}px`;
  el.className = `arch-node absolute w-[260px] pointer-events-auto bg-white border rounded-2xl p-4 shadow-sm hover:shadow-xl transition-shadow transition-colors duration-150 cursor-grab select-none z-10 group ${
    isSelected ? 'ring-2 ring-purple-600 border-purple-500 bg-purple-50/25' : (
      inProgressCount > 0 ? 'ring-2 ring-amber-400 border-amber-300 bg-amber-50/10' : 'border-zinc-200/90 hover:border-purple-500'
    )
  }`;

  el.innerHTML = `
    <div class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-xs group-hover:scale-125 transition-transform" title="Entrada"></div>
    <div class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-xs group-hover:scale-125 transition-transform" title="Salida"></div>

    <div class="flex items-center justify-between gap-2 mb-2 pointer-events-none">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full ${inProgressCount > 0 ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'} shrink-0"></span>
        <span class="text-[9px] font-mono font-bold uppercase tracking-wider ${inProgressCount > 0 ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'} px-1.5 py-0.5 rounded border">
          ${inProgressCount > 0 ? 'Agente Activo' : (s.status || 'online')}
        </span>
      </div>
      <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 truncate max-w-[100px]">
        ${escapeHtml(s.type || 'Service')}
      </span>
    </div>

    <h4 class="text-xs font-black text-zinc-950 tracking-tight group-hover:text-purple-900 transition-colors mb-2 truncate pointer-events-none">
      ${escapeHtml(s.label || s.id)}
    </h4>

    <div class="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50/70 p-2 rounded-xl border border-indigo-100/80 mb-2 truncate pointer-events-none">
      ${escapeHtml(s.tech || 'Node / TS')}
    </div>

    <div class="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1.5 border-t border-zinc-100 pointer-events-none">
      ${inProgressCount > 0 ? `
        <span class="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          <span>${inProgressCount} en progreso</span>
        </span>
      ` : `
        <span class="text-zinc-600 flex items-center gap-1">
          <i data-lucide="check-circle" class="w-3 h-3 text-emerald-500"></i>
          <span>${doneCount}/${nodeStories.length} tareas</span>
        </span>
      `}
      <span class="text-purple-600 font-bold group-hover:underline flex items-center gap-0.5">
        Tareas (${nodeStories.length}) →
      </span>
    </div>
  `;

  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    state.hasMovedDuringDrag = false;
    state.isDraggingNode = true;
    state.dragNodeId = s.id;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.initialNodeX = state.nodePositions[s.id]?.x || 100;
    state.initialNodeY = state.nodePositions[s.id]?.y || 100;

    el.style.transition = 'none';
    el.classList.add('cursor-grabbing', 'ring-2', 'ring-purple-600', 'shadow-2xl', 'z-30');
  });

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.hasMovedDuringDrag || Date.now() < state.dragSuppressClickUntil) {
      return;
    }
    selectArchService(s.id);
  });

  return el;
}

export function bindArchCanvasEvents() {
  if (state.hasBoundCanvasEvents) return;
  state.hasBoundCanvasEvents = true;

  const stage = document.getElementById('arch-canvas-stage');
  if (!stage) return;

  stage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (state.isDraggingNode) return;
    state.isArchPanning = true;
    state.panStartX = e.clientX - state.archPanX;
    state.panStartY = e.clientY - state.archPanY;
    stage.classList.add('cursor-grabbing');
  });

  window.addEventListener('mousemove', (e) => {
    if (state.isDraggingNode && state.dragNodeId) {
      const movedDist = Math.hypot(e.clientX - state.dragStartX, e.clientY - state.dragStartY);
      if (movedDist > 4) {
        state.hasMovedDuringDrag = true;
      }

      const dx = (e.clientX - state.dragStartX) / state.archZoom;
      const dy = (e.clientY - state.dragStartY) / state.archZoom;
      const newX = Math.round(state.initialNodeX + dx);
      const newY = Math.round(state.initialNodeY + dy);

      state.nodePositions[state.dragNodeId] = { x: newX, y: newY };
      const el = document.getElementById(`arch-node-${state.dragNodeId}`);
      if (el) {
        el.style.transition = 'none';
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
      }
      renderArchWires();
      return;
    }

    if (state.isArchPanning) {
      state.archPanX = e.clientX - state.panStartX;
      state.archPanY = e.clientY - state.panStartY;
      applyArchTransform();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (state.isDraggingNode && state.dragNodeId) {
      const draggedEl = document.getElementById(`arch-node-${state.dragNodeId}`);
      if (draggedEl) {
        draggedEl.style.transition = '';
        draggedEl.classList.remove('cursor-grabbing', 'ring-2', 'ring-purple-600', 'shadow-2xl', 'z-30');
      }

      if (state.hasMovedDuringDrag) {
        state.dragSuppressClickUntil = Date.now() + 250;
        saveCurrentArchPositions();
      }

      state.isDraggingNode = false;
      state.dragNodeId = null;
    }

    if (state.isArchPanning) {
      state.isArchPanning = false;
      stage.classList.remove('cursor-grabbing');
    }
  });

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const rect = stage.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldZoom = state.archZoom;
    const newZoom = Math.min(2.0, Math.max(0.4, Number((state.archZoom + delta).toFixed(2))));
    if (oldZoom === newZoom) return;

    state.archPanX = mouseX - (mouseX - state.archPanX) * (newZoom / oldZoom);
    state.archPanY = mouseY - (mouseY - state.archPanY) * (newZoom / oldZoom);
    state.archZoom = newZoom;

    applyArchTransform();
  }, { passive: false });
}

export function renderArchitecture() {
  const cardsContainer = document.getElementById('arch-cards-container');
  const nodesLayer = document.getElementById('arch-nodes-layer');
  const wiresSvg = document.getElementById('arch-wires-svg');
  const servicesCountBadge = document.getElementById('canvas-services-count');

  if (cardsContainer) cardsContainer.innerHTML = '';
  if (nodesLayer) nodesLayer.innerHTML = '';
  if (wiresSvg) wiresSvg.innerHTML = '';

  const services = state.appState?.architecture?.services || state.appState?.architecture?.nodes || [];
  const tabBadgeArqui = document.getElementById('tab-badge-arqui');
  if (tabBadgeArqui) {
    tabBadgeArqui.innerText = `${services.length} C4`;
  }

  if (services.length === 0) {
    if (servicesCountBadge) servicesCountBadge.innerText = '0 Servicios';
    if (nodesLayer) {
      nodesLayer.innerHTML = `
        <div class="absolute inset-0 flex items-center justify-center p-8 pointer-events-auto">
          <div class="bg-white border border-zinc-200 rounded-2xl p-10 text-center space-y-3 shadow-sm max-w-md mx-auto">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <i data-lucide="cpu" class="w-6 h-6"></i>
            </div>
            <h3 class="text-sm font-bold text-zinc-900">No hay arquitectura definida para este proyecto</h3>
            <p class="text-xs text-zinc-500 leading-relaxed">
              Los servicios y contenedores C4 se estructurarán automáticamente cuando definas los componentes de tu aplicación en el Chat con el Agente.
            </p>
            <button onclick="switchScreen('chat')" class="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
              <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
              <span>Definir en el Chat con el Agente</span>
            </button>
          </div>
        </div>
      `;
    }
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="col-span-full bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <i data-lucide="cpu" class="w-6 h-6"></i>
          </div>
          <h3 class="text-sm font-bold text-zinc-900">No hay servicios registrados</h3>
          <p class="text-xs text-zinc-500 max-w-sm mx-auto">Define tu arquitectura en el Chat.</p>
        </div>
      `;
    }
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  if (servicesCountBadge) {
    servicesCountBadge.innerText = `${services.length} ${services.length === 1 ? 'Servicio Activo' : 'Servicios Activos'}`;
  }

  // 1. Grid view
  if (cardsContainer) {
    services.forEach(s => {
      const card = document.createElement('div');
      card.className = 'bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-sm font-black text-zinc-950">${escapeHtml(s.label || s.id)}</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">${s.status || 'online'}</span>
        </div>
        <div class="text-xs font-mono font-bold text-indigo-700 bg-indigo-50/70 p-2 rounded-xl border border-indigo-100">${escapeHtml(s.tech || s.type || 'Service')}</div>
        <p class="text-xs text-zinc-600 leading-relaxed">${escapeHtml(s.description || '')}</p>
      `;
      cardsContainer.appendChild(card);
    });
  }

  // 2. Interactive Draggable Canvas View
  state.nodePositions = calculateInitialPositions(services);
  state.archConnections = calculateConnections(services);

  services.forEach(s => {
    const pos = state.nodePositions[s.id] || { x: 100, y: 100 };
    const nodeEl = renderArchNode(s, pos);
    nodesLayer?.appendChild(nodeEl);
  });

  renderArchWires();
  bindArchCanvasEvents();
  applyArchTransform();
  if (window.lucide) window.lucide.createIcons();
}

export function setDrawerTab(tab) {
  const secTasks = document.getElementById('drawer-section-tasks');
  const secSpecs = document.getElementById('drawer-section-specs');
  const btnTasks = document.getElementById('btn-drawer-tab-tasks');
  const btnSpecs = document.getElementById('btn-drawer-tab-specs');

  if (tab === 'tasks') {
    secTasks?.classList.remove('hidden');
    secSpecs?.classList.add('hidden');
    btnTasks?.classList.add('bg-white', 'text-zinc-950', 'shadow-2xs', 'font-black');
    btnTasks?.classList.remove('text-zinc-600');
    btnSpecs?.classList.remove('bg-white', 'text-zinc-950', 'shadow-2xs', 'font-black');
    btnSpecs?.classList.add('text-zinc-600');
  } else {
    secTasks?.classList.add('hidden');
    secSpecs?.classList.remove('hidden');
    btnSpecs?.classList.add('bg-white', 'text-zinc-950', 'shadow-2xs', 'font-black');
    btnSpecs?.classList.remove('text-zinc-600');
    btnTasks?.classList.remove('bg-white', 'text-zinc-950', 'shadow-2xs', 'font-black');
    btnTasks?.classList.add('text-zinc-600');
  }
  if (window.lucide) window.lucide.createIcons();
}

export function toggleTaskCreationForm(force) {
  const form = document.getElementById('drawer-task-form');
  if (!form) return;
  if (force !== undefined) {
    if (force) form.classList.remove('hidden');
    else form.classList.add('hidden');
  } else {
    form.classList.toggle('hidden');
  }
  if (!form.classList.contains('hidden')) {
    document.getElementById('new-task-title')?.focus();
  }
  if (window.lucide) window.lucide.createIcons();
}

export async function submitNodeTask() {
  const titleInput = document.getElementById('new-task-title');
  const prioritySelect = document.getElementById('new-task-priority');
  const filesInput = document.getElementById('new-task-files');
  const gherkinInput = document.getElementById('new-task-gherkin');
  const submitBtn = document.getElementById('btn-submit-task');

  const title = titleInput?.value?.trim();
  if (!title) {
    showToast('Ingresa el título de la tarea', 'alert-circle');
    titleInput?.focus();
    return;
  }

  const priority = prioritySelect?.value || 'P1';
  const rawFiles = filesInput?.value || '';
  const scopeFiles = rawFiles.split(',').map(s => s.trim()).filter(Boolean);
  const gherkinText = gherkinInput?.value?.trim();

  const criteria = gherkinText ? [{
    scenario: 'Verificación del requerimiento',
    given: 'el usuario en la aplicación',
    when: gherkinText,
    then: 'el sistema responde de forma exitosa y sin regresiones',
    done: false
  }] : [];

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Guardando...</span>';
  }

  try {
    const res = await createStory({
      serviceId: state.selectedServiceId || 'core-app',
      title,
      priority,
      scopeFiles: scopeFiles.length > 0 ? scopeFiles : ['src/**', 'app/**'],
      acceptanceCriteria: criteria
    });

    showToast(`¡Tarea ${res.story.id} creada en Backlog!`, 'check-circle');

    if (titleInput) titleInput.value = '';
    if (gherkinInput) gherkinInput.value = '';
    toggleTaskCreationForm(false);

    if (window.loadData) await window.loadData();
    selectArchService(state.selectedServiceId);
  } catch (err) {
    showToast(err.message || 'Error al crear tarea', 'alert-circle');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5 text-purple-400"></i><span>Crear Tarea en Backlog</span>';
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

export async function dispatchStoryToAgent(storyId) {
  try {
    showToast('Despachando orden al agente...', 'sparkles');
    const res = await dispatchStoryTask(storyId, 'Antigravity');
    showToast(`⚡ Tarea ${storyId} asignada a ${res.activeTask?.assignedTo || 'Antigravity'} con scope blindado`, 'check-circle');
    if (window.loadData) await window.loadData();
    selectArchService(state.selectedServiceId);
  } catch (err) {
    showToast(err.message || 'Error al despachar orden', 'alert-circle');
  }
}

export async function toggleStoryGherkin(storyId, criterionId, isDone) {
  try {
    await patchSdd({ storyId, criterionId, done: isDone });
    showToast('Criterio de aceptación actualizado');
    if (window.loadData) await window.loadData();
    selectArchService(state.selectedServiceId);
  } catch {
    showToast('Error al actualizar criterio', 'alert-circle');
  }
}

export async function completeStory(storyId) {
  try {
    await patchSdd({ storyId, status: 'done' });
    showToast(`¡Historia ${storyId} completada con éxito!`, 'check-circle');
    if (window.loadData) await window.loadData();
    selectArchService(state.selectedServiceId);
  } catch {
    showToast('Error al completar historia', 'alert-circle');
  }
}

export function selectArchService(serviceId) {
  state.selectedServiceId = serviceId;
  const services = state.appState?.architecture?.services || state.appState?.architecture?.nodes || [];
  const s = services.find(x => x.id === serviceId) || {
    id: serviceId,
    label: serviceId,
    type: 'Microservicio',
    tech: 'Next.js / Node.js',
    status: 'online',
    description: 'Servicio en ejecución activo en el contenedor de arquitectura.'
  };

  // Highlight active node
  document.querySelectorAll('.arch-node').forEach(n => {
    n.classList.remove('ring-2', 'ring-purple-600', 'border-purple-500', 'bg-purple-50/20');
  });
  const activeEl = document.getElementById(`arch-node-${serviceId}`);
  if (activeEl) {
    activeEl.classList.add('ring-2', 'ring-purple-600', 'border-purple-500', 'bg-purple-50/20');
  }

  // Open and populate drawer
  const drawer = document.getElementById('arch-inspector-drawer');
  if (!drawer) return;
  drawer.classList.remove('hidden');

  const titleEl = document.getElementById('inspector-title');
  const typeEl = document.getElementById('inspector-type');
  const statusBadge = document.getElementById('inspector-status-badge');
  const techEl = document.getElementById('inspector-tech');
  const descEl = document.getElementById('inspector-desc');
  const statusEl = document.getElementById('inspector-status');
  const healthEl = document.getElementById('inspector-health');

  if (titleEl) titleEl.innerText = s.label || s.id;
  if (typeEl) typeEl.innerText = s.type || 'Service';
  if (statusBadge) statusBadge.innerText = (s.status || 'online').toUpperCase();
  if (techEl) techEl.innerText = s.tech || 'Fullstack Node';
  if (descEl) descEl.innerText = s.description || 'Componente estructurado dentro del plano de arquitectura SDD.';
  if (statusEl) statusEl.innerText = (s.status || 'online').toUpperCase();
  if (healthEl) healthEl.innerText = `${s.healthPercent || 100}% HEALTH`;

  // Pre-fill scopeFiles in creation form
  const inputFiles = document.getElementById('new-task-files');
  if (inputFiles) {
    const sFiles = s.submodules && s.submodules.length > 0
      ? s.submodules.join(', ')
      : (s.type?.includes('Frontend') ? 'ui/**, src/views/**' : 'src/**, app/api/**');
    inputFiles.value = sFiles;
  }

  // Populate technical scope files
  const filesContainer = document.getElementById('inspector-files');
  const allStories = state.appState?.requirements?.userStories || [];
  const sLabelLower = (s.label || s.id || '').toLowerCase();

  // Filter stories belonging to this service node
  const nodeStories = allStories.filter(st => {
    if (st.serviceId && st.serviceId === serviceId) return true;
    if (!st.serviceId && st.title && st.title.toLowerCase().includes(sLabelLower)) return true;
    return false;
  });

  // Update task count badge in header
  const countBadge = document.getElementById('drawer-task-count');
  if (countBadge) countBadge.innerText = String(nodeStories.length);

  // Collect related files
  const relatedFiles = new Set(s.submodules || []);
  nodeStories.forEach(st => {
    (st.scopeFiles || []).forEach(f => relatedFiles.add(f));
  });
  if (filesContainer) {
    filesContainer.innerHTML = Array.from(relatedFiles).slice(0, 8).map(f => `
      <div class="px-2 py-1 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 truncate font-mono text-[10px]">
        <code>${escapeHtml(f)}</code>
      </div>
    `).join('') || '<span class="text-zinc-400 italic">No hay archivos mapeados en scope</span>';
  }

  // Render Stories & Jira Board inside Drawer
  const storiesContainer = document.getElementById('drawer-node-stories-container');
  if (storiesContainer) {
    if (nodeStories.length === 0) {
      storiesContainer.innerHTML = `
        <div class="bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-6 text-center space-y-2.5">
          <div class="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
            <i data-lucide="clipboard-list" class="w-4 h-4"></i>
          </div>
          <div class="space-y-0.5">
            <p class="text-xs font-black text-zinc-900">No hay tareas para este componente</p>
            <p class="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
              Haz clic en "Nueva Tarea para el Agente" arriba para pedirle a la IA que construya o modifique este servicio.
            </p>
          </div>
          <button onclick="toggleTaskCreationForm(true)" class="mt-2 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Crear primera tarea</span>
          </button>
        </div>
      `;
    } else {
      storiesContainer.innerHTML = nodeStories.map(st => {
        const isDone = st.status === 'done';
        const isInProgress = st.status === 'in_progress';
        const totalCriteria = st.acceptanceCriteria?.length || 0;
        const doneCriteria = st.acceptanceCriteria?.filter(c => c.done).length || 0;

        return `
          <div class="bg-white border rounded-2xl p-4 shadow-xs space-y-3 transition-all ${
            isInProgress ? 'border-amber-300 ring-2 ring-amber-100' : 'border-zinc-200'
          }">
            <!-- Story Header -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-mono font-black text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                  ${st.id}
                </span>
                <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  st.priority === 'P0' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-zinc-100 text-zinc-600'
                }">
                  ${st.priority || 'P1'}
                </span>
              </div>
              <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                isDone ? 'bg-emerald-100 text-emerald-800' : (
                  isInProgress ? 'bg-amber-100 text-amber-800 flex items-center gap-1' : 'bg-zinc-100 text-zinc-600'
                )
              }">
                ${isInProgress ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>' : ''}
                ${isDone ? 'Completada' : (isInProgress ? 'En Progreso' : 'Backlog')}
              </span>
            </div>

            <!-- Title & User Need -->
            <div>
              <h4 class="text-xs font-black text-zinc-950 leading-snug">${escapeHtml(st.title)}</h4>
              ${st.role && st.action ? `
                <p class="text-[11px] text-zinc-500 mt-1">
                  Como <b>${escapeHtml(st.role)}</b> quiero <b>${escapeHtml(st.action)}</b> para <b>${escapeHtml(st.benefit || '')}</b>.
                </p>
              ` : ''}
            </div>

            <!-- Gherkin Criteria Checklist -->
            <div class="space-y-1.5 pt-2 border-t border-zinc-100">
              <div class="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400">
                <span>CRITERIOS GHERKIN (DADO-CUANDO-ENTONCES)</span>
                <span>${doneCriteria}/${totalCriteria}</span>
              </div>
              <div class="space-y-1">
                ${(st.acceptanceCriteria || []).map(c => `
                  <label class="flex items-start gap-2 text-[11px] text-zinc-700 cursor-pointer hover:bg-zinc-50 p-1.5 rounded-lg border border-transparent hover:border-zinc-200 transition-colors">
                    <input type="checkbox" ${c.done ? 'checked' : ''} onchange="toggleStoryGherkin('${st.id}', '${c.id}', this.checked)" class="mt-0.5 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer">
                    <span class="leading-relaxed ${c.done ? 'line-through text-zinc-400' : 'text-zinc-800 font-medium'}">
                      ${escapeHtml(c.scenario || `${c.given || ''} -> ${c.when || ''} -> ${c.then || ''}`)}
                    </span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Action buttons -->
            <div class="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
              ${!isDone && !isInProgress ? `
                <button onclick="dispatchStoryToAgent('${st.id}')" class="w-full py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                  <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-300"></i>
                  <span>Despachar orden al Agente</span>
                </button>
              ` : ''}

              ${isInProgress ? `
                <div class="flex items-center justify-between w-full gap-2">
                  <span class="text-[10px] font-mono font-bold text-amber-700 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    <span>Agente asignado: ${st.assignedTo || 'Antigravity'}</span>
                  </span>
                  <button onclick="completeStory('${st.id}')" class="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                    <i data-lucide="check" class="w-3 h-3"></i>
                    <span>Listo</span>
                  </button>
                </div>
              ` : ''}

              ${isDone ? `
                <div class="flex items-center justify-between w-full text-[10px] font-mono font-bold text-emerald-700">
                  <span class="flex items-center gap-1">
                    <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>Verificado contra tests</span>
                  </span>
                  <span class="text-zinc-400">100% DONE</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Ensure window global exposure
  window.setDrawerTab = setDrawerTab;
  window.toggleTaskCreationForm = toggleTaskCreationForm;
  window.submitNodeTask = submitNodeTask;
  window.dispatchStoryToAgent = dispatchStoryToAgent;
  window.toggleStoryGherkin = toggleStoryGherkin;
  window.completeStory = completeStory;

  if (window.lucide) window.lucide.createIcons();
}

export function closeArchInspector() {
  state.selectedServiceId = null;
  document.getElementById('arch-inspector-drawer')?.classList.add('hidden');
  document.querySelectorAll('.arch-node').forEach(n => {
    n.classList.remove('ring-2', 'ring-purple-600', 'border-purple-500', 'bg-purple-50/20');
  });
}

// Window global bindings
window.setDrawerTab = setDrawerTab;
window.toggleTaskCreationForm = toggleTaskCreationForm;
window.submitNodeTask = submitNodeTask;
window.dispatchStoryToAgent = dispatchStoryToAgent;
window.toggleStoryGherkin = toggleStoryGherkin;
window.completeStory = completeStory;
