// SDD Studio — Discovery Perspective & Hypotheses View

import { state } from '../state.js';
import { patchSdd } from '../api.js';
import { showToast, escapeHtml } from '../utils.js';

export function setDiscoveryFilter(phaseId) {
  state.activeDiscoveryFilter = phaseId;
  document.querySelectorAll('.disc-filter-btn').forEach(btn => {
    btn.classList.remove('bg-purple-600', 'text-white', 'shadow-xs');
    btn.classList.add('text-zinc-600', 'hover:bg-zinc-100');
  });

  const activeBtn = document.getElementById(`disc-filter-${phaseId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-zinc-600', 'hover:bg-zinc-100');
    activeBtn.classList.add('bg-purple-600', 'text-white', 'shadow-xs');
  }

  renderDiscovery();
}

export function insertDiscoveryPreset(qId, text) {
  const textarea = document.getElementById(`ans-${qId}`);
  if (!textarea) return;
  if (textarea.value.trim().length === 0) {
    textarea.value = text;
  } else if (!textarea.value.includes(text)) {
    textarea.value = textarea.value.trim() + ' | ' + text;
  }
  textarea.focus();
}

export function getDiscoveryPresets(category = '', qId = '') {
  const cat = (category || '').toLowerCase();
  const id = (qId || '').toLowerCase();
  if (cat.includes('frontend') || id.includes('frontend')) {
    return ['Next.js 15 (React 19)', 'Vite + React', 'Tailwind CSS', 'PWA Responsive'];
  }
  if (cat.includes('backend') || id.includes('backend')) {
    return ['Node.js Route Handlers', 'Python FastAPI', 'Express / Fastify', 'Go REST API'];
  }
  if (cat.includes('base de datos') || id.includes('database')) {
    return ['PostgreSQL 16 + Prisma', 'Supabase Managed Postgres', 'SQLite + Drizzle', 'Neon Serverless'];
  }
  if (cat.includes('autenticación') || id.includes('auth')) {
    return ['JWT + Cookies HttpOnly', 'Auth.js (NextAuth v5)', 'Clerk Authentication', 'Supabase Auth RBAC'];
  }
  if (cat.includes('infraestructura') || id.includes('hosting')) {
    return ['Vercel Serverless', 'Railway Container', 'Docker + VPS', 'AWS ECS'];
  }
  if (cat.includes('non-goals') || id.includes('nongoal')) {
    return ['Sin apps nativas en V1', 'Sin multi-región compleja', 'Sin microservicios prematuros'];
  }
  if (cat.includes('integraciones') || id.includes('integrat')) {
    return ['Stripe Checkout', 'WhatsApp Evolution API', 'Resend Email', 'Webhooks HMAC'];
  }
  return [];
}

export function renderDiscovery() {
  const container = document.getElementById('discovery-sessions-container');
  if (!container) return;
  container.innerHTML = '';
  const sessions = state.appState?.discovery?.interviews?.interviewSessions || [];

  // Calcular métricas globales
  let totalQuestions = 0;
  let answeredQuestions = 0;

  sessions.forEach(s => {
    (s.questions || []).forEach(q => {
      totalQuestions++;
      if (q.status === 'answered' || q.isNotApplicable) answeredQuestions++;
    });
  });

  const percent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const statTotal = document.getElementById('discovery-stat-total');
  const statAnswered = document.getElementById('discovery-stat-answered');
  const statPercent = document.getElementById('discovery-stat-percent');
  const badgeTab = document.getElementById('tab-badge-discovery');

  if (statTotal) statTotal.innerText = totalQuestions;
  if (statAnswered) statAnswered.innerText = answeredQuestions;
  if (statPercent) statPercent.innerText = `${percent}%`;
  if (badgeTab) badgeTab.innerText = `${totalQuestions} Qs`;

  // Spec Kit Idea Assessment Verdict calculation
  const verdictPill = document.getElementById('assessment-verdict-pill');
  const rationaleText = document.getElementById('assessment-rationale-text');
  const metricsBadge = document.getElementById('assessment-metrics-badge');
  const badgeIcon = document.getElementById('assessment-badge-icon');

  if (verdictPill) {
    if (percent >= 70) {
      verdictPill.innerText = 'VEREDICTO: GO ✓';
      verdictPill.className = 'text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
      if (badgeIcon) badgeIcon.className = 'w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shrink-0';
      if (rationaleText) rationaleText.innerText = 'Problema, requerimientos y límites con suficiente claridad para avanzar a especificación e implementación.';
      if (metricsBadge) metricsBadge.innerText = `Claridad: ${percent}% • Viabilidad Alta`;
    } else if (percent >= 30) {
      verdictPill.innerText = 'VEREDICTO: CLARIFY ⚠️';
      verdictPill.className = 'text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200';
      if (badgeIcon) badgeIcon.className = 'w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0';
      if (rationaleText) rationaleText.innerText = 'Faltan definiciones clave de alcance, base de datos o stack. Responde más preguntas antes de programar.';
      if (metricsBadge) metricsBadge.innerText = `Claridad: ${percent}% • Requiere Aclaración`;
    } else {
      verdictPill.innerText = 'VEREDICTO: STOP ⛔';
      verdictPill.className = 'text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200';
      if (badgeIcon) badgeIcon.className = 'w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black shrink-0';
      if (rationaleText) rationaleText.innerText = 'Idea en etapa embrionaria. Define el dolor raíz y los Non-Goals V1 para evitar dispersión.';
      if (metricsBadge) metricsBadge.innerText = `Claridad: ${percent}% • Riesgo de Dispersión Alto`;
    }
  }

  const statusFilter = document.getElementById('discovery-status-select')?.value || 'all';

  // Filtrar sesiones según la pestaña activa
  let filteredSessions = sessions;
  if (state.activeDiscoveryFilter !== 'all') {
    filteredSessions = sessions.filter(s => s.id === state.activeDiscoveryFilter || (s.category && s.category.includes(state.activeDiscoveryFilter)));
  }

  if (filteredSessions.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
        <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <i data-lucide="compass" class="w-6 h-6"></i>
        </div>
        <h3 class="text-sm font-bold text-zinc-900">No hay preguntas en esta fase</h3>
        <p class="text-xs text-zinc-500 max-w-sm mx-auto">Selecciona "Todas las Fases" para ver el cuestionario completo de 7 fases.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  filteredSessions.forEach(sess => {
    let qList = sess.questions || [];
    if (statusFilter === 'pending') {
      qList = qList.filter(q => q.status !== 'answered' && !q.isNotApplicable);
    } else if (statusFilter === 'answered') {
      qList = qList.filter(q => q.status === 'answered' || q.isNotApplicable);
    }

    if (qList.length === 0 && statusFilter !== 'all') return;

    const sessTotal = (sess.questions || []).length;
    const sessDone = (sess.questions || []).filter(q => q.status === 'answered' || q.isNotApplicable).length;

    const div = document.createElement('div');
    div.className = 'border border-zinc-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-4';
    div.innerHTML = `
      <div class="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-zinc-100 gap-2">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 uppercase">
              ${sess.badge || 'Fase'}
            </span>
            <span class="text-sm font-black text-zinc-950">${escapeHtml(sess.title || sess.category || 'Sesión de Diagnóstico')}</span>
          </div>
          ${sess.description ? `<p class="text-xs text-zinc-500 mt-1 font-normal">${escapeHtml(sess.description)}</p>` : ''}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200">
            ${sessDone}/${sessTotal} Respondidas
          </span>
        </div>
      </div>

      <div class="space-y-4">
        ${qList.map(q => {
          const presets = getDiscoveryPresets(q.category, q.id);
          const isAnswered = q.status === 'answered';
          return `
            <div class="bg-zinc-50/70 border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-purple-200 transition-colors">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-zinc-200/80 text-zinc-800">
                    ${q.id}
                  </span>
                  ${q.category ? `
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100/80 text-purple-900 border border-purple-200">
                      ${escapeHtml(q.category)}
                    </span>
                  ` : ''}
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  ${q.isNotApplicable ? `
                    <span class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      No Aplica
                    </span>
                  ` : `
                    <span class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      isAnswered ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }">
                      ${isAnswered ? 'Respondida' : 'Pendiente'}
                    </span>
                  `}
                  <button
                    onclick="toggleNA('${q.id}', ${!q.isNotApplicable})"
                    class="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 border border-zinc-200 bg-white px-2 py-0.5 rounded-lg shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
                    title="${q.isNotApplicable ? 'Habilitar pregunta' : 'Marcar como No Aplica'}"
                  >
                    ${q.isNotApplicable ? 'Habilitar' : 'N/A'}
                  </button>
                </div>
              </div>

              <div class="text-xs font-bold text-zinc-950 leading-snug">
                ${escapeHtml(q.question || q.text || 'Pregunta de especificación')}
              </div>

              ${q.insights ? `
                <div class="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2">
                  <i data-lucide="lightbulb" class="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0"></i>
                  <span><b>Consejo de Arquitectura:</b> ${escapeHtml(q.insights)}</span>
                </div>
              ` : ''}

              ${presets.length > 0 && !q.isNotApplicable ? `
                <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span class="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">Sugerencias rápidas:</span>
                  ${presets.map(p => `
                    <button
                      type="button"
                      onclick="insertDiscoveryPreset('${q.id}', '${escapeHtml(p)}')"
                      class="text-[10px] font-mono font-medium px-2 py-0.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:border-purple-400 hover:text-purple-900 transition-colors cursor-pointer shadow-2xs"
                    >
                      + ${escapeHtml(p)}
                    </button>
                  `).join('')}
                </div>
              ` : ''}

              ${q.isNotApplicable ? `
                <p class="text-[11px] text-zinc-500 italic bg-white p-2.5 rounded-xl border border-zinc-200">
                  <b>Justificación de No Aplicabilidad:</b> ${escapeHtml(q.notApplicableReason || 'Sin justificación declarada')}
                </p>
              ` : `
                <div class="space-y-2">
                  <textarea
                    id="ans-${q.id}"
                    rows="3"
                    class="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 leading-relaxed placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-2xs font-normal"
                    placeholder="Escribe o ajusta la especificación técnica para esta pregunta..."
                  >${escapeHtml(q.answer || '')}</textarea>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-[10px] text-zinc-400">Se sincroniza atómicamente con <code>.sdd/discovery/interviews.json</code></span>
                    <button
                      onclick="saveAnswer('${q.id}', this)"
                      class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
                    >
                      <i data-lucide="save" class="w-3.5 h-3.5 text-emerald-400"></i>
                      <span>Guardar Respuesta</span>
                    </button>
                  </div>
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.appendChild(div);
  });

  if (window.lucide) window.lucide.createIcons();
}

export async function saveAnswer(qId, btn) {
  const textarea = document.getElementById(`ans-${qId}`);
  const val = textarea?.value || '';

  const originalText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span class="text-[11px]">Guardando...</span>';

  try {
    await patchSdd({ questionId: qId, answer: val, status: 'answered' });
    showToast('✓ Pregunta guardada en .sdd/discovery/interviews.json', 'check-circle-2');
    if (window.loadData) await window.loadData();
  } catch {
    showToast('Error al guardar respuesta', 'alert-circle');
  } finally {
    if (btn) btn.innerHTML = originalText;
    if (window.lucide) window.lucide.createIcons();
  }
}

export async function toggleNA(qId, isNA) {
  const reason = isNA ? prompt('Escribe el motivo por el cual no aplica a este proyecto:') : '';
  if (isNA && !reason) return;
  try {
    await patchSdd({ questionId: qId, isNotApplicable: isNA, notApplicableReason: reason, status: isNA ? 'answered' : 'pending' });
    showToast(isNA ? 'Marcado como No Aplica' : 'Pregunta habilitada');
    if (window.loadData) await window.loadData();
  } catch {
    showToast('Error', 'alert-circle');
  }
}
