// SDD Studio — Utilities & Helpers

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showToast(msg, icon = 'check-circle-2') {
  const t = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  if (!t || !toastText) return;

  toastText.innerText = msg;
  t.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    t.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
  }, 2500);
}

export function formatMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  // Code blocks
  html = html.replace(/```(?:[a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (m, code) => {
    return `<pre class="my-2 p-3 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-zinc-800"><code>${code.trim()}</code></pre>`;
  });
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-200">$1</code>');
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black text-zinc-950">$1</strong>');
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-black text-purple-950 uppercase tracking-wider mt-3 mb-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-purple-600"></span>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-black text-zinc-950 mt-3 mb-1.5">$1</h3>');
  // Bullet points
  html = html.replace(/^(?:•|-|\*)\s+(.*$)/gim, '<div class="flex items-start gap-2 my-1 text-zinc-700"><span class="text-purple-600 mt-1 text-[10px] font-bold">●</span><span>$1</span></div>');
  // Paragraphs
  html = html.replace(/\n\n/g, '<div class="h-2"></div>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

export async function copyTextToClipboard(text, successMsg = 'Copiado al portapapeles') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg, 'check-circle-2');
  } catch (err) {
    console.error('Clipboard copy error:', err);
    showToast('Error al copiar', 'alert-circle');
  }
}
