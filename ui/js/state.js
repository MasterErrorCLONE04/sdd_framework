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
export function getChatStorageKey() {
  const ws = state.appState?.workspacePath || state.appState?.workspaceName;
  if (!ws) return 'sdd_chat_history_v2';
  const cleanKey = ws.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sdd_chat_history_${cleanKey}`;
}

export function getStoredSessions() {
  try {
    const key = getChatStorageKey();
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredSessions(sessions) {
  try {
    const key = getChatStorageKey();
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving chat sessions:', e);
  }
}

export function ensureDefaultSession(project, genesisTask) {
  const storiesCount = state.appState?.requirements?.userStories?.length || 0;
  const isNew = Boolean(state.appState?.isNewProject) || (storiesCount === 0 && !genesisTask);

  // En proyectos nuevos sin historias ni tarea génesis, mantener historial limpio sin sesiones fantasma
  if (isNew) {
    return getStoredSessions();
  }

  let sessions = getStoredSessions();
  const projName = project?.name || state.appState?.workspaceName;
  if (!projName) return sessions;

  const promptText = genesisTask?.prompt || `Proyecto ${projName}: Especificación SDD gobernada.`;

  const hasMatch = sessions.some(s => s.title === projName || (genesisTask && s.prompt === genesisTask.prompt));
  if (!hasMatch && (storiesCount > 0 || genesisTask)) {
    const defaultSession = {
      id: 'session_' + Date.now(),
      title: projName,
      prompt: promptText,
      status: (storiesCount > 0) ? 'completed' : (genesisTask?.status || 'completed'),
      createdAt: genesisTask?.createdAt || new Date().toISOString(),
      storyCount: storiesCount
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
