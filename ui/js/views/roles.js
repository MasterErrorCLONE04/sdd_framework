// SDD Studio — Roles RBAC & Risks Perspective View

import { state } from '../state.js';

export function renderRolesAndRisks() {
  const matrix = state.appState?.requirements?.rolesMatrix;
  const actors = state.appState?.product?.actors || state.appState?.core?.targetUsers?.personas || [];
  const rolesContainer = document.getElementById('roles-table-container');

  const rolesList = (matrix && matrix.roles && matrix.roles.length > 0)
    ? matrix.roles
    : actors.map(a => ({
        name: a.name || a.role || 'Usuario',
        level: a.role || 'user',
        permissions: Array.isArray(a.responsibilities) ? a.responsibilities : [a.description || 'Interacción base con la plataforma']
      }));

  const tabBadgeRoles = document.getElementById('tab-badge-roles');
  if (tabBadgeRoles) {
    tabBadgeRoles.innerText = String(rolesList.length);
  }

  if (rolesContainer) {
    if (rolesList.length > 0) {
      rolesContainer.innerHTML = `
        <table class="w-full text-xs text-left">
          <thead class="text-[10px] uppercase text-zinc-400 border-b border-zinc-200">
            <tr><th class="py-2">Rol / Actor</th><th>Nivel</th><th>Responsabilidades / Permisos</th></tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            ${rolesList.map(r => `
              <tr>
                <td class="py-2 font-bold text-zinc-900">${r.name}</td>
                <td><span class="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">${r.level}</span></td>
                <td class="text-zinc-500">${(r.permissions || []).slice(0, 3).join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      rolesContainer.innerHTML = '<div class="p-8 text-center text-xs text-zinc-400 font-medium">No hay roles ni actores definidos aún en este proyecto.</div>';
    }
  }

  const risks = state.appState?.core?.risks?.riskRegistry || [];
  const risksContainer = document.getElementById('risks-cards-container');
  if (risksContainer) {
    if (risks.length > 0) {
      risksContainer.innerHTML = risks.map(rk => `
        <div class="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-zinc-900">${rk.name || rk.title}</span>
            <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${rk.severity === 'alta' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">${rk.severity || 'MEDIA'}</span>
          </div>
          <p class="text-[11px] text-zinc-600"><b>Mitigación:</b> ${rk.mitigation}</p>
        </div>
      `).join('');
    } else {
      risksContainer.innerHTML = '<div class="p-8 text-center text-xs text-zinc-400 font-medium">No hay riesgos registrados aún en este proyecto.</div>';
    }
  }
}
