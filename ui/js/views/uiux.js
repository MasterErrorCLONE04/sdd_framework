// SDD Studio — UI/UX Mockups, Declarative Wireframes & Design System Perspective

import { state } from '../state.js';
import { rescanUiux } from '../api.js';
import { showToast, escapeHtml } from '../utils.js';

export function setUiuxSubTab(tab) {
  state.uiuxActiveSubTab = tab;
  const tabs = ['screens', 'wireframes', 'design-system'];

  tabs.forEach(t => {
    const btn = document.getElementById(`uiux-subtab-${t.replace('-', '')}`);
    const badge = document.getElementById(`uiux-subtab-badge-${t.replace('-', '')}`);
    if (btn) {
      if (t === tab) {
        btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-pink-100 text-pink-900 border border-pink-300 flex items-center gap-2 cursor-pointer transition-all shadow-xs';
        if (badge) badge.className = 'px-1.5 py-0.2 rounded-full text-[10px] bg-pink-200 text-pink-900 font-mono font-bold';
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 border border-zinc-200 flex items-center gap-2 cursor-pointer transition-all';
        if (badge) badge.className = 'px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-200 text-zinc-700 font-mono';
      }
    }
  });

  const paneScreens = document.getElementById('uiux-pane-screens');
  const paneWireframes = document.getElementById('uiux-pane-wireframes');
  const paneDs = document.getElementById('uiux-pane-designsystem');
  const filterBar = document.getElementById('uiux-screens-filter-bar');

  if (paneScreens) paneScreens.classList.toggle('hidden', tab !== 'screens');
  if (paneWireframes) paneWireframes.classList.toggle('hidden', tab !== 'wireframes');
  if (paneDs) paneDs.classList.toggle('hidden', tab !== 'design-system');
  if (filterBar) filterBar.classList.toggle('hidden', tab !== 'screens');

  renderUIUX();
}

export function setUiuxFilter(filter) {
  state.uiuxActiveFilter = filter;
  const filters = ['all', 'dynamic', 'static'];
  filters.forEach(f => {
    const btn = document.getElementById(`uiux-filter-${f}`);
    if (!btn) return;
    if (f === filter) {
      btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-100 text-pink-900 border border-pink-300 cursor-pointer';
    } else {
      btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-100 border border-zinc-200 cursor-pointer';
    }
  });
  renderUIUX();
}

export function filterUiuxScreens(term) {
  state.uiuxSearchTerm = (term || '').toLowerCase().trim();
  renderUIUX();
}

export async function rescanUiuxViews() {
  const btn = document.getElementById('btn-rescan-uiux');
  const label = document.getElementById('btn-rescan-uiux-label');
  if (label) label.innerText = 'Escaneando...';
  if (btn) btn.disabled = true;

  try {
    const data = await rescanUiux();
    if (data.success) {
      showToast(`✓ Se detectaron ${data.count} vistas del proyecto`, 'check-circle-2');
      if (window.loadData) await window.loadData();
    } else {
      showToast('Error al re-escanear vistas', 'alert-circle');
    }
  } catch (err) {
    console.error('Error rescanning UI/UX:', err);
    showToast('Error de conexión al re-escanear', 'alert-circle');
  } finally {
    if (label) label.innerText = 'Re-escanear Vistas';
    if (btn) btn.disabled = false;
    if (window.lucide) window.lucide.createIcons();
  }
}

export function renderUIUX() {
  const uiUx = state.appState?.uiUx || {};
  const screens = uiUx.screens || [];
  const wireframes = uiUx.wireframes || state.appState?.wireframes || [];
  const designSystem = uiUx.designSystem || state.appState?.designSystem || {};
  const components = uiUx.components || [];

  // Badges and stats
  const badgeTab = document.getElementById('tab-badge-ui');
  const badgeCount = document.getElementById('uiux-badge-count');
  const statTotal = document.getElementById('uiux-stat-total');
  const statDynamic = document.getElementById('uiux-stat-dynamic');
  const statComponents = document.getElementById('uiux-stat-components');
  const statHealth = document.getElementById('uiux-stat-health');

  const badgeSubScreens = document.getElementById('uiux-subtab-badge-screens');
  const badgeSubWireframes = document.getElementById('uiux-subtab-badge-wireframes');

  if (badgeTab) badgeTab.innerText = screens.length;
  if (badgeCount) badgeCount.innerText = `${screens.length} ${screens.length === 1 ? 'vista' : 'vistas'}`;
  if (statTotal) statTotal.innerText = screens.length;
  if (badgeSubScreens) badgeSubScreens.innerText = screens.length;
  if (badgeSubWireframes) badgeSubWireframes.innerText = wireframes.length;

  const dynamicCount = screens.filter(s => s.isDynamic || (s.route && (s.route.includes('[') || s.route.includes(':')))).length;
  if (statDynamic) statDynamic.innerText = dynamicCount;

  let totalComps = components.length;
  let totalHealth = 0;
  screens.forEach(s => {
    totalComps += (s.components?.length || 0);
    totalHealth += (s.healthPercent || 100);
  });
  if (statComponents) statComponents.innerText = totalComps;
  const avgHealth = screens.length > 0 ? Math.round(totalHealth / screens.length) : 100;
  if (statHealth) statHealth.innerText = `${avgHealth}%`;

  const currentTab = state.uiuxActiveSubTab || 'screens';

  if (currentTab === 'screens') {
    renderUIUXScreens(screens);
  } else if (currentTab === 'wireframes') {
    renderUIUXWireframes(wireframes);
  } else if (currentTab === 'design-system') {
    renderUIUXDesignSystem(designSystem, components);
  }

  if (window.lucide) window.lucide.createIcons();
}

/**
 * 1. Renderiza el Catálogo de Pantallas Enriquecidas
 */
function renderUIUXScreens(screens) {
  const container = document.getElementById('uiux-screens-container');
  if (!container) return;

  let filtered = screens.filter(s => {
    const isDyn = s.isDynamic || (s.route && (s.route.includes('[') || s.route.includes(':')));
    if (state.uiuxActiveFilter === 'dynamic' && !isDyn) return false;
    if (state.uiuxActiveFilter === 'static' && isDyn) return false;

    if (state.uiuxSearchTerm) {
      const matchName = (s.name || '').toLowerCase().includes(state.uiuxSearchTerm);
      const matchRoute = (s.route || '').toLowerCase().includes(state.uiuxSearchTerm);
      const matchActor = (s.actor || '').toLowerCase().includes(state.uiuxSearchTerm);
      const matchDesc = (s.purpose || s.description || '').toLowerCase().includes(state.uiuxSearchTerm);
      const matchComps = (s.components || []).some(c => c.toLowerCase().includes(state.uiuxSearchTerm));
      if (!matchName && !matchRoute && !matchActor && !matchDesc && !matchComps) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    if (screens.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white border border-dashed border-zinc-300 rounded-2xl p-12 text-center space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mx-auto">
            <i data-lucide="layout" class="w-6 h-6"></i>
          </div>
          <div class="space-y-1">
            <h3 class="text-sm font-bold text-zinc-900">No hay vistas registradas en el proyecto</h3>
            <p class="text-xs text-zinc-500 max-w-md mx-auto">SDD escanea tu proyecto o genera automáticamente pantallas canónicas con actor, propósitos y estados.</p>
          </div>
          <button onclick="rescanUiuxViews()" class="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs">
            <i data-lucide="scan" class="w-4 h-4"></i>
            <span>Escanear Vistas Ahora</span>
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="col-span-full bg-white border border-zinc-200 rounded-2xl p-10 text-center space-y-2">
          <p class="text-xs font-bold text-zinc-700">No se encontraron vistas que coincidan con la búsqueda.</p>
          <button onclick="document.getElementById('uiux-search-input').value = ''; filterUiuxScreens(''); setUiuxFilter('all');" class="text-xs text-pink-600 font-bold hover:underline cursor-pointer">Limpiar filtros</button>
        </div>
      `;
    }
    return;
  }

  container.innerHTML = filtered.map(s => {
    const isDynamic = s.isDynamic || (s.route && (s.route.includes('[') || s.route.includes(':')));
    const comps = s.components || [];
    const route = s.route || '/';
    const actor = s.actor || 'Usuario';
    const purpose = s.purpose || s.description || 'Vista estructurada de la aplicación.';
    const states = s.states || {};
    const flows = s.relatedFlows || [];
    const dataReq = s.dataRequired || [];

    // Layout wireframe visual preview
    let wireframePreview = `
      <div class="flex gap-1.5 h-16">
        <div class="w-1/4 bg-zinc-200/80 rounded flex flex-col gap-1 p-1">
          <div class="h-1.5 w-full bg-zinc-300 rounded"></div>
          <div class="h-1.5 w-3/4 bg-zinc-300 rounded"></div>
        </div>
        <div class="flex-1 flex flex-col gap-1.5">
          <div class="h-2.5 w-1/3 bg-zinc-200 rounded"></div>
          <div class="grid grid-cols-2 gap-1 flex-1">
            <div class="bg-zinc-200/60 rounded border border-zinc-300/40 p-1 flex flex-col justify-end"><div class="h-1.5 w-2/3 bg-pink-300 rounded"></div></div>
            <div class="bg-zinc-200/60 rounded border border-zinc-300/40 p-1 flex flex-col justify-end"><div class="h-1.5 w-1/2 bg-purple-300 rounded"></div></div>
          </div>
        </div>
      </div>
    `;

    return `
      <div class="bg-white border border-zinc-200 hover:border-pink-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group">
        <!-- Header: Badges & Health -->
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200">
                ${escapeHtml(s.id || 'SCR')}
              </span>
              <span class="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                👤 ${escapeHtml(actor)}
              </span>
            </div>
            <span class="text-[10px] font-mono font-bold bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">
              ${s.healthPercent || 100}% OK
            </span>
          </div>

          <!-- Name & Route -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-black text-zinc-950 truncate group-hover:text-pink-600 transition-colors" title="${escapeHtml(s.name)}">
                ${escapeHtml(s.name)}
              </h3>
              ${isDynamic ? '<span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">DINÁMICA</span>' : ''}
            </div>

            <div class="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/80 rounded-lg px-2 py-1">
              <span class="text-[10px] font-mono font-bold text-pink-600">GET</span>
              <code class="text-[11px] font-mono text-zinc-700 truncate flex-1">${escapeHtml(route)}</code>
              <button
                onclick="navigator.clipboard.writeText('${escapeHtml(route)}'); showToast('Ruta copiada');"
                class="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                title="Copiar ruta"
              >
                <i data-lucide="copy" class="w-3 h-3"></i>
              </button>
            </div>
          </div>

          <!-- Purpose -->
          <p class="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed" title="${escapeHtml(purpose)}">
            ${escapeHtml(purpose)}
          </p>
        </div>

        <!-- Wireframe Browser Mockup -->
        <div class="rounded-xl border border-zinc-200/90 bg-zinc-50 overflow-hidden shadow-2xs">
          <div class="bg-zinc-100/90 px-2 py-1 border-b border-zinc-200/80 flex items-center justify-between">
            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            </div>
            <span class="text-[9px] font-mono text-zinc-400 truncate text-center">localhost:3000${escapeHtml(route)}</span>
            <button onclick="setUiuxSubTab('wireframes')" class="text-[9px] text-pink-600 hover:underline font-bold cursor-pointer">Ver Layout ↗</button>
          </div>
          <div class="p-2.5 bg-zinc-50/50">
            ${wireframePreview}
          </div>
        </div>

        <!-- States Matrix -->
        <div class="space-y-1.5 pt-1 border-t border-zinc-100">
          <div class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estados UI Especificados</div>
          <div class="grid grid-cols-2 gap-1 text-[10px]">
            <span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 truncate" title="Loading: ${escapeHtml(states.loading || 'Cargando...')}">
              ⏳ ${escapeHtml(states.loading ? 'Loading definido' : 'Loading')}
            </span>
            <span class="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 truncate" title="Empty: ${escapeHtml(states.empty || 'Sin registros')}">
              📭 ${escapeHtml(states.empty ? 'Empty definido' : 'Empty')}
            </span>
            <span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 truncate" title="Error: ${escapeHtml(states.error || 'Manejo de errores')}">
              ⚠️ ${escapeHtml(states.error ? 'Error definido' : 'Error')}
            </span>
            <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 truncate" title="Success: ${escapeHtml(states.success || 'Operación exitosa')}">
              ✅ ${escapeHtml(states.success ? 'Success definido' : 'Success')}
            </span>
          </div>
        </div>

        <!-- Linked Data & Flows -->
        <div class="space-y-1.5 pt-1 border-t border-zinc-100 text-[10px]">
          <div class="flex items-center justify-between text-zinc-400 font-bold uppercase tracking-wider">
            <span>Componentes & Flujos</span>
            <span class="font-mono text-zinc-500">${comps.length} comps</span>
          </div>
          <div class="flex flex-wrap gap-1">
            ${flows.map(fl => `<span class="px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono">🌊 ${escapeHtml(fl)}</span>`).join('')}
            ${dataReq.map(d => `<span class="px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200 font-mono">📦 ${escapeHtml(d)}</span>`).join('')}
            ${comps.slice(0, 3).map(c => `<span class="px-1.5 py-0.2 rounded bg-pink-50 text-pink-700 border border-pink-200 font-mono">🧩 ${escapeHtml(c)}</span>`).join('')}
            ${comps.length > 3 ? `<span class="px-1 py-0.2 text-[9px] text-zinc-400 font-mono">+${comps.length - 3}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 2. Renderiza Wireframes Declarativos con Layouts Visuales
 */
function renderUIUXWireframes(wireframes) {
  const container = document.getElementById('uiux-wireframes-container');
  if (!container) return;

  if (wireframes.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-dashed border-zinc-300 rounded-2xl p-12 text-center space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <i data-lucide="panels-top-left" class="w-6 h-6"></i>
        </div>
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-zinc-900">No hay wireframes declarativos registrados</h3>
          <p class="text-xs text-zinc-500 max-w-md mx-auto">Los wireframes estructuran los bloques visuales (navbar, sidebar, formularios, tablas de datos) antes de programar.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = wireframes.map(wf => {
    const blocks = wf.blocks || [];
    const layout = wf.layout || 'dashboard';

    return `
      <div class="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-4">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                ${escapeHtml(wf.id || 'WF')}
              </span>
              <span class="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                Pantalla: ${escapeHtml(wf.screenId || 'General')}
              </span>
              <span class="text-xs font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                ${escapeHtml(layout)}
              </span>
            </div>
            <h3 class="text-base font-black text-zinc-950">${escapeHtml(wf.title || 'Wireframe')}</h3>
            ${wf.notes ? `<p class="text-xs text-zinc-500">${escapeHtml(wf.notes)}</p>` : ''}
          </div>
          <span class="text-[10px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-1 rounded-lg">
            ${blocks.length} bloques declarativos
          </span>
        </div>

        <!-- Visual Declarative Layout Canvas -->
        <div class="rounded-xl border border-zinc-300 bg-zinc-100 p-2 space-y-2 shadow-inner">
          <!-- Browser Frame Header -->
          <div class="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-zinc-200 text-[10px] text-zinc-500">
            <div class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-rose-400"></span>
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <span class="flex-1 text-center font-mono text-[9px] text-zinc-400 bg-zinc-50 py-0.5 rounded border border-zinc-100">
              localhost:3000 (Vista Previa Wireframe)
            </span>
          </div>

          <!-- Blocks Rendering -->
          <div class="space-y-2 p-1">
            ${blocks.map(b => renderWireframeBlock(b)).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renderiza un bloque declarativo individual dentro del wireframe
 */
function renderWireframeBlock(b) {
  const type = (b.type || 'card').toLowerCase();
  const props = b.properties || {};

  switch (type) {
    case 'navbar': {
      const brand = props.brand || b.title || 'App Brand';
      const links = props.links || ['Inicio', 'Módulos', 'Configuración'];
      return `
        <div class="bg-zinc-900 text-white rounded-lg px-3 py-2 flex items-center justify-between text-xs shadow-2xs">
          <div class="flex items-center gap-2 font-black">
            <span class="w-3 h-3 rounded bg-pink-500"></span>
            <span>${escapeHtml(brand)}</span>
          </div>
          <div class="flex items-center gap-2 text-[10px] text-zinc-400">
            ${links.map(l => `<span class="hover:text-white">${escapeHtml(l)}</span>`).join(' • ')}
          </div>
        </div>
      `;
    }

    case 'sidebar': {
      const items = props.items || ['Panel', 'Operaciones', 'Historial'];
      return `
        <div class="bg-white border border-zinc-200 rounded-lg p-2.5 space-y-1 text-xs">
          <div class="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Menú Lateral</div>
          <div class="flex flex-wrap gap-1.5">
            ${items.map(it => `<span class="px-2 py-1 rounded bg-zinc-100 text-zinc-700 text-[10px] font-mono">📁 ${escapeHtml(it)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    case 'stats-grid': {
      const items = props.items || [
        { label: 'Total', value: '1,280' },
        { label: 'Disponibilidad', value: '99.9%' }
      ];
      return `
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${items.map(it => `
            <div class="bg-white border border-zinc-200 rounded-lg p-2.5 space-y-0.5">
              <span class="text-[9px] font-mono uppercase text-zinc-400 font-bold">${escapeHtml(it.label || 'Métrica')}</span>
              <div class="text-sm font-black text-zinc-900">${escapeHtml(String(it.value || '0'))}</div>
              ${it.change ? `<span class="text-[9px] text-emerald-600 font-bold">${escapeHtml(it.change)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    case 'table': {
      const title = b.title || props.title || 'Tabla de Datos';
      const cols = props.columns || ['ID', 'Nombre', 'Estado', 'Fecha'];
      return `
        <div class="bg-white border border-zinc-200 rounded-lg overflow-hidden space-y-1 p-2">
          <div class="flex items-center justify-between text-xs font-bold text-zinc-800">
            <span>📋 ${escapeHtml(title)}</span>
            <span class="text-[9px] font-mono text-zinc-400">Datos simulados</span>
          </div>
          <div class="grid grid-cols-4 gap-1 text-[9px] font-mono font-bold bg-zinc-50 p-1.5 rounded text-zinc-500 uppercase">
            ${cols.map(c => `<span class="truncate">${escapeHtml(c)}</span>`).join('')}
          </div>
          <div class="space-y-1 pt-1">
            <div class="grid grid-cols-4 gap-1 text-[10px] font-mono p-1 bg-white border-b border-zinc-100 text-zinc-700">
              <span class="text-pink-600 font-bold">#001</span><span>Elemento Alpha</span><span class="text-emerald-600 font-bold">Activo</span><span>2026-10-06</span>
            </div>
            <div class="grid grid-cols-4 gap-1 text-[10px] font-mono p-1 bg-white text-zinc-700">
              <span class="text-pink-600 font-bold">#002</span><span>Elemento Beta</span><span class="text-amber-600 font-bold">Pendiente</span><span>2026-10-05</span>
            </div>
          </div>
        </div>
      `;
    }

    case 'form': {
      const title = b.title || props.title || 'Formulario de Entrada';
      const fields = props.fields || [
        { label: 'Nombre / Título', type: 'text' },
        { label: 'Descripción', type: 'text' }
      ];
      return `
        <div class="bg-white border border-zinc-200 rounded-lg p-3 space-y-2 text-xs">
          <div class="font-bold text-zinc-900">📝 ${escapeHtml(title)}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${fields.map(f => `
              <div class="space-y-0.5">
                <label class="text-[9px] font-bold text-zinc-500 uppercase">${escapeHtml(f.label || f.name || 'Campo')}</label>
                <div class="h-6 w-full bg-zinc-50 border border-zinc-200 rounded px-2 flex items-center text-[10px] text-zinc-400">Entrada de texto...</div>
              </div>
            `).join('')}
          </div>
          <div class="flex items-center justify-end gap-1.5 pt-1">
            <span class="px-2.5 py-1 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold">Cancelar</span>
            <span class="px-2.5 py-1 rounded bg-pink-600 text-white text-[10px] font-bold">Guardar</span>
          </div>
        </div>
      `;
    }

    case 'actions': {
      const buttons = props.buttons || ['Crear', 'Exportar'];
      return `
        <div class="flex items-center gap-2 justify-end">
          ${buttons.map((btn, i) => `
            <span class="px-3 py-1 rounded-lg text-xs font-bold ${i === 0 ? 'bg-zinc-900 text-white shadow-2xs' : 'bg-white border border-zinc-200 text-zinc-700'}">
              ${escapeHtml(typeof btn === 'string' ? btn : btn.label || 'Acción')}
            </span>
          `).join('')}
        </div>
      `;
    }

    default: {
      return `
        <div class="bg-white border border-zinc-200 rounded-lg p-2.5 space-y-1 text-xs">
          <div class="font-bold text-zinc-800">${escapeHtml(b.title || type)}</div>
          ${b.description ? `<p class="text-[11px] text-zinc-500">${escapeHtml(b.description)}</p>` : ''}
        </div>
      `;
    }
  }
}

/**
 * 3. Renderiza los Tokens del Design System
 */
function renderUIUXDesignSystem(ds = {}, components = []) {
  const container = document.getElementById('uiux-designsystem-container');
  if (!container) return;

  const colors = ds.colors || {
    primary: '#7c3aed',
    secondary: '#4f46e5',
    accent: '#10b981',
    background: '#09090b',
    surface: '#18181b',
    text: '#f4f4f5',
    border: '#27272a',
    muted: '#71717a'
  };

  const typography = ds.typography || {
    fontFamily: 'Inter, sans-serif',
    headingFont: 'Inter, sans-serif',
    monoFont: 'JetBrains Mono, monospace'
  };

  const radius = ds.radius || { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', full: '9999px' };
  const spacing = ds.spacing || { base: '1rem', container: '1280px' };

  container.innerHTML = `
    <!-- 1. Color Palette Tokens -->
    <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">Paleta Canónica</span>
            <h3 class="text-base font-black text-zinc-950">Tokens de Color</h3>
          </div>
          <p class="text-xs text-zinc-500">Definición de variables cromáticas para interfaces coherentes y accesibles.</p>
        </div>
        <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">Tema: ${escapeHtml(ds.theme || 'modern-clean')}</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        ${Object.entries(colors).map(([name, hex]) => `
          <div
            onclick="navigator.clipboard.writeText('${escapeHtml(hex)}'); showToast('Color ${name} copiado: ${escapeHtml(hex)}');"
            class="bg-zinc-50 border border-zinc-200/80 hover:border-pink-300 rounded-xl p-2.5 space-y-2 cursor-pointer transition-all hover:scale-102 group shadow-2xs"
            title="Click para copiar HEX"
          >
            <div class="w-full h-12 rounded-lg border border-black/10 shadow-inner" style="background-color: ${escapeHtml(hex)};"></div>
            <div class="space-y-0.5">
              <div class="text-[10px] font-bold text-zinc-800 uppercase tracking-wider truncate">${escapeHtml(name)}</div>
              <div class="text-[10px] font-mono text-zinc-500 group-hover:text-pink-600 transition-colors">${escapeHtml(hex)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 2. Typography & Spatial Tokens -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Typography -->
      <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Tipografía</span>
          <h3 class="text-base font-black text-zinc-950">Fuentes & Jerarquía</h3>
        </div>

        <div class="space-y-3">
          <div class="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <div class="text-[10px] font-mono font-bold uppercase text-zinc-400">Fuente Principal (Body)</div>
            <div class="text-sm font-semibold text-zinc-900">${escapeHtml(typography.fontFamily)}</div>
            <p class="text-xs text-zinc-600 leading-relaxed">El rápido zorro marrón salta sobre el perro perezoso. 0123456789</p>
          </div>

          <div class="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <div class="text-[10px] font-mono font-bold uppercase text-zinc-400">Fuente Monoespaciada (Código / DTOs)</div>
            <div class="text-sm font-mono font-bold text-zinc-900">${escapeHtml(typography.monoFont)}</div>
            <p class="text-xs font-mono text-zinc-600">const spec = { id: 'SCR-01', status: 'valid' };</p>
          </div>
        </div>
      </div>

      <!-- Radii & Spacing -->
      <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Geometría</span>
          <h3 class="text-base font-black text-zinc-950">Border Radius & Espaciados</h3>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${Object.entries(radius).map(([key, val]) => `
            <div class="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center space-y-2">
              <div class="w-10 h-10 bg-pink-100 border-2 border-pink-500 mx-auto" style="border-radius: ${escapeHtml(val)};"></div>
              <div class="text-[10px] font-mono font-bold text-zinc-800 uppercase">${escapeHtml(key)}</div>
              <div class="text-[9px] font-mono text-zinc-500">${escapeHtml(val)}</div>
            </div>
          `).join('')}
        </div>

        <div class="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs font-mono">
          <span class="text-zinc-500">Espaciado Base: <strong class="text-zinc-900">${escapeHtml(spacing.base)}</strong></span>
          <span class="text-zinc-500">Contenedor Max: <strong class="text-zinc-900">${escapeHtml(spacing.container)}</strong></span>
        </div>
      </div>
    </div>

    <!-- 3. Componentes UI Registrados -->
    <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">Librería</span>
          <h3 class="text-base font-black text-zinc-950">Componentes Reutilizables</h3>
        </div>
        <span class="text-xs font-mono font-bold text-zinc-500">${components.length} registrados</span>
      </div>

      <div class="flex flex-wrap gap-2 pt-1">
        ${components.length > 0 ? components.map(c => {
          const name = typeof c === 'string' ? c : (c.name || 'Component');
          const desc = typeof c === 'object' && c.description ? c.description : '';
          return `
            <div class="px-3 py-1.5 rounded-xl bg-pink-50/70 border border-pink-200/80 text-pink-900 text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs" title="${escapeHtml(desc)}">
              <span>🧩</span>
              <span>${escapeHtml(name)}</span>
            </div>
          `;
        }).join('') : '<span class="text-xs text-zinc-400 italic">No hay componentes declarados aún.</span>'}
      </div>
    </div>
  `;
}

// Attach to window for global access
window.setUiuxSubTab = setUiuxSubTab;
window.setUiuxFilter = setUiuxFilter;
window.filterUiuxScreens = filterUiuxScreens;
window.rescanUiuxViews = rescanUiuxViews;
window.renderUIUX = renderUIUX;
