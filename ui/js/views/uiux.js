// SDD Studio — UI/UX Mockups & View Scanner Perspective

import { state } from '../state.js';
import { rescanUiux } from '../api.js';
import { showToast, escapeHtml } from '../utils.js';

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
  const screens = state.appState?.uiUx?.screens || [];
  const container = document.getElementById('uiux-screens-container');
  const badgeTab = document.getElementById('tab-badge-ui');
  const badgeCount = document.getElementById('uiux-badge-count');
  const statTotal = document.getElementById('uiux-stat-total');
  const statDynamic = document.getElementById('uiux-stat-dynamic');
  const statComponents = document.getElementById('uiux-stat-components');
  const statHealth = document.getElementById('uiux-stat-health');

  if (badgeTab) badgeTab.innerText = screens.length;
  if (badgeCount) badgeCount.innerText = `${screens.length} ${screens.length === 1 ? 'vista' : 'vistas'}`;
  if (statTotal) statTotal.innerText = screens.length;

  // Calculate stats
  const dynamicCount = screens.filter(s => s.isDynamic || (s.route && (s.route.includes('[') || s.route.includes(':')))).length;
  if (statDynamic) statDynamic.innerText = dynamicCount;

  let totalComps = 0;
  let totalHealth = 0;
  screens.forEach(s => {
    totalComps += (s.components?.length || 0);
    totalHealth += (s.healthPercent || 100);
  });
  if (statComponents) statComponents.innerText = totalComps;
  const avgHealth = screens.length > 0 ? Math.round(totalHealth / screens.length) : 100;
  if (statHealth) statHealth.innerText = `${avgHealth}%`;

  if (!container) return;

  // Filter screens
  let filtered = screens.filter(s => {
    const isDyn = s.isDynamic || (s.route && (s.route.includes('[') || s.route.includes(':')));
    if (state.uiuxActiveFilter === 'dynamic' && !isDyn) return false;
    if (state.uiuxActiveFilter === 'static' && isDyn) return false;

    if (state.uiuxSearchTerm) {
      const matchName = (s.name || '').toLowerCase().includes(state.uiuxSearchTerm);
      const matchRoute = (s.route || '').toLowerCase().includes(state.uiuxSearchTerm);
      const matchFile = (s.filePath || s.file || s.sourceFile || '').toLowerCase().includes(state.uiuxSearchTerm);
      const matchDesc = (s.description || s.wireframeDescription || '').toLowerCase().includes(state.uiuxSearchTerm);
      const matchComps = (s.components || []).some(c => c.toLowerCase().includes(state.uiuxSearchTerm));
      if (!matchName && !matchRoute && !matchFile && !matchDesc && !matchComps) return false;
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
            <p class="text-xs text-zinc-500 max-w-md mx-auto">SDD puede escanear tu proyecto (Next.js, Vite, Vue, Svelte, HTML) y detectar automáticamente todas las páginas y componentes.</p>
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
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(s => {
    const isDynamic = s.isDynamic || (s.route && (s.route.includes('[') || s.route.includes(':')));
    const fw = (s.framework || '').toLowerCase();

    let fwBadge = 'bg-zinc-100 text-zinc-700 border-zinc-200';
    let fwLabel = s.framework || 'Página';
    if (fw.includes('app router') || fw === 'next-app') {
      fwBadge = 'bg-purple-50 text-purple-800 border-purple-200';
      fwLabel = 'Next.js App Router';
    } else if (fw.includes('pages router') || fw === 'next-pages') {
      fwBadge = 'bg-blue-50 text-blue-800 border-blue-200';
      fwLabel = 'Next.js Pages';
    } else if (fw.includes('vite') || fw.includes('react')) {
      fwBadge = 'bg-cyan-50 text-cyan-800 border-cyan-200';
      fwLabel = 'Vite / React';
    } else if (fw.includes('html')) {
      fwBadge = 'bg-amber-50 text-amber-800 border-amber-200';
      fwLabel = 'HTML';
    } else if (s.type === 'client-component') {
      fwBadge = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      fwLabel = 'Client Container';
    }

    const comps = s.components || [];
    const route = s.route || '/';
    const file = s.filePath || s.file || s.sourceFile || 'app/page.tsx';

    // Layout wireframe visual variation
    let wireframeContent = '';
    if (route.includes('dashboard') || route.includes('admin') || route.includes('analytics')) {
      wireframeContent = `
        <div class="flex gap-1.5 h-16">
          <div class="w-1/4 bg-zinc-200/80 rounded flex flex-col gap-1 p-1">
            <div class="h-1.5 w-full bg-zinc-300 rounded"></div>
            <div class="h-1.5 w-3/4 bg-zinc-300 rounded"></div>
            <div class="h-1.5 w-1/2 bg-zinc-300 rounded"></div>
          </div>
          <div class="flex-1 flex flex-col gap-1.5">
            <div class="h-3 w-1/3 bg-zinc-200 rounded"></div>
            <div class="grid grid-cols-2 gap-1 flex-1">
              <div class="bg-zinc-200/60 rounded border border-zinc-300/40 p-1 flex flex-col justify-end"><div class="h-1.5 w-2/3 bg-purple-300 rounded"></div></div>
              <div class="bg-zinc-200/60 rounded border border-zinc-300/40 p-1 flex flex-col justify-end"><div class="h-1.5 w-1/2 bg-pink-300 rounded"></div></div>
            </div>
          </div>
        </div>
      `;
    } else if (route.includes('sign-in') || route.includes('sign-up') || route.includes('login') || route.includes('auth')) {
      wireframeContent = `
        <div class="flex items-center justify-center h-16">
          <div class="w-1/2 bg-white border border-zinc-300/80 rounded-md shadow-2xs p-1.5 space-y-1">
            <div class="h-1.5 w-2/3 bg-zinc-300 rounded mx-auto"></div>
            <div class="h-2 w-full bg-zinc-100 rounded border border-zinc-200"></div>
            <div class="h-2 w-full bg-zinc-100 rounded border border-zinc-200"></div>
            <div class="h-2.5 w-full bg-pink-500 rounded"></div>
          </div>
        </div>
      `;
    } else if (route.includes('checkout') || route.includes('order') || route.includes('cart') || route.includes('pago')) {
      wireframeContent = `
        <div class="grid grid-cols-3 gap-1.5 h-16">
          <div class="col-span-2 bg-white border border-zinc-200 rounded p-1 space-y-1">
            <div class="h-1.5 w-1/2 bg-zinc-300 rounded"></div>
            <div class="h-2 w-full bg-zinc-100 rounded border border-zinc-200"></div>
            <div class="h-2 w-full bg-zinc-100 rounded border border-zinc-200"></div>
            <div class="h-2.5 w-3/4 bg-emerald-500 rounded"></div>
          </div>
          <div class="bg-zinc-100/90 rounded border border-zinc-200 p-1 flex flex-col justify-between">
            <div class="space-y-0.5">
              <div class="h-1 w-full bg-zinc-300 rounded"></div>
              <div class="h-1 w-2/3 bg-zinc-300 rounded"></div>
            </div>
            <div class="h-1.5 w-full bg-purple-300 rounded"></div>
          </div>
        </div>
      `;
    } else {
      wireframeContent = `
        <div class="space-y-1.5 h-16 flex flex-col justify-between">
          <div class="h-4 bg-zinc-200/80 rounded flex items-center justify-between px-2">
            <div class="h-1.5 w-8 bg-zinc-400 rounded"></div>
            <div class="flex gap-1">
              <div class="h-1.5 w-3 bg-zinc-300 rounded"></div>
              <div class="h-1.5 w-3 bg-zinc-300 rounded"></div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-1 flex-1">
            <div class="bg-white border border-zinc-200 rounded p-1 flex flex-col justify-between">
              <div class="h-3 bg-zinc-100 rounded"></div>
              <div class="h-1 w-3/4 bg-zinc-300 rounded"></div>
            </div>
            <div class="bg-white border border-zinc-200 rounded p-1 flex flex-col justify-between">
              <div class="h-3 bg-zinc-100 rounded"></div>
              <div class="h-1 w-3/4 bg-zinc-300 rounded"></div>
            </div>
            <div class="bg-white border border-zinc-200 rounded p-1 flex flex-col justify-between">
              <div class="h-3 bg-zinc-100 rounded"></div>
              <div class="h-1 w-3/4 bg-zinc-300 rounded"></div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="bg-white border border-zinc-200 hover:border-pink-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group">
        <!-- Header Badges -->
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${fwBadge}">
              ${fwLabel}
            </span>
            <span class="text-[10px] font-mono font-bold bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">
              ${s.healthPercent || 100}% OK
            </span>
          </div>

          <!-- Route Pill & Name -->
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

          <!-- File Source -->
          <div class="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 truncate" title="${escapeHtml(file)}">
            <i data-lucide="file-code" class="w-3.5 h-3.5 text-zinc-400 shrink-0"></i>
            <span class="truncate">${escapeHtml(file)}</span>
          </div>
        </div>

        <!-- Mini Wireframe Browser Mockup -->
        <div class="rounded-xl border border-zinc-200/90 bg-zinc-50 overflow-hidden shadow-2xs">
          <div class="bg-zinc-100/90 px-2 py-1 border-b border-zinc-200/80 flex items-center gap-1.5">
            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            </div>
            <div class="flex-1 bg-white border border-zinc-200/80 rounded px-1.5 py-0.2 text-[9px] font-mono text-zinc-400 truncate text-center">
              localhost:3000${escapeHtml(route)}
            </div>
          </div>
          <div class="p-2.5 bg-zinc-50/50">
            ${wireframeContent}
          </div>
        </div>

        <!-- Subcomponents List -->
        <div class="space-y-1.5 pt-1 border-t border-zinc-100">
          <div class="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Componentes Vinculados</span>
            <span class="font-mono text-zinc-500">${comps.length}</span>
          </div>
          <div class="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
            ${comps.length > 0 ? comps.slice(0, 6).map(c => `
              <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-pink-50/80 border border-pink-200/70 text-pink-700 truncate max-w-[130px]" title="${escapeHtml(c)}">
                🧩 ${escapeHtml(c)}
              </span>
            `).join('') : '<span class="text-[10px] text-zinc-400 italic">Vista autónoma sin subcomponentes</span>'}
            ${comps.length > 6 ? `<span class="px-1 py-0.5 text-[9px] font-mono text-zinc-400">+${comps.length - 6} más</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}
