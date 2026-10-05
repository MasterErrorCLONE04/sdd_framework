// SDD Studio — API Client Module

export async function fetchSddData() {
  const res = await fetch('/api/sdd');
  if (!res.ok) throw new Error('Error al cargar datos de SDD');
  return res.json();
}

export async function patchSdd(payload) {
  const res = await fetch('/api/sdd', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Error al actualizar datos en disco');
  return res.json();
}

export async function fetchOpenRouterConfig() {
  const res = await fetch('/api/openrouter/config');
  return res.json();
}

export async function saveOpenRouterConfig(apiKey, model) {
  const res = await fetch('/api/openrouter/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model })
  });
  return res.json();
}

export async function dispatchGenesisTask(prompt, assignedTo = 'Antigravity') {
  const res = await fetch('/api/genesis/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, assignedTo })
  });
  return res.json();
}

export async function chatGenesis({ messages, currentPreview, engine, model }) {
  const res = await fetch('/api/genesis/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, currentPreview, engine, model })
  });
  return res.json();
}

export async function checkGenesisTaskStatus() {
  const res = await fetch('/api/genesis/task-status');
  return res.json();
}

export async function scaffoldGenesis(genesisPayload) {
  const res = await fetch('/api/genesis/scaffold', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genesisPayload })
  });
  return res.json();
}

export async function rescanUiux() {
  const res = await fetch('/api/uiux/rescan', { method: 'POST' });
  return res.json();
}

export async function createStory(storyData) {
  const res = await fetch('/api/stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(storyData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al crear tarea/historia');
  }
  return res.json();
}

export async function dispatchStoryTask(storyId, assignedTo = 'Antigravity') {
  const res = await fetch('/api/stories/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId, assignedTo })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al despachar orden al agente');
  }
  return res.json();
}

export async function reverseEngineerProject(config = {}) {
  const res = await fetch('/api/sdd/reverse-engineer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al ejecutar ingeniería inversa con IA');
  }
  return res.json();
}

export async function syncMultiIdeRules() {
  const res = await fetch('/api/sdd/sync-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al sincronizar reglas Multi-IDE');
  }
  return res.json();
}

export async function auditConvergence() {
  const res = await fetch('/api/sdd/converge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al auditar convergencia');
  }
  return res.json();
}

export async function togglePrinciple(togglePrincipleId) {
  return patchSdd({ togglePrincipleId });
}

