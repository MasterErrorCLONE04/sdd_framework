# ⚡ SDD Studio & CLI (`@sdd/cli`)

> **Spec-Driven Development Studio:** El workbench local, visual y gobernado para ingeniería de software entre humanos y agentes de Inteligencia Artificial (Antigravity, Cursor, Windsurf, Claude Code, Copilot).

---

## 🚀 ¿Qué es SDD Studio?

**SDD Studio** es una herramienta **cero-dependencias invasivas (Zero-Pollution)** que se ejecuta en cualquier proyecto de software (Node.js, Python, Go, Rust, Java, PHP) o en una **carpeta completamente vacía** desde cero.

A diferencia de Jira o Linear (que viven aislados en la nube y los agentes de IA ignoran o destruyen), SDD vive **dentro del repositorio** en archivos JSON atómicos (`.sdd/`) y un archivo de gobierno formal (`AGENTS.md`).

---

## 📦 Instalación y Uso Rápido

No requieres instalar dependencias en tu proyecto. Solo necesitas Node.js (>= 18):

```bash
# Modo 1: Ejecutar directamente vía NPX
npx @sdd/cli studio

# O instalar globalmente si lo prefieres
npm install -g @sdd/cli
sdd studio
```

---

## 🎯 Los Dos Modos de Uso

### 1. En una carpeta vacía ("Greenfield" — De la idea al código)
```bash
mkdir mi-nuevo-proyecto
cd mi-nuevo-proyecto
sdd init
```
1. Genera la estructura canónica `.sdd/` y el archivo de gobierno `AGENTS.md`.
2. Inicia el servidor en `http://localhost:3030` y abre el navegador.
3. Te guía en la fase **💡 Discovery**: respondes preguntas de negocio, usuarios y Non-Goals.
4. Desbloquea las **Compuertas de Calidad** y genera tus primeras historias Gherkin.
5. El agente de IA ya puede empezar a programar con límites protegidos.

---

### 2. En un proyecto existente ("Brownfield" — Ingeniería Inversa)
```bash
cd mi-proyecto-existente
sdd init --scan
# o simplemente:
sdd scan
```
1. El escáner de código analiza el repositorio en profundidad:
   - Framework y lenguaje (Next.js, FastAPI, Go, Express, Vite, etc.).
   - Modelos de base de datos (Prisma, SQL, Drizzle).
   - Rutas y controladores de API.
   - Servicios de infraestructura en Docker Compose.
2. Genera la arquitectura y los flujos preliminares marcados con la etiqueta **`[INFERIDO]`**.
3. Abres `sdd studio` y con 1 click confirmas o ajustas las especificaciones a **`[CONFIRMADO]`**.
4. Activa el **Escudo de Deriva (Scope Shield)** para que ningún agente modifique archivos fuera de alcance.

---

## 🎛️ Las 12 Perspectivas del Studio

| Perspectiva | Función |
| :--- | :--- |
| **🧭 1. Núcleo & Compuertas** | Perfil, Non-Goals explícitos y 5 compuertas de calidad obligatorias antes de programar. |
| **💡 2. Discovery & Hipótesis** | Entrevistas guiadas de problema, usuario, monetización y restricciones con persistencia en disco. |
| **📋 3. Historias (Gherkin)** | Historias de usuario atómicas (`Dado-Cuando-Entonces`) con lista blanca de archivos `scopeFiles`. |
| **🔄 4. Secuencias & Estados (UML)** | Visualizador de swimlanes entre actores y servicios por cada flujo + Máquinas de Estado (FSM) con exportador Mermaid. |
| **⚡ 5. Flujos & Pipelines** | Procesos de negocio por pasos con tareas atómicas mutables en tiempo real. |
| **🏗️ 6. Arquitectura (C4)** | Mapa de contenedores y servicios con salud y tecnologías detectadas. |
| **🗄️ 7. Modelo ERD (DB)** | Esquema relacional con tablas, claves primarias y tipos de datos. |
| **🛡️ 8. Roles & Riesgos** | Matriz de permisos RBAC y registro de riesgos con semáforo de mitigación. |
| **🧪 9. Plan QA** | Suites de pruebas E2E, unitarias y de integración con pasos detallados. |
| **🔍 10. Deriva Git** | Auditoría en vivo de `git status` vs `scopeFiles` (Scope Shield). |
| **🎨 11. Catálogo UI/UX** | Registro de pantallas y estados de diseño de la aplicación. |
| **📋 12. Kanban Sprint** | Tablero visual de 3 columnas (To Do, In Progress, Done) sincronizado. |

---

## 🤖 ¿Cómo interactúan los Agentes de IA?

Cuando un agente (Cursor, Windsurf, Claude Code, Antigravity) abre el proyecto, lee automáticamente **`AGENTS.md`**:

```markdown
# Protocolo SDD
0. Compuertas de Calidad: No programar si las compuertas están bloqueadas.
1. Lectura Previa: Consultar la historia activa en .sdd/requirements/stories/<US-ID>.json.
2. Aislamiento de Alcance: Modificar ÚNICAMENTE los archivos listados en scopeFiles.
3. Criterios Gherkin: Verificar cada criterio y marcar "done": true en disco.
4. Actualización Atómica: Cambiar estado a "done" y firmar en assignedTo.
```

---

## 🛠️ Comandos CLI

* `sdd` o `sdd studio [--port 3030]`: Inicia el microservidor y el Studio visual.
* `sdd init [--scan]`: Inicializa `.sdd/` y `AGENTS.md` en el directorio actual.
* `sdd scan`: Ejecuta el análisis de código fuente y actualiza la arquitectura en disco.
* `sdd drift`: Audita el estado de Git contra los archivos declarados y muestra el score de deriva.

---

Licencia MIT © SDD Team
