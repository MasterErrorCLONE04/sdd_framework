// SDD Studio — Core Perspective & Quality Gates View

import { state } from '../state.js';
import { patchSdd, fetchSddData } from '../api.js';
import { showToast } from '../utils.js';

export function renderHeader() {
  if (!state.appState?.project) return;
  const p = state.appState.project;
  const nameEl = document.getElementById('header-proj-name');
  const depthEl = document.getElementById('header-depth-badge');
  const purposeEl = document.getElementById('header-purpose-badge');

  if (nameEl) nameEl.innerText = p.name || 'Proyecto SDD';
  if (depthEl) depthEl.innerText = `SDD ${(p.depth || 'serio').toUpperCase()}`;
  if (purposeEl) purposeEl.innerText = (p.purpose || 'comercial').toUpperCase();

  const m = state.appState.manifest?.metrics;
  if (m) {
    const healthPctEl = document.getElementById('header-health-pct');
    const healthBarEl = document.getElementById('header-health-bar');
    const statArquiEl = document.getElementById('stat-arqui');
    const statFlowsEl = document.getElementById('stat-flows');
    const statUiEl = document.getElementById('stat-ui');

    if (healthPctEl) healthPctEl.innerText = `${m.globalHealth || 100}%`;
    if (healthBarEl) healthBarEl.style.width = `${m.globalHealth || 100}%`;
    if (statArquiEl) statArquiEl.innerText = `${m.architectureHealth || 100}%`;
    if (statFlowsEl) statFlowsEl.innerText = `${m.flowsHealth || 100}%`;
    if (statUiEl) statUiEl.innerText = `${m.uiHealth || 80}%`;
  }
}

export function renderCore() {
  const p = state.appState?.project;
  const c = state.appState?.core;
  if (!p) return;

  const projTitle = document.getElementById('core-project-title');
  const projDesc = document.getElementById('core-project-desc');
  const purposePill = document.getElementById('core-purpose-pill');
  const depthPill = document.getElementById('core-depth-pill');

  if (projTitle) projTitle.innerText = `${p.name}: ${p.tagline || 'Especificación'}`;
  if (projDesc) projDesc.innerText = p.profile?.purposeDescription || p.tagline || '';
  if (purposePill) purposePill.innerText = `PROPÓSITO: ${(p.purpose || 'comercial').toUpperCase()}`;
  if (depthPill) depthPill.innerText = `PROFUNDIDAD: ${(p.depth || 'serio').toUpperCase()}`;

  // Gates list
  const gatesGrid = document.getElementById('core-gates-grid');
  if (gatesGrid) {
    gatesGrid.innerHTML = '';
    const gates = [
      { id: 'problemDefined', name: '1. Problema Validado', file: '.sdd/core/problem.json' },
      { id: 'userTargetDefined', name: '2. Usuario Objetivo', file: '.sdd/core/target-user.json' },
      { id: 'boundariesEstablished', name: '3. Non-Goals V1', file: '.sdd/core/scope-boundaries.json' },
      { id: 'successMetricsDefined', name: '4. Criterios de Éxito', file: '.sdd/core/success-criteria.json' },
      { id: 'storiesReady', name: '5. Historias Gherkin', file: '.sdd/requirements/stories/' }
    ];

    const qg = p.qualityGates || {};
    let passedCount = 0;

    gates.forEach(g => {
      let isPassed = false;
      if (Array.isArray(qg)) {
        isPassed = qg.find(x => x.id === g.id)?.status === 'passed';
      } else {
        isPassed = Boolean(qg[g.id]);
      }
      if (isPassed) passedCount++;

      const card = document.createElement('div');
      card.className = `p-3 rounded-xl border flex flex-col justify-between space-y-2 cursor-pointer transition-all ${
        isPassed ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
      }`;
      card.onclick = () => toggleGate(g.id, !isPassed);
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold ${isPassed ? 'text-emerald-950' : 'text-rose-950'} leading-tight">${g.name}</span>
          <i data-lucide="${isPassed ? 'check-circle-2' : 'alert-circle'}" class="w-4 h-4 ${isPassed ? 'text-emerald-600' : 'text-rose-600'} shrink-0"></i>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-mono text-zinc-500">${g.file}</span>
          <span class="text-[9px] font-mono font-bold px-1 rounded ${isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
            ${isPassed ? 'PASSED' : 'PENDING'}
          </span>
        </div>
      `;
      gatesGrid.appendChild(card);
    });

    const gatesStatEl = document.getElementById('core-gates-stat');
    const headerGatesText = document.getElementById('header-gates-text');
    const tabBadgeCore = document.getElementById('tab-badge-core');

    if (gatesStatEl) gatesStatEl.innerText = `${passedCount} de 5 Aprobadas`;
    if (headerGatesText) headerGatesText.innerText = `${passedCount}/5 Compuertas ✓`;
    if (tabBadgeCore) tabBadgeCore.innerText = `${passedCount}/5`;
  }

  // Problem
  const problemSummaryEl = document.getElementById('core-problem-summary');
  if (problemSummaryEl) {
    problemSummaryEl.innerText = c?.problem?.statement || c?.problem?.summary || 'No definido aún.';
  }
  const pains = c?.problem?.painPoints || c?.problem?.targetPainPoints || [];
  const painContainer = document.getElementById('core-pain-points-list');
  if (painContainer) {
    painContainer.innerHTML = pains.map((pp, idx) => `
      <div class="p-3 rounded-xl border border-rose-100 bg-rose-50/30 space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black text-rose-950">${pp.pain || pp.title || pp}</span>
          <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase bg-rose-100 text-rose-800">${pp.severity || 'ALTA'}</span>
        </div>
        ${pp.evidence ? `<p class="text-[11px] text-zinc-600"><b>Evidencia:</b> ${pp.evidence}</p>` : ''}
        ${pp.solution ? `<p class="text-[11px] text-emerald-800 font-medium"><b>Solución:</b> ${pp.solution}</p>` : ''}
      </div>
    `).join('') || '<div class="text-xs text-zinc-400">Sin dolores registrados.</div>';
  }

  // Non-goals
  const ngs = c?.scopeBoundaries?.explicitNonGoals || [];
  const ngContainer = document.getElementById('core-non-goals-list');
  if (ngContainer) {
    ngContainer.innerHTML = ngs.map(ng => `
      <div class="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black text-zinc-900">${ng.feature || ng}</span>
          <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase bg-amber-200 text-amber-900">Congelado V2</span>
        </div>
        ${ng.rationale ? `<p class="text-[11px] text-zinc-600 leading-relaxed">${ng.rationale}</p>` : ''}
      </div>
    `).join('') || '<div class="text-xs text-zinc-400">Sin non-goals registrados.</div>';
  }

  // 3. Constitution Principles (Spec Kit Invariants)
  const constObj = c?.constitution || {};
  const principles = constObj.principles || [];
  const constContainer = document.getElementById('core-constitution-list');
  const constActiveBadge = document.getElementById('constitution-active-count');

  const activeCount = principles.filter(p => p.status === 'active').length;
  if (constActiveBadge) constActiveBadge.innerText = `${activeCount} de ${principles.length} Invariantes Activos`;

  if (constContainer) {
    constContainer.innerHTML = principles.map(p => {
      const isActive = p.status === 'active';
      return `
        <div class="p-3.5 rounded-xl border transition-all ${isActive ? 'bg-purple-50/30 border-purple-200' : 'bg-zinc-50 border-zinc-200 opacity-60'} space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${isActive ? 'bg-purple-100 text-purple-800' : 'bg-zinc-200 text-zinc-700'}">
                ${p.category || 'General'}
              </span>
              <span class="text-xs font-black ${isActive ? 'text-zinc-900' : 'text-zinc-500'}">
                ${p.name || p.id}
              </span>
            </div>
            <button
              onclick="toggleConstitutionPrinciple('${p.id}')"
              class="text-[10px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
              }"
              title="Click para activar/desactivar invariante"
            >
              ${isActive ? 'ACTIVO ✓' : 'DESACTIVADO'}
            </button>
          </div>
          <p class="text-[11px] ${isActive ? 'text-zinc-700' : 'text-zinc-500'} leading-relaxed font-normal">
            ${p.rule || ''}
          </p>
        </div>
      `;
    }).join('') || '<div class="text-xs text-zinc-400">Sin invariantes constitucionales registrados.</div>';
  }
}

export async function toggleGate(gateId, nextPassed) {
  try {
    await patchSdd({
      gateId,
      gateStatus: nextPassed ? 'passed' : 'pending',
      done: nextPassed,
      verifiedBy: 'Human Architect'
    });
    showToast(`Compuerta ${nextPassed ? 'aprobada' : 'bloqueada'}`);
    if (window.loadData) await window.loadData();
  } catch (err) {
    showToast('Error al actualizar compuerta', 'alert-circle');
  }
}

export async function toggleConstitutionPrinciple(principleId) {
  try {
    await patchSdd({ togglePrincipleId: principleId });
    showToast('Invariante de constitución actualizado');
    if (window.loadData) await window.loadData();
  } catch (err) {
    showToast('Error al mutar invariante', 'alert-circle');
  }
}

