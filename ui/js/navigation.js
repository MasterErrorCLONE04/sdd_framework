// SDD Studio — Navigation & Screen Switching

import { state } from './state.js';
import { applyArchTransform, renderArchWires } from './views/architecture.js';

export function switchScreen(screen) {
  state.currentScreen = screen;
  const chatScreen = document.getElementById('screen-genesis-chat');
  const cockpitScreen = document.getElementById('screen-cockpit');

  // Maintain crisp Light Mode
  document.body.className = 'h-screen w-full bg-zinc-50 font-sans overflow-hidden select-none text-zinc-900';

  if (screen === 'chat') {
    chatScreen?.classList.remove('hidden');
    cockpitScreen?.classList.add('hidden');
    document.getElementById('genesis-chat-input')?.focus();
  } else {
    chatScreen?.classList.add('hidden');
    cockpitScreen?.classList.remove('hidden');
    const archView = document.getElementById('view-architecture');
    const workspace = document.getElementById('cockpit-main-workspace');
    if (archView && !archView.classList.contains('hidden')) {
      workspace?.classList.remove('p-6', 'md:p-8', 'overflow-y-auto');
      workspace?.classList.add('p-0', 'overflow-hidden', 'flex', 'flex-col');
      setTimeout(() => {
        applyArchTransform();
        renderArchWires();
      }, 50);
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function switchTab(tabId) {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('bg-purple-50', 'text-purple-950', 'border-purple-200/80', 'shadow-xs', 'border');
    btn.classList.add('text-zinc-700', 'hover:bg-zinc-100', 'hover:text-zinc-950');
  });

  const activeBtn = document.getElementById(`tab-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-zinc-700', 'hover:bg-zinc-100', 'hover:text-zinc-950');
    activeBtn.classList.add('bg-purple-50', 'text-purple-950', 'border', 'border-purple-200/80', 'shadow-xs');
  }

  document.querySelectorAll('.tab-content').forEach(view => view.classList.add('hidden'));
  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');

  const workspace = document.getElementById('cockpit-main-workspace');
  if (tabId === 'architecture') {
    workspace?.classList.remove('p-6', 'md:p-8', 'overflow-y-auto');
    workspace?.classList.add('p-0', 'overflow-hidden', 'flex', 'flex-col');
    setTimeout(() => {
      applyArchTransform();
      renderArchWires();
    }, 50);
  } else {
    workspace?.classList.remove('p-0', 'overflow-hidden', 'flex', 'flex-col');
    workspace?.classList.add('p-6', 'md:p-8', 'overflow-y-auto');
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function toggleChatSidebar() {
  const sidebar = document.getElementById('chat-sidebar');
  if (!sidebar) return;
  state.isSidebarOpen = !state.isSidebarOpen;
  if (state.isSidebarOpen) {
    sidebar.classList.remove('-ml-64');
  } else {
    sidebar.classList.add('-ml-64');
  }
}

export function toggleModelDropdown() {
  const menu = document.getElementById('model-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
}

export function selectEngine(engineKey, engineLabel, modelId) {
  state.selectedEngine = engineKey;
  if (modelId) state.selectedModel = modelId;
  const labelEl = document.getElementById('current-engine-label');
  const inputPill = document.getElementById('input-engine-pill');
  const tokenPill = document.getElementById('chat-token-pill');

  if (labelEl) labelEl.innerText = engineLabel;
  if (inputPill) inputPill.innerText = engineLabel.split(' ')[0] + ' ' + (engineLabel.split(' ')[1] || '');

  if (engineKey === 'openrouter') {
    const shortName = (modelId || state.selectedModel).split('/')[1]?.split(':')[0] || 'Ling 3.0';
    if (tokenPill) tokenPill.innerText = `Tokens: ${shortName} (:free)`;
  } else {
    if (tokenPill) tokenPill.innerText = 'Tokens: IDE Agent';
  }

  const menu = document.getElementById('model-dropdown-menu');
  if (menu) menu.classList.add('hidden');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
