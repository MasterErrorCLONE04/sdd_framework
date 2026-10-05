// SDD Studio — Drift Audit & Spec Convergence Perspective View

import { state } from '../state.js';
import { auditConvergence } from '../api.js';
import { showToast, escapeHtml } from '../utils.js';

export function renderDrift() {
  const d = state.appState?.drift || {};
  const conv = state.appState?.convergence || {};

  // 1. Git Drift Score
  const badge = document.getElementById('drift-score-badge');
  const tabBadge = document.getElementById('tab-badge-drift');

  if (badge) badge.innerText = `Score: ${d.driftScore || 100}% Clean`;
  if (tabBadge) tabBadge.innerText = `${conv.score || d.driftScore || 100}%`;

  const inContainer = document.getElementById('drift-in-scope');
  if (inContainer) {
    inContainer.innerHTML = (d.inScope || []).map(f => `<div>✓ ${escapeHtml(f)}</div>`).join('') || '<div>0 archivos en alcance modificados.</div>';
  }

  const outContainer = document.getElementById('drift-out-scope');
  if (outContainer) {
    outContainer.innerHTML = (d.outOfScope || []).map(f => `<div class="text-rose-600 font-bold">⚠️ VIOLACIÓN: ${escapeHtml(f)}</div>`).join('') || '<div class="text-emerald-700 font-bold">✓ 0 violaciones fuera de alcance.</div>';
  }

  // 2. Spec Convergence Live Verdict
  const cardEl = document.getElementById('convergence-verdict-card');
  const statusPill = document.getElementById('convergence-status-pill');
  const scoreText = document.getElementById('convergence-score-text');
  const messageText = document.getElementById('convergence-message-text');

  const statCriteria = document.getElementById('conv-stat-criteria');
  const statDrift = document.getElementById('conv-stat-drift');
  const statPending = document.getElementById('conv-stat-pending');

  const isConverged = conv.status === 'converged';
  const isDivergent = conv.status === 'divergent';

  if (cardEl) {
    cardEl.className = `p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
      isConverged
        ? 'bg-emerald-50/50 border-emerald-200'
        : isDivergent
        ? 'bg-rose-50/50 border-rose-200'
        : 'bg-amber-50/50 border-amber-200'
    }`;
  }

  if (statusPill) {
    statusPill.innerText = conv.label || (isConverged ? 'CONVERGIDO' : isDivergent ? 'DIVERGENCIA' : 'EN CONVERGENCIA');
    statusPill.className = `text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${
      isConverged
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : isDivergent
        ? 'bg-rose-100 text-rose-800 border-rose-200'
        : 'bg-amber-100 text-amber-800 border-amber-200'
    }`;
  }

  if (scoreText) scoreText.innerText = `Score: ${conv.score !== undefined ? conv.score : 100}%`;
  if (messageText) messageText.innerText = conv.message || 'Auditoría en sincronización constante con el repositorio.';

  if (statCriteria) statCriteria.innerText = `${conv.criteriaPercent !== undefined ? conv.criteriaPercent : 100}%`;
  if (statDrift) statDrift.innerText = `${conv.drift?.driftScore !== undefined ? conv.drift.driftScore : 100}%`;
  if (statPending) statPending.innerText = `${conv.pendingCount !== undefined ? conv.pendingCount : 0}`;

  // 3. Pending Criteria Details
  const pendingSection = document.getElementById('convergence-pending-section');
  const pendingList = document.getElementById('convergence-pending-list');

  const pendings = conv.pendingDetails || [];
  if (pendingSection && pendingList) {
    if (pendings.length > 0) {
      pendingSection.classList.remove('hidden');
      pendingList.innerHTML = pendings.map(item => `
        <div class="p-3 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-amber-950">${escapeHtml(item.storyId)} — ${escapeHtml(item.title)}</span>
            <span class="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
              ${item.pending.length} criterios pendientes
            </span>
          </div>
          <ul class="text-[11px] text-zinc-600 list-disc list-inside space-y-0.5 font-normal">
            ${item.pending.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    } else {
      pendingSection.classList.add('hidden');
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

export async function runConvergenceAudit() {
  try {
    showToast('Ejecutando auditoría de convergencia...');
    const res = await auditConvergence();
    if (res.success && res.convergence) {
      if (!state.appState) state.appState = {};
      state.appState.convergence = res.convergence;
      renderDrift();
      showToast(`Auditoría completa: ${res.convergence.label}`, res.convergence.status === 'converged' ? 'check-circle' : 'alert-triangle');
    }
  } catch (err) {
    showToast('Error al auditar convergencia: ' + err.message, 'alert-circle');
  }
}

