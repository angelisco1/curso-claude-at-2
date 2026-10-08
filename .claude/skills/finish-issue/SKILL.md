---
name: finish-issue
description: Recibe el número de una issue ya implementada con implement-issue y deja su PR lista para revisión. Comprueba que no quede nada por mergear desde las ramas de área ni desde la rama base, ejecuta los tests y los builds de todas las áreas, verifica los criterios de aceptación con el agente acceptance-verifier, los marca en el plan, sube la rama y crea la PR o la pasa a lista para revisión. Úsala cuando se pida terminar, cerrar o preparar la PR de una issue.
argument-hint: <número-de-issue>
---

# finish-issue

Número de la issue cuya PR hay que terminar: $ARGUMENTS

## 0. Comprobaciones previas

1. Comprueba que `$ARGUMENTS` es un número de issue (se acepta con `#` delante; quítalo). Si falta, pídelo y **no continúes**.
2. Comprueba que `gh` está autenticado (`gh auth status`). Si no, pide al usuario que ejecute `! gh auth login` y detente.
3. Localiza el worktree de la issue con `git worktree list`. Por convención está en `.claude/worktrees/issue-<numero>`, con la rama `<tipo>/<numero>-<descripcion>`, que se llama `<rama-feature>` en el resto de esta skill.
   - Si no existe el worktree pero sí la rama, pregunta si crear el worktree a partir de ella.
   - Si no hay ninguna de las dos, detente y sugiere la skill `implement-issue`.
4. Todo se hace **dentro de ese worktree**. No toques el checkout principal.
5. Localiza el plan (`docs/plans/<numero>-<tipo>-<descripcion>.md`) y, si existe, el contrato (`docs/plans/<numero>-contrato-api-<descripcion>.md`).

## 1. Comprobar que no falta nada por mergear

Muestra al usuario una tabla con el resultado de cada comprobación:

1. **Cambios sin commitear** (`git status --short`). Sepáralos en dos grupos:
   - Ruido local que no va en la PR: `*.db`, `dist/`, `.angular/`, `node_modules/` y el `"analytics": false` de `angular.json`. No se commitea ni se borra; solo se menciona.
   - Cualquier otra cosa: pregunta al usuario qué hacer antes de seguir.
2. **Ramas de área** `<rama-feature>--<area>`: para cada una, `git log --oneline <rama-feature>..<rama-feature>--<area>`. Si alguna tiene commits pendientes, propón integrarlos como en `implement-issue` (`merge --no-ff` con el mensaje `chore(<area>): merge <area> tasks for #<numero>`) y espera confirmación.
3. **Worktrees de área** que sigan vivos (`.claude/worktrees/issue-<numero>-<area>`): avisa si alguno tiene cambios sin commitear.
4. **Remoto**: `git fetch origin` y `git rev-list --left-right --count <rama-feature>...origin/<rama-feature>` (si existe). Si hay commits remotos que no están en local, no sigas sin preguntar.
5. **Rama base** (`development`, si no `main`, si no `master`): `git rev-list --count <rama-feature>..origin/<base>`. Si hay commits nuevos, propón mergearlos en la rama de la feature (`git merge origin/<base>`), resolviendo conflictos con el usuario. Nunca hagas rebase de una rama ya publicada.
6. **Tareas del plan**: lista las que sigan sin marcar en "Plan de implementación". Si queda alguna, pregunta si se implementa ahora (con `implement-issue`) o si se deja fuera de la PR.

## 2. Tests y builds

Desde la raíz del worktree, con `NG_CLI_ANALYTICS=false CI=true`:

| Área | Tests | Build |
|---|---|---|
| api | `npm test -w @resttek/api` | — |
| web-admin | `cd packages/web-admin && npx ng test --watch=false` | `npx ng build` |
| web-clientes | ídem en `packages/web-clientes` | ídem |
| web-empleados | ídem en `packages/web-empleados` | ídem |

- Ejecuta **todas** las áreas, no solo las que tocó la issue: así se detectan roturas indirectas, por ejemplo de `web-shared`.
- Comprueba antes los scripts reales de cada `package.json`.
- Si algo falla, **no** marques nada ni toques la PR. Muestra el error y propón arreglarlo con el ciclo TDD de `implement-issue` (un commit por arreglo).
- Muestra una tabla con el número de tests y el resultado del build de cada área.

## 3. Verificar los criterios de aceptación

1. Lanza el agente `acceptance-verifier` (`Agent`, `subagent_type: acceptance-verifier`) con la ruta absoluta del worktree, del plan y del contrato.
2. Muestra su tabla al usuario.
3. Si algún criterio sale ⚠️ o ❌, no lo marques. Pregunta al usuario si se cubre ahora (con un test nuevo y TDD), si se acepta tal cual o si se deja fuera de la PR.
4. Marca como `[x]` en la sección "Criterios de aceptación" del plan solo los criterios ✅ o los que el usuario haya aceptado expresamente. Marca también el que dice que la suite pasa si el paso 2 salió en verde.
5. Haz commit solo del plan: `docs(plans): mark acceptance criteria as verified for #<numero>`, con las líneas de atribución de la sesión.

## 4. Subir y preparar la PR

1. `git push` (o `git push -u origin <rama-feature>` si aún no tiene upstream). Nunca uses `--force`.
2. Busca la PR: `gh pr list --head <rama-feature> --state all --json number,state,isDraft,url`.
   - **No existe**: créala contra la rama base con `gh pr create`, con este cuerpo:
     - Resumen de la funcionalidad (sacado de "Contexto" y "Alcance" del plan).
     - Cambios por área.
     - La tabla de tests y builds del paso 2.
     - La tabla de criterios del paso 3.
     - Enlaces al plan y al contrato.
     - `Closes #<numero>`.
     - Las líneas de atribución de la sesión para PRs.
   - **Existe y es draft**: `gh pr ready <numero-pr>`.
   - **Existe y ya está lista**: no hagas nada más que avisar.
   - **Está cerrada o mergeada**: avisa y detente.
3. Comprueba el estado de la PR: `gh pr view <numero-pr> --json mergeable,statusCheckRollup`. Informa de los checks (por ejemplo `claude-review`) y de si hay conflictos.

## 5. Cierre

1. Resume al usuario: URL de la PR, commits nuevos de esta sesión, resultado de los tests y los criterios, y el ruido local que ha quedado sin commitear.
2. **No** mergees la PR, no cierres la issue y no borres ramas ni worktrees. Indica cómo hacerlo cuando la PR se mergee:

   ```bash
   git worktree remove .claude/worktrees/issue-<numero>
   git branch -d <rama-feature> <rama-feature>--<area> ...
   ```
