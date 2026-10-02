// SDD Studio — Central State Management

export const state = {
  appState: null,
  currentScreen: 'chat',
  chatMessages: [],
  currentChatPreview: null,
  isInitialBoot: true,
  selectedEngine: 'openrouter',
  selectedModel: 'inclusionai/ling-3.0-flash-sante:free',
  openRouterConfig: null,
  isSidebarOpen: true,
  activeSessionId: null,

  // UML Perspective
  activeUmlType: 'sequence', // 'sequence' | 'state'
  activeSequenceId: null,
  activeStateId: null,
  isMermaidRawVisible: false,

  // Architecture Interactive Canvas
  archZoom: 1.0,
  archPanX: 60,
  archPanY: 50,
  isArchPanning: false,
  panStartX: 0,
  panStartY: 0,
  isDraggingNode: false,
  dragNodeId: null,
  dragStartX: 0,
  dragStartY: 0,
  initialNodeX: 0,
  initialNodeY: 0,
  hasMovedDuringDrag: false,
  dragSuppressClickUntil: 0,
  selectedServiceId: null,
  nodePositions: {},
  archConnections: [],
  hasBoundCanvasEvents: false,

  // Discovery Perspective
  activeDiscoveryFilter: 'all',

  // UI/UX Perspective
  uiuxSearchTerm: '',
  uiuxActiveFilter: 'all',

  // Genesis Polling
  genesisPollInterval: null
};

// Storage Keys & Session Management
export const CHAT_STORAGE_KEY = 'sdd_chat_history_v2';

export function getStoredSessions() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredSessions(sessions) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving chat sessions:', e);
  }
}

export function ensureDefaultSession(project, genesisTask) {
  let sessions = getStoredSessions();
  const projName = project?.name || 'FlashCheckout';
  const promptText = genesisTask?.prompt || `Construir ${projName}: Plataforma de software gobernada por especificaciones SDD y directivas de control de alcance.`;

  const hasMatch = sessions.some(s => s.title === projName || (genesisTask && s.prompt === genesisTask.prompt));
  if (!hasMatch) {
    const defaultSession = {
      id: 'session_' + Date.now(),
      title: projName,
      prompt: promptText,
      status: (state.appState?.requirements?.userStories?.length > 0) ? 'completed' : (genesisTask?.status || 'completed'),
      createdAt: genesisTask?.createdAt || new Date().toISOString(),
      storyCount: state.appState?.requirements?.userStories?.length || 8
    };
    sessions.unshift(defaultSession);
    saveStoredSessions(sessions);
  }
  return sessions;
}

export function getArchStorageKey() {
  const proj = state.appState?.project?.name || 'default';
  return `sdd_arch_positions_${proj}`;
}

export function loadSavedArchPositions() {
  try {
    const raw = localStorage.getItem(getArchStorageKey());
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

export function saveCurrentArchPositions() {
  try {
    localStorage.setItem(getArchStorageKey(), JSON.stringify(state.nodePositions));
  } catch (e) {}
}
