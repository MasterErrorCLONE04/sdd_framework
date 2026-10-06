// SDD Studio — Genesis Conversational Chat, AI Streaming, Polling & Morphing

import { state, getStoredSessions, saveStoredSessions } from './state.js';
import { dispatchGenesisTask, chatGenesis, checkGenesisTaskStatus, scaffoldGenesis } from './api.js';
import { escapeHtml, formatMarkdown, showToast, copyTextToClipboard } from './utils.js';
import { switchScreen } from './navigation.js';
import { openOpenRouterModal } from './modals.js';

export function renderSidebarHistory() {
  const container = document.getElementById('chat-history-list');
  if (!container) return;

  const sessions = getStoredSessions();
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="px-3 py-6 text-center text-xs text-zinc-400 space-y-1">
        <i data-lucide="message-square-dashed" class="w-4 h-4 mx-auto text-zinc-300"></i>
        <span class="block">Sin chats guardados</span>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = sessions.map(s => {
    const isActive = s.id === state.activeSessionId;
    const isCompleted = s.status === 'completed' || (state.appState?.requirements?.userStories?.length > 0);
    const title = s.title || (s.prompt ? (s.prompt.slice(0, 22) + '...') : 'Nuevo Proyecto');
    const badgeText = isCompleted ? '12 Persp.' : 'Orden Agéntica';
    const badgeClass = isCompleted 
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
      : 'bg-purple-50 text-purple-800 border-purple-200';

    return `
      <div
        onclick="selectChatSession('${s.id}')"
        class="group relative flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-all border ${
          isActive 
            ? 'bg-purple-50 text-purple-950 border-purple-300 font-bold shadow-xs' 
            : 'border-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
        }"
        title="${escapeHtml(s.title || s.prompt)}"
      >
        <div class="flex items-center gap-2 truncate pr-1">
          <i data-lucide="${isCompleted ? 'check-circle-2' : 'clock'}" class="w-3.5 h-3.5 shrink-0 ${isCompleted ? 'text-emerald-600' : 'text-purple-600'}"></i>
          <span class="truncate text-[11px]">${escapeHtml(title)}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span class="text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold ${badgeClass}">
            ${badgeText}
          </span>
          <button
            onclick="deleteChatSession(event, '${s.id}')"
            class="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 rounded transition-all cursor-pointer"
            title="Eliminar de historial"
          >
            <i data-lucide="trash-2" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

export function selectChatSession(sessionId) {
  const sessions = getStoredSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  state.activeSessionId = sessionId;
  renderSidebarHistory();

  // Cambiar a pantalla de chat
  if (state.currentScreen !== 'chat') {
    switchScreen('chat');
  }

  // Ocultar hero
  document.getElementById('genesis-chat-hero')?.classList.add('hidden');

  // Limpiar stream y renderizar la conversación guardada en Tema Claro
  const stream = document.getElementById('genesis-messages-stream');
  if (!stream) return;
  stream.innerHTML = '';

  // 1. Burbuja de usuario
  const userBubble = document.createElement('div');
  userBubble.className = 'flex justify-end';
  userBubble.innerHTML = `
    <div class="max-w-[85%] bg-white border border-zinc-200 text-zinc-900 rounded-3xl px-5 py-3.5 text-xs shadow-sm leading-relaxed space-y-1">
      <div class="font-extrabold text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <i data-lucide="user" class="w-3 h-3 text-purple-600"></i>
        <span>Tú</span>
      </div>
      <div class="text-zinc-900 font-medium">${escapeHtml(session.prompt)}</div>
    </div>
  `;
  stream.appendChild(userBubble);

  // 2. Burbuja de agente
  const isCompleted = session.status === 'completed' || (state.appState?.requirements?.userStories?.length > 0);
  const agentBubble = document.createElement('div');
  agentBubble.className = 'flex gap-3.5 items-start max-w-[92%]';

  if (isCompleted) {
    agentBubble.innerHTML = `
      <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20 ring-2 ring-purple-100 mt-0.5">
        <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
      </div>
      <div class="flex-1 bg-white border-2 border-purple-200 rounded-3xl p-5 text-xs text-zinc-800 shadow-xl shadow-purple-600/5 space-y-4">
        <div class="flex items-center justify-between border-b border-purple-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span class="font-black text-[11px] text-purple-950 uppercase tracking-wider">Antigravity IDE Agent</span>
            <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              ✓ Especificación Compilada
            </span>
          </div>
          <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5 font-bold">
            <i data-lucide="shield-check" class="w-3 h-3 text-purple-600"></i>
            <span>12 Perspectivas SDD</span>
          </span>
        </div>

        <div class="space-y-3">
          <div class="p-3.5 rounded-2xl bg-purple-50/60 border-l-4 border-l-purple-600 border border-purple-100 space-y-1">
            <div class="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="box" class="w-3.5 h-3.5 text-purple-600"></i>
              <span>Proyecto en Sesión:</span>
            </div>
            <div class="text-zinc-950 font-bold text-sm">${escapeHtml(session.title || state.appState?.project?.name || 'Proyecto SDD')}</div>
            <p class="text-xs text-zinc-600 mt-0.5 font-normal">
              Gobernanza activa y sincronizada en <code class="font-mono text-purple-700 font-bold">.sdd/</code> y directivas en <code class="font-mono text-purple-700 font-bold">AGENTS.md</code>.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-xs font-black text-purple-950 flex items-center gap-1.5">
                <i data-lucide="layout-dashboard" class="w-4 h-4 text-purple-600"></i>
                <span>Cabina de Gobernanza (12 Perspectivas):</span>
              </div>
              <span class="text-[10px] font-mono font-bold bg-white text-purple-800 px-2 py-0.5 rounded-full border border-purple-200 shadow-xs">
                ${state.appState?.requirements?.userStories?.length || 8} Historias Jira
              </span>
            </div>

            <p class="text-xs text-zinc-700 leading-relaxed font-normal">
              Haz clic abajo para abrir la cabina interactiva de este proyecto (Historias Jira, Arquitectura C4, ERD, Secuencias UML, QA y Deriva de Código).
            </p>

            <div class="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onclick="switchScreen('cockpit')"
                class="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <i data-lucide="arrow-right-circle" class="w-4 h-4 text-white"></i>
                <span>🚀 Abrir Cabina de este Proyecto</span>
              </button>

              <button
                onclick="copyGenesisOrderToClipboard()"
                class="px-3.5 py-2 rounded-xl bg-white hover:bg-purple-50 text-purple-900 text-xs font-bold flex items-center gap-2 border border-purple-200 transition-all cursor-pointer shadow-xs"
              >
                <i data-lucide="copy" class="w-3.5 h-3.5 text-purple-600"></i>
                <span>Copiar Orden para Agente</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    agentBubble.innerHTML = `
      <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20 ring-2 ring-purple-100 mt-0.5">
        <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
      </div>
      <div class="flex-1 bg-white border-2 border-purple-200 rounded-3xl p-5 text-xs text-zinc-800 shadow-xl shadow-purple-600/5 space-y-4">
        <div class="flex items-center justify-between border-b border-purple-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></span>
            <span class="font-black text-[11px] text-purple-950 uppercase tracking-wider">Antigravity IDE Agent</span>
            <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
              Orden Despachada
            </span>
          </div>
          <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-zinc-100 text-purple-900 border border-purple-200 flex items-center gap-1.5 font-bold">
            <i data-lucide="file-code" class="w-3 h-3 text-purple-600"></i>
            <span>.sdd/genesis_task.json</span>
          </span>
        </div>

        <div class="space-y-3.5">
          <div class="p-3.5 rounded-2xl bg-purple-50/60 border-l-4 border-l-purple-600 border border-purple-100 space-y-1">
            <div class="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="message-square" class="w-3.5 h-3.5 text-purple-600"></i>
              <span>Idea en proceso:</span>
            </div>
            <div class="text-zinc-950 font-bold text-xs">${escapeHtml(session.prompt)}</div>
          </div>

          <div class="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-xs space-y-3">
            <div class="flex items-center gap-2 text-xs font-black text-purple-950">
              <i data-lucide="terminal" class="w-4 h-4 text-purple-600"></i>
              <span>Siguiente paso para tu Agente en Antigravity:</span>
            </div>
            
            <p class="text-zinc-700 text-xs leading-relaxed font-normal">
              La orden está escrita en tu disco. Pega la siguiente instrucción en tu chat de Antigravity:
              <br>
              <span class="inline-block mt-2 px-3 py-1.5 rounded-xl bg-white border border-purple-300 text-purple-950 font-mono font-bold text-xs select-all shadow-xs">
                "procesa la orden génesis"
              </span>
            </p>

            <div class="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onclick="copyGenesisOrderToClipboard()"
                class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>Copiar comando para Antigravity</span>
              </button>
            </div>
          </div>

          <div class="space-y-2 pt-1 text-[11px]" id="agent-pipeline-steps">
            <div class="flex items-center gap-2 text-emerald-700 font-semibold">
              <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>[1/2] Orden registrada en disco (.sdd/genesis_task.json)</span>
            </div>
            <div class="flex items-center gap-2 text-purple-800 font-bold animate-pulse">
              <i data-lucide="radio" class="w-3.5 h-3.5 text-purple-600 animate-spin"></i>
              <span>[2/2] Esperando a Antigravity...</span>
            </div>
          </div>
        </div>
      </div>
    `;
    startGenesisPolling(agentBubble);
  }

  stream.appendChild(agentBubble);
  if (window.lucide) window.lucide.createIcons();
  scrollChatToBottom();
}

export function deleteChatSession(event, id) {
  if (event) event.stopPropagation();
  let sessions = getStoredSessions();
  sessions = sessions.filter(s => s.id !== id);
  saveStoredSessions(sessions);
  if (state.activeSessionId === id) {
    startNewChatProject();
  } else {
    renderSidebarHistory();
  }
}

export function clearAllChatSessions() {
  if (confirm('¿Deseas vaciar el historial de chats de este proyecto?')) {
    saveStoredSessions([]);
    // También limpiar clave legacy si existe
    try { localStorage.removeItem('sdd_chat_history_v2'); } catch {}
    startNewChatProject();
  }
}

export function startNewChatProject() {
  state.activeSessionId = null;
  state.chatMessages = [];
  state.currentChatPreview = null;
  state.currentChatStage = 'discovery';
  state.currentChatPhase = 1;
  const stream = document.getElementById('genesis-messages-stream');
  if (stream) stream.innerHTML = '';
  document.getElementById('genesis-chat-hero')?.classList.remove('hidden');
  const input = document.getElementById('genesis-chat-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  updateGenesisStepper(1);
  renderSidebarHistory();
}

export function setPromptIdea(text) {
  const input = document.getElementById('genesis-chat-input');
  if (input) {
    input.value = text;
    input.focus();
    sendGenesisChatMessage();
  }
}

export function handleChatKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendGenesisChatMessage();
  }
}

export async function sendGenesisChatMessage() {
  const input = document.getElementById('genesis-chat-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  if (input) input.value = '';

  // Ocultar Hero
  document.getElementById('genesis-chat-hero')?.classList.add('hidden');

  // Crear o recuperar sesión en el historial
  const newSessionId = 'session_' + Date.now();
  if (!state.activeSessionId) {
    state.activeSessionId = newSessionId;
  }
  
  const sessions = getStoredSessions();
  let existingSession = sessions.find(s => s.id === state.activeSessionId);
  if (!existingSession) {
    existingSession = {
      id: state.activeSessionId,
      title: text.length > 28 ? (text.slice(0, 28) + '...') : text,
      prompt: text,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    sessions.unshift(existingSession);
  } else {
    existingSession.prompt = text;
  }
  saveStoredSessions(sessions);
  renderSidebarHistory();

  // 1. Renderizar mensaje del usuario
  const stream = document.getElementById('genesis-messages-stream');
  if (!stream) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'flex justify-end';
  userBubble.innerHTML = `
    <div class="max-w-[85%] bg-white border border-zinc-200 text-zinc-900 rounded-3xl px-5 py-3.5 text-xs shadow-sm leading-relaxed space-y-1">
      <div class="font-extrabold text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <i data-lucide="user" class="w-3 h-3 text-purple-600"></i>
        <span>Tú</span>
      </div>
      <div class="text-zinc-900 font-medium">${escapeHtml(text)}</div>
    </div>
  `;
  stream.appendChild(userBubble);
  if (window.lucide) window.lucide.createIcons();
  scrollChatToBottom();

  state.chatMessages.push({ role: 'user', content: text });

  // Si se eligió expresamente despacho a Antigravity IDE
  if (state.selectedEngine === 'editor') {
    const agentBubble = document.createElement('div');
    agentBubble.className = 'flex gap-3.5 items-start max-w-[92%]';
    agentBubble.innerHTML = `
      <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20 ring-2 ring-purple-100 mt-0.5">
        <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
      </div>
      <div class="flex-1 bg-white border-2 border-purple-200 rounded-3xl p-5 text-xs text-zinc-800 shadow-xl shadow-purple-600/5 space-y-4">
        <div class="flex items-center justify-between border-b border-purple-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></span>
            <span class="font-black text-[11px] text-purple-950 uppercase tracking-wider">Antigravity IDE Agent</span>
            <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
              Orden Despachada
            </span>
          </div>
          <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-zinc-100 text-purple-900 border border-purple-200 flex items-center gap-1.5 font-bold">
            <i data-lucide="file-code" class="w-3 h-3 text-purple-600"></i>
            <span>.sdd/genesis_task.json</span>
          </span>
        </div>
        <div class="space-y-3.5">
          <div class="p-3.5 rounded-2xl bg-purple-50/60 border-l-4 border-l-purple-600 border border-purple-100 space-y-1">
            <div class="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="message-square" class="w-3.5 h-3.5 text-purple-600"></i>
              <span>Idea recibida:</span>
            </div>
            <div class="text-zinc-950 font-bold text-xs">"${escapeHtml(text)}"</div>
          </div>
          <div class="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-xs space-y-3">
            <div class="flex items-center gap-2 text-xs font-black text-purple-950">
              <i data-lucide="terminal" class="w-4 h-4 text-purple-600"></i>
              <span>Siguiente paso para tu Agente en Antigravity:</span>
            </div>
            <p class="text-zinc-700 text-xs leading-relaxed font-normal">
              La orden está en tu disco. Pega la siguiente instrucción en tu chat de Antigravity:
              <br>
              <span class="inline-block mt-2 px-3 py-1.5 rounded-xl bg-white border border-purple-300 text-purple-950 font-mono font-bold text-xs select-all shadow-xs">
                "procesa la orden génesis"
              </span>
            </p>
            <div class="flex flex-wrap items-center gap-2.5 pt-1">
              <button onclick="copyGenesisOrderToClipboard()" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 transition-all cursor-pointer">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>Copiar comando para Antigravity</span>
              </button>
            </div>
          </div>
          <div class="space-y-2 pt-1 text-[11px]" id="agent-pipeline-steps">
            <div class="flex items-center gap-2 text-emerald-700 font-semibold">
              <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>[1/2] Orden registrada en disco (.sdd/genesis_task.json)</span>
            </div>
            <div class="flex items-center gap-2 text-purple-800 font-bold animate-pulse">
              <i data-lucide="radio" class="w-3.5 h-3.5 text-purple-600 animate-spin"></i>
              <span>[2/2] Esperando a Antigravity...</span>
            </div>
          </div>
        </div>
      </div>
    `;
    stream.appendChild(agentBubble);
    if (window.lucide) window.lucide.createIcons();
    scrollChatToBottom();

    try {
      await dispatchGenesisTask(text, 'Antigravity');
    } catch (e) {}

    startGenesisPolling(agentBubble);
    return;
  }

  // OpenRouter / Agente IDE
  const agentBubble = document.createElement('div');
  agentBubble.className = 'flex gap-3.5 items-start max-w-[92%]';
  const bubbleId = 'agent-msg-' + Date.now();
  agentBubble.id = bubbleId;

  const isUsingOpenRouter = (state.selectedEngine === 'openrouter');
  const modelShortName = isUsingOpenRouter 
    ? (state.selectedModel.split('/')[1]?.split(':')[0] || 'Ling 3.0 Flash') 
    : 'Agente IDE';

  agentBubble.innerHTML = `
    <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20 ring-2 ring-purple-100 mt-0.5">
      <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
    </div>
    <div class="flex-1 bg-white border-2 border-purple-200 rounded-3xl p-5 text-xs text-zinc-800 shadow-xl shadow-purple-600/5 space-y-4">
      <div class="flex items-center justify-between border-b border-purple-100 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></span>
          <span class="font-black text-[11px] text-purple-950 uppercase tracking-wider">Arquitecto SDD</span>
          <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
            ${isUsingOpenRouter ? 'OpenRouter :free' : 'Agente IDE'}
          </span>
        </div>
        <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-zinc-100 text-purple-900 border border-purple-200 flex items-center gap-1.5 font-bold">
          <i data-lucide="cpu" class="w-3 h-3 text-purple-600"></i>
          <span>${escapeHtml(modelShortName)}</span>
        </span>
      </div>

      <div id="${bubbleId}-content" class="space-y-3.5 text-zinc-700 leading-relaxed font-normal">
        <div class="flex items-center gap-2.5 text-purple-700 py-3">
          <i data-lucide="loader-2" class="w-4 h-4 animate-spin text-purple-600"></i>
          <span class="font-semibold text-xs animate-pulse">Consultando modelo gratuito (${escapeHtml(modelShortName)}) y sintetizando especificación...</span>
        </div>
      </div>
    </div>
  `;
  stream.appendChild(agentBubble);
  if (window.lucide) window.lucide.createIcons();
  scrollChatToBottom();

  try {
    const data = await chatGenesis({
      messages: state.chatMessages,
      currentPreview: state.currentChatPreview,
      engine: state.selectedEngine,
      model: state.selectedModel,
      stage: state.currentChatStage || 'discovery',
      phase: state.currentChatPhase || 1
    });
    if (!data.success) throw new Error(data.error || 'Error al procesar consulta');

    state.currentChatPreview = data.preview;
    state.currentChatStage = data.stage || state.currentChatStage || 'discovery';
    state.currentChatPhase = Number(data.currentPhase || data.preview?.currentPhase || state.currentChatPhase || 1);
    state.chatMessages.push({ role: 'assistant', content: data.reply });

    if (data.tokens) {
      const tokenPill = document.getElementById('chat-token-pill');
      if (tokenPill) {
        tokenPill.innerText = `${data.tokens.totalTokens} tokens (100% Gratis)`;
      }
    }

    // Actualizar stepper de fases
    updateGenesisStepper(state.currentChatPhase);

    const contentEl = document.getElementById(`${bubbleId}-content`);
    if (contentEl) {
      const formattedHtml = formatMarkdown(data.reply);
      const projName = data.preview?.project?.name || 'Nuevo Proyecto';
      const phaseTitle = data.preview?.phaseTitle || `Fase ${data.preview?.currentPhase || 1}`;
      const nonGoals = data.preview?.core?.scopeBoundaries?.explicitNonGoals || [];
      const stories = data.preview?.requirements?.userStories || [];
      const screens = data.preview?.uiUx?.screens || [];
      const umlCode = data.preview?.sequences?.[0]?.mermaid || '';
      const suggestedActions = data.preview?.suggestedActions || [];

      contentEl.innerHTML = `
        <div class="text-xs text-zinc-800 leading-relaxed space-y-2.5">
          ${formattedHtml}
        </div>

        <!-- SPECIFICATION PROGRESSIVE LIVE DECK -->
        <div class="mt-4 bg-zinc-50 border border-purple-200/90 rounded-2xl overflow-hidden shadow-xs space-y-0">
          
          <!-- Deck Top Header -->
          <div class="p-3.5 bg-purple-50/70 border-b border-purple-200 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
              <span class="text-xs font-black text-purple-950">${escapeHtml(projName)}</span>
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-purple-800 border border-purple-200">
                ${escapeHtml(phaseTitle)}
              </span>
            </div>
            <div class="flex items-center gap-2 text-[10px] font-mono text-zinc-500 font-bold">
              <span>${nonGoals.length} Non-Goals</span>
              <span>•</span>
              <span>${stories.length} Historias</span>
              <span>•</span>
              <span>${screens.length} Pantallas</span>
            </div>
          </div>

          <!-- Segmented Navigation for the Spec Deck -->
          <div class="p-2 border-b border-zinc-200 bg-zinc-100/70 flex items-center gap-1 text-[11px] font-bold overflow-x-auto">
            <button id="${bubbleId}-tab-problem" onclick="switchPreviewTab('${bubbleId}', 'problem')" class="px-3 py-1.5 rounded-xl bg-white text-purple-950 font-black shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="target" class="w-3.5 h-3.5 text-purple-600"></i>
              <span>Problema & Alcance (${nonGoals.length})</span>
            </button>
            <button id="${bubbleId}-tab-stories" onclick="switchPreviewTab('${bubbleId}', 'stories')" class="px-3 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-950 flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
              <span>Historias Jira (${stories.length})</span>
            </button>
            <button id="${bubbleId}-tab-screens" onclick="switchPreviewTab('${bubbleId}', 'screens')" class="px-3 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-950 flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="monitor" class="w-3.5 h-3.5"></i>
              <span>Pantallas UI (${screens.length})</span>
            </button>
            <button id="${bubbleId}-tab-uml" onclick="switchPreviewTab('${bubbleId}', 'uml')" class="px-3 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-950 flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="workflow" class="w-3.5 h-3.5 text-indigo-600"></i>
              <span>Diagrama UML Secuencia</span>
            </button>
          </div>

          <!-- Pane 1: Problema, Dolor & Non-Goals V1 -->
          <div id="${bubbleId}-pane-problem" class="p-4 space-y-3.5">
            ${data.preview?.core?.problem?.statement ? `
              <div class="space-y-1">
                <span class="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400">Problema Raíz Identificado:</span>
                <p class="text-xs text-zinc-800 bg-white p-3 rounded-xl border border-zinc-200/80 leading-relaxed font-medium">
                  ${escapeHtml(data.preview.core.problem.statement)}
                </p>
              </div>
            ` : ''}

            ${(Array.isArray(data.preview?.core?.problem?.painPoints) && data.preview.core.problem.painPoints.length > 0) ? `
              <div class="space-y-1">
                <span class="text-[10px] font-mono font-black uppercase tracking-wider text-purple-700">Dolores Clave del Usuario:</span>
                <div class="grid grid-cols-1 gap-1.5">
                  ${data.preview.core.problem.painPoints.map(p => `
                    <div class="p-2.5 rounded-xl bg-white border border-purple-100 flex items-start justify-between gap-2 text-xs shadow-2xs">
                      <div class="space-y-0.5">
                        <div class="font-bold text-zinc-900">${escapeHtml(p.pain || p)}</div>
                        ${p.solution ? `<div class="text-[11px] text-zinc-500 font-normal">${escapeHtml(p.solution)}</div>` : ''}
                      </div>
                      <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200 shrink-0 uppercase">
                        ${escapeHtml(p.severity || 'media')}
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${(Array.isArray(data.preview?.product?.actors) && data.preview.product.actors.length > 0) ? `
              <div class="space-y-1">
                <span class="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-700">Audiencia & Actores:</span>
                <div class="flex flex-wrap gap-2">
                  ${data.preview.product.actors.map(u => `
                    <span class="px-2.5 py-1 rounded-xl bg-white border border-indigo-100 text-xs font-semibold text-indigo-950 flex items-center gap-1.5 shadow-2xs">
                      <i data-lucide="user" class="w-3 h-3 text-indigo-600"></i>
                      <span>${escapeHtml(u.role)}: ${escapeHtml(u.need || '')}</span>
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-mono font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
                  <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
                  <span>Limitaciones Explícitas & Non-Goals V1 (Blindaje contra Scope Creep)</span>
                </span>
                <span class="text-[10px] font-mono text-zinc-400">Congelado para V2</span>
              </div>
              <div class="space-y-2">
                ${nonGoals.map(ng => `
                  <div class="p-2.5 rounded-xl bg-white border border-rose-200/80 flex items-start justify-between gap-3 text-xs shadow-2xs">
                    <div class="space-y-0.5">
                      <div class="font-bold text-rose-950 flex items-center gap-1.5">
                        <span class="text-rose-500 font-mono text-[10px]">🚫</span>
                        <span>${escapeHtml(ng.feature)}</span>
                      </div>
                      <p class="text-[11px] text-zinc-500 font-normal">${escapeHtml(ng.rationale)}</p>
                    </div>
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 shrink-0">
                      NO V1
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Pane 2: Historias de Usuario Jira con Gherkin -->
          <div id="${bubbleId}-pane-stories" class="p-4 space-y-3 hidden">
            <span class="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400 block">
              Historias de Usuario Formateadas (Como / Quiero / Para + Gherkin):
            </span>
            <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              ${stories.map(st => `
                <div class="p-3 rounded-xl bg-white border border-zinc-200 space-y-2 shadow-2xs text-xs">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-mono font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">${st.id}</span>
                    <span class="font-bold text-zinc-950 flex-1 truncate">${escapeHtml(st.title)}</span>
                    <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-bold">${st.priority || 'P1'}</span>
                  </div>
                  ${st.role && st.action ? `
                    <p class="text-[11px] text-zinc-600 font-normal">
                      Como <b>${escapeHtml(st.role)}</b> quiero <b>${escapeHtml(st.action)}</b> para <b>${escapeHtml(st.benefit || '')}</b>.
                    </p>
                  ` : ''}
                  ${st.acceptanceCriteria && st.acceptanceCriteria.length > 0 ? `
                    <div class="p-2 rounded-lg bg-zinc-50 border border-zinc-100 space-y-1 text-[11px] font-mono">
                      <div class="text-[9px] font-black uppercase text-zinc-400">Criterio Dado-Cuando-Entonces:</div>
                      <div class="text-zinc-700 font-normal">
                        ${escapeHtml(st.acceptanceCriteria[0].scenario || `${st.acceptanceCriteria[0].given || ''} -> ${st.acceptanceCriteria[0].when || ''} -> ${st.acceptanceCriteria[0].then || ''}`)}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Pane 3: Pantallas UI & Wireframes -->
          <div id="${bubbleId}-pane-screens" class="p-4 space-y-3 hidden">
            <span class="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400 block">
              Pantallas Proyectadas de la Interfaz:
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              ${screens.map(sc => `
                <div class="p-3 rounded-xl bg-white border border-zinc-200 space-y-1.5 shadow-2xs text-xs">
                  <div class="flex items-center justify-between gap-1.5">
                    <span class="font-bold text-zinc-950 truncate">${escapeHtml(sc.name)}</span>
                    <span class="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 truncate">${sc.route}</span>
                  </div>
                  <p class="text-[11px] text-zinc-500 leading-snug font-normal">${escapeHtml(sc.description)}</p>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Pane 4: Diagrama UML Secuencia Interactivo -->
          <div id="${bubbleId}-pane-uml" class="p-4 space-y-3 hidden">
            <div class="flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400">
              <span>Diagrama de Secuencia Técnica (Actor -> Frontend -> Backend -> DB)</span>
              <span class="text-indigo-600 font-bold">UML Mermaid</span>
            </div>
            <div id="${bubbleId}-uml-target" data-mermaid-code="${escapeHtml(umlCode)}" class="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs overflow-x-auto min-h-[140px] flex items-center justify-center text-xs">
              <div class="text-zinc-400 flex items-center gap-2">
                <i data-lucide="loader-2" class="w-4 h-4 animate-spin text-purple-600"></i>
                <span>Renderizando diagrama de secuencia UML...</span>
              </div>
            </div>
          </div>

          <!-- Suggested Action Chips (Siguiente Paso Pedagógico) -->
          ${suggestedActions.length > 0 ? `
            <div class="p-3 bg-purple-50/40 border-t border-purple-100 space-y-2">
              <span class="text-[10px] font-mono font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                <i data-lucide="sparkles" class="w-3 h-3 text-purple-600"></i>
                <span>Siguientes pasos sugeridos para tu proyecto:</span>
              </span>
              <div class="flex flex-wrap items-center gap-2">
                ${suggestedActions.map(act => `
                  <button
                    onclick="sendQuickAction('${escapeHtml(act)}')"
                    class="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100/70 text-purple-950 text-xs font-bold border border-purple-200 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <i data-lucide="arrow-right" class="w-3 h-3 text-purple-600"></i>
                    <span>${escapeHtml(act)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Stage Progression or Final Scaffolding Action Deck -->
          ${(() => {
            const currentPhase = Number(data.currentPhase || data.preview?.currentPhase || state.currentChatPhase || 1);
            const stage = data.stage || data.preview?.stage || state.currentChatStage || 'discovery';
            const isComplete = Boolean(data.readyToScaffold || currentPhase >= 6 || stage === 'ready');

            const phaseCatalog = {
              1: { name: 'Problema & Audiencia', next: 'Alcance & Non-Goals V1', nextPhase: 2 },
              2: { name: 'Alcance V1 & Non-Goals', next: 'Historias & Gherkin', nextPhase: 3 },
              3: { name: 'Historias & Gherkin', next: 'Pantallas & UI Declarativa', nextPhase: 4 },
              4: { name: 'Pantallas & UI Declarativa', next: 'Arquitectura & Base de Datos', nextPhase: 5 },
              5: { name: 'Arquitectura & Base de Datos', next: 'Plan de Ejecución & Scope Shield', nextPhase: 6 },
              6: { name: 'Plan de Ejecución & Cierre', next: 'Aprobar y Abrir Cabina', nextPhase: 6 }
            };
            const currentMeta = phaseCatalog[currentPhase] || { name: `Etapa ${currentPhase}`, next: 'Siguiente Etapa', nextPhase: Math.min(currentPhase + 1, 6) };

            if (isComplete) {
              return `
                <div class="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border-t border-purple-200 flex flex-wrap items-center justify-between gap-3">
                  <div class="space-y-1">
                    <div class="text-xs font-black text-zinc-950 flex items-center gap-1.5">
                      <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                      <span>¡Planificación Completa de las 12 Perspectivas SDD!</span>
                      <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">100% Listo</span>
                    </div>
                    <p class="text-[11px] text-zinc-600 font-normal">
                      Todas las etapas han sido estructuradas rigurosamente. Al aprobar, se compilarán los esquemas canónicos en <code class="font-mono text-purple-700">.sdd/</code> y directivas blindadas en <code class="font-mono text-purple-700">AGENTS.md</code>.
                    </p>
                  </div>

                  <button
                    onclick="confirmAndOpenCockpit()"
                    class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/25 active:scale-95 transition-all cursor-pointer"
                  >
                    <i data-lucide="layout-dashboard" class="w-4 h-4 text-white"></i>
                    <span>🚀 Aprobar y Abrir Cabina de Control</span>
                  </button>
                </div>
              `;
            } else {
              return `
                <div class="p-3.5 bg-white border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                  <div class="space-y-0.5">
                    <div class="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                      <span class="font-mono text-[11px] text-purple-700 font-black">Etapa ${currentPhase}/6:</span>
                      <span>${escapeHtml(currentMeta.name)}</span>
                    </div>
                    <p class="text-[11px] text-zinc-500 font-normal">
                      Responde las preguntas del mentor para afinar esta etapa o avanza cuando estés conforme.
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      onclick="advanceStageFromChat(${currentMeta.nextPhase})"
                      class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-purple-600/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Avanzar a Etapa ${currentMeta.nextPhase}: ${escapeHtml(currentMeta.next)}</span>
                      <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                    </button>

                    <button
                      onclick="confirmAndOpenCockpit()"
                      class="px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 text-[11px] font-semibold transition-all cursor-pointer"
                      title="Abrir la Cabina con la especificación en borrador"
                    >
                      <span>Ver borrador en Cabina</span>
                    </button>
                  </div>
                </div>
              `;
            }
          })()}

        </div>

        <!-- Footer status -->
        <div class="flex items-center justify-between pt-2 border-t border-purple-100 text-[10px] text-zinc-400 font-mono">
          <span>Motor: ${escapeHtml(data.tokens?.engine || state.selectedModel)}</span>
          <span class="text-emerald-700 font-bold">Consumo: $0.00 USD (Modelo Free)</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      scrollChatToBottom();
    }

    if (existingSession) {
      const isCompleteSession = Boolean(data.readyToScaffold || data.currentPhase >= 6 || data.stage === 'ready');
      existingSession.status = isCompleteSession ? 'completed' : 'in_progress';
      existingSession.phase = data.currentPhase || 1;
      existingSession.stage = data.stage || 'discovery';
      existingSession.title = data.preview?.project?.name || existingSession.title;
      saveStoredSessions(sessions);
      renderSidebarHistory();
    }
  } catch (err) {
    console.error('Error al consultar chat:', err);
    const contentEl = document.getElementById(`${bubbleId}-content`);
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2 text-xs">
          <div class="font-bold flex items-center gap-1.5">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-600"></i>
            <span>Aviso de Conexión OpenRouter</span>
          </div>
          <p class="font-normal">${escapeHtml(err.message)}</p>
          <div class="flex items-center gap-2 pt-1">
            <button onclick="openOpenRouterModal()" class="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer flex items-center gap-1.5 shadow-xs">
              <i data-lucide="key" class="w-3.5 h-3.5"></i>
              <span>Configurar API Key</span>
            </button>
            <button onclick="retryGenesisChat('${encodeURIComponent(text)}')" class="px-3 py-1.5 rounded-xl bg-white text-rose-900 border border-rose-200 font-bold hover:bg-rose-50 cursor-pointer flex items-center gap-1.5 shadow-xs">
              <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
              <span>Reintentar con IA</span>
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

export function startGenesisPolling(agentBubble) {
  if (state.genesisPollInterval) clearInterval(state.genesisPollInterval);

  state.genesisPollInterval = setInterval(async () => {
    try {
      const data = await checkGenesisTaskStatus();

      if (data.ready || data.status === 'completed') {
        clearInterval(state.genesisPollInterval);
        state.genesisPollInterval = null;

        const currentSessions = getStoredSessions();
        const s = currentSessions.find(item => item.id === state.activeSessionId);
        if (s) {
          s.status = 'completed';
          saveStoredSessions(currentSessions);
          renderSidebarHistory();
        }

        if (agentBubble) {
          const pipeline = agentBubble.querySelector('#agent-pipeline-steps');
          if (pipeline) {
            pipeline.innerHTML = `
              <div class="flex items-center gap-2 text-emerald-700 font-semibold">
                <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
                <span>[1/4] Orden registrada en disco (.sdd/genesis_task.json)</span>
              </div>
              <div class="flex items-center gap-2 text-emerald-700 font-semibold">
                <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
                <span>[2/4] Agente de Antigravity procesó y consumió tokens en el chat</span>
              </div>
              <div class="flex items-center gap-2 text-emerald-700 font-semibold">
                <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
                <span>[3/4] ${data.storyCount || 'Varias'} Historias Gherkin, Arquitectura C4 y ERD escritas en .sdd/</span>
              </div>
              <div class="flex items-center gap-2 text-emerald-800 font-black animate-pulse">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-purple-600"></i>
                <span>[4/4] ¡Especificación lista! Transformando a Cabina SDD en vivo...</span>
              </div>
            `;
            if (window.lucide) window.lucide.createIcons();
          }
        }

        // Transición a cabina
        await new Promise(r => setTimeout(r, 1200));
        await triggerLiveCockpitMorph();
      }
    } catch (err) {
      console.error('Error en polling génesis:', err);
    }
  }, 1500);
}

export async function triggerLiveCockpitMorph() {
  const overlay = document.getElementById('morph-transition-overlay');
  const progressBar = document.getElementById('morph-progress-bar');
  const overlayTitle = document.getElementById('morph-overlay-title');
  const overlayDesc = document.getElementById('morph-overlay-desc');

  if (overlay) {
    overlay.classList.remove('hidden');
    if (overlayTitle) overlayTitle.innerText = '¡Especificación SDD Compilada por Antigravity!';
    if (overlayDesc) overlayDesc.innerText = 'Cargando tablero reactivo con las 12 perspectivas gobernadas...';
    if (progressBar) progressBar.style.width = '40%';
  }

  await new Promise(r => setTimeout(r, 400));
  if (progressBar) progressBar.style.width = '85%';
  if (window.loadData) await window.loadData();

  if (state.appState?.project?.name) {
    const curSessions = getStoredSessions();
    const cur = curSessions.find(x => x.id === state.activeSessionId);
    if (cur) {
      cur.title = state.appState.project.name;
      saveStoredSessions(curSessions);
      renderSidebarHistory();
    }
  }

  await new Promise(r => setTimeout(r, 400));
  if (progressBar) progressBar.style.width = '100%';

  await new Promise(r => setTimeout(r, 400));
  switchScreen('cockpit');
  document.getElementById('btn-toggle-cockpit')?.classList.remove('hidden');

  if (overlay) overlay.classList.add('hidden');
  showToast('¡Cabina SDD abierta en vivo!', 'check-circle');
}

export async function retryGenesisChat(encodedText) {
  const text = decodeURIComponent(encodedText);
  const inputEl = document.getElementById('genesis-chat-input');
  if (inputEl) {
    inputEl.value = text;
  }
  await sendGenesisChatMessage();
}

export function scrollChatToBottom() {
  const scroll = document.getElementById('genesis-chat-scroll');
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}

export async function confirmAndOpenCockpit() {
  if (!state.currentChatPreview) return;
  
  const overlay = document.getElementById('morph-transition-overlay');
  const progressBar = document.getElementById('morph-progress-bar');
  const overlayTitle = document.getElementById('morph-overlay-title');

  if (overlay) {
    overlay.classList.remove('hidden');
    if (overlayTitle) overlayTitle.innerText = `Compilando ${state.currentChatPreview.project.name}...`;
    if (progressBar) progressBar.style.width = '35%';
  }

  try {
    if (progressBar) progressBar.style.width = '65%';
    const data = await scaffoldGenesis(state.currentChatPreview);
    if (!data.success) throw new Error(data.error || 'Error al compilar en disco');

    if (progressBar) progressBar.style.width = '100%';

    await new Promise(r => setTimeout(r, 600));

    switchScreen('cockpit');
    document.getElementById('btn-toggle-cockpit')?.classList.remove('hidden');
    if (window.loadData) await window.loadData();

    if (overlay) overlay.classList.add('hidden');
    showToast(`¡Proyecto ${state.currentChatPreview.project.name} inicializado con éxito!`);
  } catch (err) {
    if (overlay) overlay.classList.add('hidden');
    showToast(err.message || 'Error', 'alert-circle');
  }
}

export function copyGenesisOrderToClipboard() {
  copyTextToClipboard('procesa la orden génesis', '¡Comando copiado! Pégalo en tu chat de Antigravity.');
}

export function updateGenesisStepper(currentPhase = 1) {
  const phaseNum = typeof currentPhase === 'number' ? currentPhase : (currentPhase === 'complete' ? 6 : 1);
  for (let i = 1; i <= 6; i++) {
    const pill = document.getElementById(`step-pill-${i}`);
    if (!pill) continue;
    const num = pill.querySelector('.step-number');
    if (i < phaseNum) {
      pill.className = 'step-pill flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 transition-all cursor-pointer';
      if (num) {
        num.className = 'step-number w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black';
        num.innerText = '✓';
      }
    } else if (i === phaseNum) {
      pill.className = 'step-pill flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold bg-purple-100 text-purple-950 border border-purple-300 ring-2 ring-purple-200 shadow-xs transition-all cursor-pointer';
      if (num) {
        num.className = 'step-number w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black animate-pulse';
        num.innerText = String(i);
      }
    } else {
      pill.className = 'step-pill flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold bg-zinc-100 text-zinc-500 border border-zinc-200 transition-all cursor-pointer';
      if (num) {
        num.className = 'step-number w-4 h-4 rounded-full bg-zinc-300 text-zinc-600 flex items-center justify-center text-[10px]';
        num.innerText = String(i);
      }
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

export function advanceStageFromChat(targetPhase = 1) {
  const phaseMap = {
    1: { stage: 'discovery', prompt: 'Continuemos con la Etapa 1: Definir a fondo el problema raíz y los dolores de la audiencia' },
    2: { stage: 'product', prompt: 'Aprobado. Avancemos a la Etapa 2: Definir los módulos macro, el alcance V1 y los Non-Goals explícitos congelados para V2' },
    3: { stage: 'requirements', prompt: 'Aprobado. Avancemos a la Etapa 3: Estructurar las Historias de Usuario Jira con criterios Gherkin Dado-Cuando-Entonces y Reglas de Negocio' },
    4: { stage: 'ux', prompt: 'Aprobado. Avancemos a la Etapa 4: Diseñar las pantallas UI, rutas de navegación, componentes y wireframes declarativos' },
    5: { stage: 'architecture', prompt: 'Aprobado. Avancemos a la Etapa 5: Definir la arquitectura técnica C4, stack de desarrollo, tablas ERD y diagrama UML de secuencia' },
    6: { stage: 'execution', prompt: 'Aprobado. Avancemos a la Etapa 6: Generar el plan de ejecución por fases, tareas con Scope Shield y compuertas de calidad' }
  };
  const phaseInfo = phaseMap[targetPhase] || phaseMap[6];
  state.currentChatStage = phaseInfo.stage;
  state.currentChatPhase = targetPhase;
  updateGenesisStepper(targetPhase);
  setPromptIdea(phaseInfo.prompt);
}

export function switchPreviewTab(bubbleId, tabName) {
  const tabs = ['problem', 'stories', 'screens', 'uml'];
  tabs.forEach(t => {
    const pane = document.getElementById(`${bubbleId}-pane-${t}`);
    const btn = document.getElementById(`${bubbleId}-tab-${t}`);
    if (t === tabName) {
      pane?.classList.remove('hidden');
      btn?.classList.add('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
      btn?.classList.remove('text-zinc-600');
    } else {
      pane?.classList.add('hidden');
      btn?.classList.remove('bg-white', 'text-purple-950', 'shadow-2xs', 'font-black');
      btn?.classList.add('text-zinc-600');
    }
  });

  if (tabName === 'uml') {
    const umlTarget = document.getElementById(`${bubbleId}-uml-target`);
    if (umlTarget && !umlTarget.dataset.rendered && window.mermaid) {
      const code = umlTarget.dataset.mermaidCode;
      if (code) {
        umlTarget.dataset.rendered = 'true';
        const renderId = `mermaid-chat-${Date.now()}`;
        try {
          window.mermaid.render(renderId, code).then(res => {
            umlTarget.innerHTML = res.svg;
          }).catch(() => {
            umlTarget.innerHTML = `<pre class="text-[10px] font-mono p-3 bg-zinc-100 rounded-xl overflow-x-auto text-zinc-800">${escapeHtml(code)}</pre>`;
          });
        } catch {
          umlTarget.innerHTML = `<pre class="text-[10px] font-mono p-3 bg-zinc-100 rounded-xl overflow-x-auto text-zinc-800">${escapeHtml(code)}</pre>`;
        }
      }
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

export function sendQuickAction(actionText) {
  const input = document.getElementById('genesis-chat-input');
  if (input) {
    input.value = actionText;
    sendGenesisChatMessage();
  }
}

// Window global exposures
window.updateGenesisStepper = updateGenesisStepper;
window.advanceStageFromChat = advanceStageFromChat;
window.switchPreviewTab = switchPreviewTab;
window.sendQuickAction = sendQuickAction;

