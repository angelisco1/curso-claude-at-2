---
name: implement-issue
description: Recibe el número de una issue de GitHub, lee el plan de implementación publicado en sus comentarios y lo implementa con TDD estricto dentro de un git worktree, haciendo un commit por cada tarea completada. Si el plan afecta a varias áreas independientes (por ejemplo api y una web), reparte el trabajo entre varios agentes, cada uno en su propio worktree. Úsala cuando se pida implementar el plan de una issue.
argument-hint: <número-de-issue>
---

# implement-issue

Número de la issue cuyo plan hay que implementar: $ARGUMENTS

## 0. Comprobaciones previas

1. Comprueba que `$ARGUMENTS` es un número de issue (se acepta con `#` delante, por ejemplo `#42`; quítalo antes de usarlo). Si está vacío o no es un número, pide al usuario el número de la issue y **no continúes** hasta tenerlo.
2. Comprueba que `gh` está disponible y autenticado (`gh auth status`). Si no lo está, pide al usuario que ejecute `! gh auth login` y detente.
3. Comprueba que estás en la raíz del repositorio principal (`git rev-parse --show-toplevel`) y anota el estado (`git status --short`). No descartes ni muevas cambios del usuario.

## 1. Leer la issue y localizar el plan

1. Lee la issue con todos sus comentarios:

   ```bash
   gh issue view <numero> --json number,title,body,state,url,labels,comments
   ```

   - Si la issue no existe, avisa al usuario y detente.
   - Si está cerrada (`state: CLOSED`), avisa y pregunta si quiere continuar igualmente.
2. Busca el plan en los **comentarios** de la issue. Es el comentario que contiene una sección `Plan de implementación` con una lista de tareas en formato checkbox (`- [ ]` / `1. [ ]`), normalmente con la estructura de `.claude/skills/new-feature/assets/TEMPLATE.md`.
   - Si hay varios comentarios con plan, usa el **más reciente** y ten en cuenta los comentarios posteriores que lo modifiquen ("cambios al plan", correcciones, etc.).
   - Si no hay ningún plan, díselo al usuario y detente: sugiere generarlo antes con la skill `new-feature`. No improvises un plan por tu cuenta.
3. Extrae del plan:
   - La lista ordenada de tareas (sección "Plan de implementación").
   - Los criterios de aceptación, casos borde y archivos afectados: son la referencia para escribir los tests.
   - Las tareas ya marcadas (`[x]`): se consideran hechas y no se repiten, pero verifica que su código existe en la rama base.
4. Si alguna tarea es ambigua o demasiado grande (más de 5-10 minutos), propón dividirla y confírmalo con el usuario antes de empezar.

## 2. Decidir el reparto: uno o varios agentes

Agrupa las tareas por **área** del monorepo según los ficheros que tocan:

| Área | Ruta | Tests |
|---|---|---|
| `api` | `packages/api` | `npm test -w @resttek/api` (vitest) |
| `web-admin` | `packages/web-admin` | `npx ng test` desde el paquete (si hay specs) |
| `web-clientes` | `packages/web-clientes` | ídem |
| `web-empleados` | `packages/web-empleados` | ídem |
| `web-shared` | `packages/web-shared` | según su configuración |

Comprueba los scripts reales de cada `package.json` antes de dar por buenos estos comandos.

- **Un solo agente** (tú mismo): si todas las tareas pertenecen a una misma área, o si el plan es pequeño y muy secuencial.
- **Varios agentes**: si hay tareas de **dos o más áreas** que pueden avanzar de forma independiente. Habrá un agente por área.
  - Si un área depende de otra (por ejemplo, la web consume un endpoint nuevo de la api), las tareas que fijan el contrato (tipos en `web-shared`, forma de la respuesta) van primero. O bien se implementan antes de lanzar al resto, o bien el agente dependiente trabaja contra el contrato descrito en el plan.
  - Las tareas transversales que tocan varias áreas a la vez las haces tú (orquestador) en el worktree principal, antes o después de los agentes según el orden del plan.

Muestra al usuario el reparto (área → tareas → agente) y el nombre de las ramas y worktrees que vas a crear, y espera su confirmación.

## 3. Crear el worktree principal

1. Deduce `<tipo>` (Conventional Commits: `feat`, `fix`, `refactor`…) y una `<descripcion>` corta en kebab-case sin tildes a partir del título de la issue o del plan.
2. Rama de la feature: `<tipo>/<numero>-<descripcion>`. Si ya existe (por ejemplo, la creó `new-feature`), **reutilízala**; si no, créala.
3. Rama base: `development` si existe (local u `origin/development`), si no `main`, y si no `master`. Haz `git fetch origin` antes.
4. Crea el worktree principal en `.claude/worktrees/issue-<numero>`:

   ```bash
   # rama nueva
   git worktree add -b <tipo>/<numero>-<descripcion> .claude/worktrees/issue-<numero> <base>
   # rama existente
   git worktree add .claude/worktrees/issue-<numero> <tipo>/<numero>-<descripcion>
   ```

   - Si el worktree ya existe, avisa al usuario y pregunta si continuar en él (retomar) en lugar de recrearlo.
   - Nunca uses `--force` ni borres worktrees o ramas existentes sin permiso.
5. A partir de aquí **todo el trabajo se hace dentro del worktree** (usa rutas absolutas o `git -C <worktree>`). No modifiques el checkout principal.
6. Instala dependencias en el worktree (`npm install` en su raíz) y ejecuta la suite de tests de las áreas afectadas para confirmar que se parte de verde. Si ya hay tests en rojo antes de empezar, avisa al usuario antes de continuar.
7. Guarda una copia del plan en `docs/plans/<numero>-<tipo>-<descripcion>.md` dentro del worktree (si no existe ya) y haz el primer commit: `docs(plans): add plan for #<numero>`. Este fichero es donde se marca el progreso.

## 4. Implementar con TDD estricto

### 4.1 Ciclo por tarea (lo sigue cada agente, incluido tú)

Para **cada** tarea, en el orden del plan, sin saltarte ningún paso:

1. **Red**: escribe primero el test que describe el comportamiento esperado (a partir de los criterios de aceptación y casos borde del plan). Ejecútalo y comprueba que **falla por el motivo correcto** (no por un error de sintaxis o un import roto). Si pasa sin código nuevo, el test no sirve: corrígelo.
2. **Green**: escribe el **mínimo** código de producción para que ese test pase. Nada más.
3. **Refactor**: limpia código y tests manteniendo todo en verde.
4. Ejecuta la **suite completa** del área y comprueba que todo pasa.
5. **Commit de la tarea**: un commit por tarea completada, siguiendo Conventional Commits (mismas reglas que el comando `commit`):

   ```
   <tipo>(<area>): <descripción de la tarea en imperativo>

   Refs #<numero>
   ```

   - Añade los ficheros **por nombre** (nunca `git add -A` ni `git add .`); nunca bases de datos (`*.db`), `.env` ni `node_modules`.
   - El commit incluye el test y el código de esa tarea, juntos.
   - Termina el mensaje con las líneas de atribución configuradas para la sesión, si las hay.
   - No uses `--amend` ni `--no-verify`. Si un hook falla, corrige y crea el commit de nuevo.
6. Marca la tarea como hecha en el plan (`[ ]` → `[x]`):
   - **Modo un agente**: inclúyelo en el mismo commit de la tarea.
   - **Modo varios agentes**: los agentes **no** tocan el fichero del plan (evita conflictos); lo marca el orquestador al integrar (ver 4.3).

Reglas:

- No escribas código de producción sin un test en rojo que lo justifique.
- No pases a la siguiente tarea con la suite en rojo ni sin haber hecho el commit de la anterior.
- Los tests no tocan la base de datos real: usa `DB_PATH` apuntando a una base temporal o `:memory:`.
- Si un área no tiene infraestructura de tests, la primera tarea de esa área es prepararla (con el runner que ya use el paquete, sin añadir dependencias innecesarias).
- El código, los tests y los mensajes de commit se escriben en inglés; el plan y los mensajes al usuario, en español.
- Si descubres que el plan es incorrecto o incompleto, para y consulta al usuario en vez de desviarte.

### 4.2 Modo varios agentes: un worktree por agente

Por cada área con agente propio:

1. Crea una rama y un worktree propios **a partir de la rama de la feature** (en su estado actual, con los commits previos ya incluidos):

   ```bash
   git -C .claude/worktrees/issue-<numero> worktree add \
     -b <tipo>/<numero>-<descripcion>--<area> \
     ../issue-<numero>-<area> <tipo>/<numero>-<descripcion>
   ```

   Resultado: worktree en `.claude/worktrees/issue-<numero>-<area>` y rama `<tipo>/<numero>-<descripcion>--<area>`.
2. Ejecuta `npm install` en ese worktree.
3. Lanza un subagente (`Agent`, tipo `general-purpose`) por área, **todos en el mismo mensaje** para que trabajen en paralelo. Construye su prompt con `assets/AGENT_PROMPT.md`, rellenando ruta absoluta del worktree, rama, área, número de issue, tareas asignadas (texto literal del plan), criterios de aceptación relevantes, contrato con otras áreas y comando de tests.
   - No uses `isolation: "worktree"` en la llamada: el worktree ya lo has creado tú desde la rama de la feature.
   - Cada agente trabaja **solo** en su worktree y **solo** en los ficheros de su área.
4. Espera a que terminen todos. Cada agente debe devolver: commits creados (hash + mensaje), tareas completadas, resultado de la suite y bloqueos.

### 4.3 Integración (orquestador)

1. Revisa el informe de cada agente y comprueba sus commits (`git -C <worktree-agente> log --oneline <rama-feature>..HEAD`). Debe haber un commit por tarea asignada.
2. En el worktree principal, integra cada rama de agente en la rama de la feature, en el orden de dependencias del plan:

   ```bash
   git -C .claude/worktrees/issue-<numero> merge --no-ff <tipo>/<numero>-<descripcion>--<area> \
     -m "chore(<area>): merge <area> tasks for #<numero>"
   ```

   - Si hay conflictos, resuélvelos respetando el plan; si no está claro cómo, pregunta al usuario.
3. Tras cada merge, ejecuta la suite completa de todas las áreas afectadas. Si algo falla, arréglalo con el mismo ciclo TDD y su propio commit.
4. Marca en el plan las tareas integradas y haz commit: `docs(plans): mark <area> tasks as done for #<numero>`.
5. Cuando todo esté integrado y en verde, elimina los worktrees de los agentes (`git worktree remove .claude/worktrees/issue-<numero>-<area>`). Conserva sus ramas hasta que el usuario decida.

## 5. Cierre

1. Ejecuta una última vez la suite completa de todas las áreas afectadas en el worktree principal.
2. Comprueba que se cumplen todos los criterios de aceptación del plan; si alguno no está cubierto, dilo.
3. Resume al usuario:
   - Ruta del worktree y nombre de la rama de la feature.
   - Lista de commits (`git log --oneline <base>..HEAD`).
   - Tareas completadas y pendientes, y resultado de los tests.
4. **No** hagas `git push`, no abras PR, no comentes en la issue ni la cierres sin que el usuario lo pida. Ofrécele hacerlo:
   - Push y PR: `git push -u origin <rama>` y `gh pr create --draft` con `Closes #<numero>` en la descripción.
   - Comentario de progreso en la issue con el plan actualizado: `gh issue comment <numero> --body-file docs/plans/<fichero>.md`.
5. No elimines el worktree principal: indícale al usuario cómo hacerlo cuando ya no lo necesite (`git worktree remove .claude/worktrees/issue-<numero>`).
