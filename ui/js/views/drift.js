// SDD Studio — Drift Audit Perspective View

import { state } from '../state.js';

export function renderDrift() {
  const d = state.appState?.drift || {};
  const badge = document.getElementById('drift-score-badge');
  const tabBadge = document.getElementById('tab-badge-drift');

  if (badge) badge.innerText = `Score: ${d.driftScore || 100}% Clean`;
  if (tabBadge) tabBadge.innerText = `${d.driftScore || 100}%`;

  const inContainer = document.getElementById('drift-in-scope');
  if (inContainer) {
    inContainer.innerHTML = (d.inScope || []).map(f => `<div>✓ ${f}</div>`).join('') || '<div>0 archivos en alcance modificados.</div>';
  }

  const outContainer = document.getElementById('drift-out-scope');
  if (outContainer) {
    outContainer.innerHTML = (d.outOfScope || []).map(f => `<div class="text-rose-600 font-bold">⚠️ VIOLACIÓN: ${f}</div>`).join('') || '<div class="text-emerald-700 font-bold">✓ 0 violaciones fuera de alcance.</div>';
  }
}
