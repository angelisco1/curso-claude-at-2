---
name: new-feature
description: Recibe el número de una issue de GitHub, la lee con gh, crea una rama de trabajo a partir de development (o main/master si no existe), redacta un plan por tareas pequeñas en docs/plans, lo publica como comentario en la issue. Úsala cuando se pida planificar una issue (nueva funcionalidad, corrección o refactor).
argument-hint: <número-de-issue>
---

# new-feature

Número de la issue a planificar: $ARGUMENTS

## 0. Leer la issue

1. Comprueba que `$ARGUMENTS` es un número de issue (se acepta también con `#` delante, por ejemplo `#42`; quítalo antes de usarlo). Si está vacío o no es un número, pide al usuario el número de la issue y no continúes hasta tenerlo.
2. Comprueba que `gh` está disponible y autenticado (`gh auth status`). Si no lo está, pide al usuario que ejecute `! gh auth login` y detente.
3. Lee la issue con sus comentarios:

   ```bash
   gh issue view <numero> --json number,title,body,author,labels,state,url,comments
   ```

   - Si la issue no existe, avisa al usuario y detente.
   - Si la issue está cerrada (`state: CLOSED`), avisa al usuario y pregunta si quiere continuar igualmente.
4. Usa el título, la descripción, las etiquetas y **todos los comentarios** como fuente de requisitos. Los comentarios pueden matizar o cambiar lo pedido en la descripción.
5. Si la issue es ambigua o le falta información imprescindible para planificar, pregunta al usuario antes de continuar.

## 1. Crear la rama

1. Deduce el `<tipo>` de la tarea a partir de la issue (etiquetas y contenido): `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, etc. (mismos tipos que Conventional Commits).
2. Deduce una `<descripcion>` corta en kebab-case a partir del título de la issue (por ejemplo `anadir-filtro-por-canal`), sin tildes ni espacios.
3. El nombre de la rama es `<tipo>/<numero>-<descripcion>` (por ejemplo `feat/42-anadir-filtro-por-canal`).
4. Elige la rama base (haz antes `git fetch origin`):
   - Si existe `development` (`git rev-parse --verify --quiet development`, o `origin/development`), úsala como base.
   - Si no existe, usa `main`, y si tampoco existe, `master`.
5. Crea la rama desde la base: `git switch -c <tipo>/<numero>-<descripcion> <base>`.
   - Si hay cambios sin commitear que puedan interferir, avisa al usuario antes de cambiar de rama; no los descartes.
   - Si la rama ya existe, avisa al usuario en lugar de sobrescribirla.

## 2. Crear el plan

Guarda el plan en `docs/plans/<numero>-<tipo>-<descripcion>.md` (crea la carpeta si no existe). El plan se escribe en español y tiene la estructura definida en `assets/TEMPLATE.md`.

Rellena la cabecera con los datos reales de la issue:

- **Issue**: `[#<numero>](<url>)`.
- **Autor de la issue**: `@<author.login>`.
- **Etiquetas**: las etiquetas de la issue (o `—` si no tiene).
- **Fecha**: la fecha de hoy.

Reglas para las tareas:

- Cada tarea debe poder implementarse en **5-10 minutos como máximo**. Si es más grande, divídela.
- Cada tarea describe un único cambio verificable, indicando el test que lo cubre y los ficheros que toca.
- Ordénalas para que el proyecto funcione tras cada una.
- Respeta la arquitectura del proyecto (`docs/arquitectura/`) y las convenciones de `CLAUDE.md`. En la api, los dominios por capas van `routes` → `controllers` → `services` → `repositories` → `config/database.ts`. En las webs, cada feature va en `features/<feature>/{models,services,store,pages}`.
- Antes de escribir el plan, explora el código relevante para que las tareas sean realistas.
- **Agrupa las tareas por área** del monorepo (`api`, `web-admin`, `web-clientes`, `web-empleados`, `web-shared`), con un subapartado por área que indique su comando de tests. Así `implement-issue` puede repartirlas entre agentes. Si una tarea toca dos áreas, divídela.
- Si la issue toca la api y alguna web, rellena el apartado "Contrato API ⇄ webs" del diseño técnico: endpoints, roles, payloads, modelo y errores con su código HTTP. Es el punto de partida del contrato que fija el agente `api` durante la implementación.
- Cada criterio de aceptación debe poder comprobarse con un test. El último criterio es siempre que los tests y los builds de todas las áreas pasan.
- Los criterios de aceptación deben cubrir todo lo que pide la issue (incluidos sus comentarios).

Muestra el plan al usuario y espera su confirmación. Si pide cambios, aplícalos al fichero y vuelve a mostrarlo.

## 3. Publicar el plan en la issue

Cuando el usuario confirme el plan, publícalo como comentario en la issue usando el propio fichero como cuerpo (así se evitan problemas de escapado):

```bash
gh issue comment <numero> --body-file docs/plans/<numero>-<tipo>-<descripcion>.md
```

- Muestra al usuario la URL del comentario que devuelve `gh`.
- Si el comando falla (permisos, red, etc.), muestra el error al usuario y pregúntale si quiere continuar con la implementación sin publicar el plan.
- Si más adelante el plan cambia de forma relevante, publica un nuevo comentario indicando qué ha cambiado; no edites comentarios antiguos.


## 4. Siguiente paso

No implementes nada desde esta skill. Cuando el plan esté publicado, indícale al usuario cómo sigue el flujo:

1. `implement-issue <numero>`: implementa el plan con TDD en un worktree, con un agente por área si hace falta.
2. `finish-issue <numero>`: comprueba que no falte nada por mergear, ejecuta tests y builds, verifica los criterios de aceptación y deja la PR lista para revisión.
