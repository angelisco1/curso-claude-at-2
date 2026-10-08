# Prompt para cada agente de área

Rellena los campos entre `<...>` y pásalo como `prompt` al agente (`api-developer` o `web-developer`). Las reglas de trabajo (TDD, commits, contrato) ya están en la definición del agente en `.claude/agents/`; aquí solo van los datos de esta issue.

Copia las tareas y los criterios **literalmente** del plan: el agente no ve la issue ni esta conversación.

---

Vas a implementar las tareas del área `<area>` del plan de la issue #<numero> (<titulo-de-la-issue>).

## Dónde trabajas

- Worktree (ruta absoluta): `<ruta-absoluta-al-worktree>`
- Rama: `<tipo>/<numero>-<descripcion>--<area>` (ya creada y activa en ese worktree)
- Paquete: `packages/<area>`

## Tus tareas (en este orden)

<lista literal de las tareas del plan asignadas a esta área>

## Criterios de aceptación y casos borde relevantes

<criterios y casos borde del plan que afectan a esta área>

## Contrato con la api

- Fichero: `docs/plans/<numero>-contrato-api-<descripcion>.md` (<"ya existe, versión X" | "lo crea el agente api" | "no aplica">)
- Puntos de partida del plan: <sección "Modelo de datos / contratos" del plan, o "ninguno">
- Agentes con los que te coordinas por `SendMessage`: <por ejemplo "api" para una web; "web-admin, web-clientes" para la api; "ninguno">

## Cómo ejecutar los tests

`<comando de tests del área>`

## Atribución de los commits

Termina cada mensaje de commit con: <líneas de atribución de la sesión, o "ninguna">
