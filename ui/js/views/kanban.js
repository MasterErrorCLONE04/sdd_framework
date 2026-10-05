// SDD Studio — Kanban Sprint Board Perspective View

import { state } from '../state.js';
import { patchSdd } from '../api.js';
import { showToast } from '../utils.js';

export function renderKanban() {
  const stories = state.appState?.requirements?.userStories || [];
  const colTodo = document.getElementById('kanban-col-todo');
  const colInprog = document.getElementById('kanban-col-inprog');
  const colDone = document.getElementById('kanban-col-done');

  if (!colTodo || !colInprog || !colDone) return;

  colTodo.innerHTML = '';
  colInprog.innerHTML = '';
  colDone.innerHTML = '';

  let cTodo = 0, cInp = 0, cDone = 0;

  stories.forEach(s => {
    const card = document.createElement('div');
    card.className = 'bg-white border border-zinc-200 rounded-xl p-3 shadow-xs space-y-2';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">${s.id}</span>
          ${s.type === 'bug' ? '<span class="text-[9px] font-black bg-rose-100 text-rose-800 px-1 rounded">🐛 BUG</span>' : ''}
        </div>
        <span class="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-600 px-1 rounded">${s.points || 3} pts</span>
      </div>
      <div class="text-xs font-bold text-zinc-900">${s.title}</div>
      <div class="flex justify-end pt-1">
        <select onchange="updateStoryStatus('${s.id}', this.value)" class="text-[10px] font-mono bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-700 cursor-pointer">
          <option value="todo" ${s.status === 'todo' || s.status === 'backlog' ? 'selected' : ''}>Backlog</option>
          <option value="in_progress" ${s.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${s.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
    `;

    if (s.status === 'done') {
      colDone.appendChild(card);
      cDone++;
    } else if (s.status === 'in_progress') {
      colInprog.appendChild(card);
      cInp++;
    } else {
      colTodo.appendChild(card);
      cTodo++;
    }
  });

  const badgeTodo = document.getElementById('kanban-badge-todo');
  const badgeInprog = document.getElementById('kanban-badge-inprog');
  const badgeDone = document.getElementById('kanban-badge-done');

  if (badgeTodo) badgeTodo.innerText = cTodo;
  if (badgeInprog) badgeInprog.innerText = cInp;
  if (badgeDone) badgeDone.innerText = cDone;
}

export async function updateStoryStatus(storyId, status) {
  try {
    await patchSdd({ storyId, status });
    showToast(`Estado: ${status}`);
    if (window.loadData) await window.loadData();
  } catch {
    showToast('Error al actualizar estado', 'alert-circle');
  }
}
