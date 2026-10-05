// SDD Studio — Application Master Bootstrap & Controller

import { state, ensureDefaultSession } from './state.js';
import { fetchSddData, fetchOpenRouterConfig, syncMultiIdeRules } from './api.js';
import { escapeHtml, formatMarkdown, showToast, copyTextToClipboard } from './utils.js';
import { switchScreen, switchTab, toggleChatSidebar, toggleModelDropdown, selectEngine } from './navigation.js';
import {
  openDispatchModal,
  closeDispatchModal,
  copyPromptText,
  openOpenRouterModal,
  closeOpenRouterModal,
  toggleApiKeyVisibility,
  saveOpenRouterConfiguration,
  openGenesisModal,
  closeGenesisModal,
  openReverseEngineerModal,
  closeReverseEngineerModal,
  startReverseEngineeringWithAi,
  finishAndRefreshWorkbench
} from './modals.js';
import {
  renderSidebarHistory,
  selectChatSession,
  deleteChatSession,
  startNewChatProject,
  setPromptIdea,
  handleChatKeyDown,
  sendGenesisChatMessage,
  retryGenesisChat,
  confirmAndOpenCockpit,
  copyGenesisOrderToClipboard,
  triggerLiveCockpitMorph,
  updateGenesisStepper,
  switchPreviewTab,
  sendQuickAction
} from './chat.js';
import { renderHeader, renderCore, toggleGate, toggleConstitutionPrinciple } from './views/core.js';
import {
  setDiscoveryFilter,
  insertDiscoveryPreset,
  getDiscoveryPresets,
  renderDiscovery,
  saveAnswer,
  toggleNA
} from './views/discovery.js';
import { renderStories, toggleCriterion, confirmOrigin } from './views/stories.js';
import {
  switchUmlType,
  selectSequence,
  selectStateMachine,
  openSequenceForFlow,
  renderSequences,
  toggleMermaidRaw,
  copyMermaid
} from './views/sequences.js';
import { renderFlows, toggleFlowTask } from './views/flows.js';
import {
  setArchViewMode,
  applyArchTransform,
  zoomArchCanvas,
  resetArchCanvas,
  autoLayoutArch,
  renderArchitecture,
  selectArchService,
  closeArchInspector,
  renderArchWires,
  setDrawerTab,
  toggleTaskCreationForm,
  submitNodeTask,
  dispatchStoryToAgent,
  toggleStoryGherkin,
  completeStory
} from './views/architecture.js';
import { renderDatabase } from './views/database.js';
import { renderRolesAndRisks } from './views/roles.js';
import { renderQA } from './views/qa.js';
import { renderDrift, runConvergenceAudit } from './views/drift.js';
import { setUiuxFilter, filterUiuxScreens, rescanUiuxViews, renderUIUX } from './views/uiux.js';
import { renderKanban, updateStoryStatus } from './views/kanban.js';
import { loadComponents } from './componentLoader.js';

export async function handleSyncMultiIde() {
  try {
    showToast('Sincronizando reglas para Cursor, Claude, Windsurf y Copilot...');
    const res = await syncMultiIdeRules();
    if (res.success) {
      showToast(`Reglas sincronizadas (${(res.filesWritten || []).join(', ')})`);
    }
  } catch (err) {
    showToast('Error al sincronizar reglas: ' + err.message, 'alert-circle');
  }
}

// Expose all public methods to window for inline HTML event handlers
window.switchScreen = switchScreen;
window.switchTab = switchTab;
window.toggleChatSidebar = toggleChatSidebar;
window.toggleModelDropdown = toggleModelDropdown;
window.selectEngine = selectEngine;
window.openDispatchModal = openDispatchModal;
window.closeDispatchModal = closeDispatchModal;
window.copyPromptText = copyPromptText;
window.openOpenRouterModal = openOpenRouterModal;
window.closeOpenRouterModal = closeOpenRouterModal;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.saveOpenRouterConfiguration = saveOpenRouterConfiguration;
window.openGenesisModal = openGenesisModal;
window.closeGenesisModal = closeGenesisModal;
window.openReverseEngineerModal = openReverseEngineerModal;
window.closeReverseEngineerModal = closeReverseEngineerModal;
window.startReverseEngineeringWithAi = startReverseEngineeringWithAi;
window.finishAndRefreshWorkbench = finishAndRefreshWorkbench;
window.renderSidebarHistory = renderSidebarHistory;
window.selectChatSession = selectChatSession;
window.deleteChatSession = deleteChatSession;
window.startNewChatProject = startNewChatProject;
window.setPromptIdea = setPromptIdea;
window.handleChatKeyDown = handleChatKeyDown;
window.sendGenesisChatMessage = sendGenesisChatMessage;
window.retryGenesisChat = retryGenesisChat;
window.confirmAndOpenCockpit = confirmAndOpenCockpit;
window.copyGenesisOrderToClipboard = copyGenesisOrderToClipboard;
window.triggerLiveCockpitMorph = triggerLiveCockpitMorph;
window.updateGenesisStepper = updateGenesisStepper;
window.switchPreviewTab = switchPreviewTab;
window.sendQuickAction = sendQuickAction;
window.toggleGate = toggleGate;
window.setDiscoveryFilter = setDiscoveryFilter;
window.insertDiscoveryPreset = insertDiscoveryPreset;
window.getDiscoveryPresets = getDiscoveryPresets;
window.renderDiscovery = renderDiscovery;
window.saveAnswer = saveAnswer;
window.toggleNA = toggleNA;
window.renderStories = renderStories;
window.toggleCriterion = toggleCriterion;
window.confirmOrigin = confirmOrigin;
window.switchUmlType = switchUmlType;
window.selectSequence = selectSequence;
window.selectStateMachine = selectStateMachine;
window.openSequenceForFlow = openSequenceForFlow;
window.renderSequences = renderSequences;
window.toggleMermaidRaw = toggleMermaidRaw;
window.copyMermaid = copyMermaid;
window.renderFlows = renderFlows;
window.toggleFlowTask = toggleFlowTask;
window.setArchViewMode = setArchViewMode;
window.applyArchTransform = applyArchTransform;
window.zoomArchCanvas = zoomArchCanvas;
window.resetArchCanvas = resetArchCanvas;
window.autoLayoutArch = autoLayoutArch;
window.renderArchitecture = renderArchitecture;
window.selectArchService = selectArchService;
window.closeArchInspector = closeArchInspector;
window.setDrawerTab = setDrawerTab;
window.toggleTaskCreationForm = toggleTaskCreationForm;
window.submitNodeTask = submitNodeTask;
window.dispatchStoryToAgent = dispatchStoryToAgent;
window.toggleStoryGherkin = toggleStoryGherkin;
window.completeStory = completeStory;
window.renderDatabase = renderDatabase;
window.renderRolesAndRisks = renderRolesAndRisks;
window.renderQA = renderQA;
window.renderDrift = renderDrift;
window.setUiuxFilter = setUiuxFilter;
window.filterUiuxScreens = filterUiuxScreens;
window.rescanUiuxViews = rescanUiuxViews;
window.renderUIUX = renderUIUX;
window.renderKanban = renderKanban;
window.updateStoryStatus = updateStoryStatus;
window.toggleConstitutionPrinciple = toggleConstitutionPrinciple;
window.runConvergenceAudit = runConvergenceAudit;
window.handleSyncMultiIde = handleSyncMultiIde;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.loadData = loadData;
window.checkOpenRouterConfig = checkOpenRouterConfig;

// Master Data Loader
export async function loadData() {
  try {
    const data = await fetchSddData();
    state.appState = data;

    renderHeader();
    renderCore();
    renderDiscovery();
    renderStories();
    renderSequences();
    renderFlows();
    renderArchitecture();
    renderDatabase();
    renderRolesAndRisks();
    renderQA();
    renderDrift();
    renderUIUX();
    renderKanban();

    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    console.error('Error fetching SDD data:', e);
  }
}

// Master OpenRouter Config Checker
export async function checkOpenRouterConfig() {
  try {
    const data = await fetchOpenRouterConfig();
    if (data.success) {
      state.openRouterConfig = data;
      const statusBtn = document.getElementById('btn-openrouter-status');
      const badgeText = document.getElementById('openrouter-badge-text');
      const modelSelect = document.getElementById('openrouter-model-select');

      if (data.configured) {
        if (badgeText) badgeText.innerText = 'OpenRouter Conectado';
        if (statusBtn) {
          statusBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
        }
      } else {
        if (badgeText) badgeText.innerText = 'Conectar OpenRouter';
        if (statusBtn) {
          statusBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
        }
      }

      if (data.defaultModel && modelSelect) {
        modelSelect.value = data.defaultModel;
        state.selectedModel = data.defaultModel;
      }
    }
  } catch (err) {
    console.warn('No se pudo verificar OpenRouter:', err);
  }
}

// Application Initialization
export async function initBoot() {
  // 1. Asynchronously load and mount all HTML components
  await loadComponents();

  // 2. Initialize Mermaid.js
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif'
    });
  }

  // 3. Attach global listeners
  document.addEventListener('click', (e) => {
    const btn = document.getElementById('model-selector-btn');
    const menu = document.getElementById('model-dropdown-menu');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });

  const sendBtn = document.getElementById('genesis-chat-send-btn');
  const chatInput = document.getElementById('genesis-chat-input');
  if (sendBtn) {
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendGenesisChatMessage();
    });
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', handleChatKeyDown);
  }

  // 4. Fetch initial project data & engine configuration
  await loadData();
  await checkOpenRouterConfig();

  // 5. Initial boot routing
  if (state.isInitialBoot) {
    state.isInitialBoot = false;
    const storiesCount = state.appState?.requirements?.userStories?.length || 0;
    const isNew = Boolean(state.appState?.isNewProject) || storiesCount === 0;

    // Actualizar workspace en sidebar
    if (state.appState?.workspaceName) {
      const wsEl = document.getElementById('chat-sidebar-workspace');
      if (wsEl) wsEl.innerText = `${state.appState.workspaceName}`;
    }

    // Asegurar que exista la sesión en el historial
    const sessions = ensureDefaultSession(state.appState?.project, state.appState?.genesisTask);
    renderSidebarHistory();

    // Habilitar siempre el acceso a la Cabina / Canvas de Arquitectura
    document.getElementById('btn-toggle-cockpit')?.classList.remove('hidden');

    if (isNew && sessions.length === 0) {
      switchScreen('chat');
    } else {
      if (sessions.length > 0) {
        selectChatSession(sessions[0].id);
      } else {
        switchScreen('cockpit');
      }
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBoot);
} else {
  initBoot();
}
