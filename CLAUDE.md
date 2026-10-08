# Resttek

Monorepo con npm workspaces: `packages/api` (Express + TypeScript + SQLite), `packages/web-admin`, `packages/web-clientes` y `packages/web-empleados` (Angular), y `packages/web-shared` (librería compartida). La arquitectura está en `docs/arquitectura/` y el dominio en `docs/dominio/`.

## Flujo de trabajo con issues

Toda issue se trabaja siempre con estas tres skills, en este orden:

1. **`new-feature <n>`**: lee la issue, crea la rama `<tipo>/<n>-<descripcion>` y escribe el plan en `docs/plans/<n>-<tipo>-<descripcion>.md`, con las tareas agrupadas por área y el contrato API ⇄ webs si hace falta. Lo publica como comentario en la issue tras la confirmación del usuario.
2. **`implement-issue <n>`**: implementa el plan con TDD estricto y un commit por tarea en el worktree `.claude/worktrees/issue-<n>`. Si hay varias áreas, lanza un agente por área (`api-developer`, `web-developer`), cada uno en su worktree y su rama `<rama>--<area>`, y luego las integra. El agente `api` es el único propietario del contrato `docs/plans/<n>-contrato-api-<descripcion>.md`; las webs le piden los cambios por mensaje.
3. **`finish-issue <n>`**: comprueba que no falte nada por mergear, ejecuta los tests y los builds de todas las áreas, verifica los criterios de aceptación con el agente `acceptance-verifier`, los marca en el plan y deja la PR lista para revisión.

Para commits sueltos, usa el comando `commit`.

## Convenciones

- Código, tests y mensajes de commit en inglés; planes, documentación y textos de la UI en español.
- Conventional Commits con el área como alcance (`feat(api): ...`, `fix(web-clientes): ...`) y `Refs #<n>` en el pie.
- Añade los ficheros por nombre. Nunca commitees `*.db`, `.env`, `dist/`, `.angular/` ni el `"analytics": false` de `angular.json`.
- Nada de push, PR, merge ni borrado de ramas o worktrees sin que el usuario lo pida.

## Comandos

| Área | Tests | Build |
|---|---|---|
| api | `npm test -w @resttek/api` | — |
| web-* | `npx ng test --watch=false` desde el paquete | `npx ng build` desde el paquete |
