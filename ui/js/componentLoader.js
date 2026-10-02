// SDD Studio — Declarative Asynchronous Component Loader

/**
 * Loads all elements with `data-component="path/to/component.html"` attribute.
 * Fetches the component HTML and replaces the placeholder node with the component markup.
 * Recursively resolves nested components if any.
 */
export async function loadComponents() {
  let placeholders = Array.from(document.querySelectorAll('[data-component]'));
  let iterations = 0;
  const maxIterations = 5;

  while (placeholders.length > 0 && iterations < maxIterations) {
    iterations++;
    await Promise.all(
      placeholders.map(async (el) => {
        const componentPath = el.getAttribute('data-component');
        if (!componentPath) return;

        try {
          const res = await fetch(componentPath);
          if (!res.ok) {
            throw new Error(`Failed to load component: ${componentPath} (Status: ${res.status})`);
          }
          const html = await res.text();
          
          // Replace placeholder with the loaded HTML
          const temp = document.createElement('div');
          temp.innerHTML = html.trim();
          
          if (temp.firstElementChild && temp.children.length === 1) {
            el.replaceWith(temp.firstElementChild);
          } else {
            const frag = document.createDocumentFragment();
            while (temp.firstChild) {
              frag.appendChild(temp.firstChild);
            }
            el.replaceWith(frag);
          }
        } catch (err) {
          console.error(`Error loading component [${componentPath}]:`, err);
          el.innerHTML = `<div class="p-2 text-rose-500 text-xs">Error cargando componente: ${componentPath}</div>`;
        }
      })
    );

    // Check for any newly introduced components
    placeholders = Array.from(document.querySelectorAll('[data-component]'));
  }
}
