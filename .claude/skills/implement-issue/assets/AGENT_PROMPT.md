# Prompt para cada agente de área

Rellena los campos entre `<...>` y pásalo como `prompt` al subagente. Copia las tareas y criterios **literalmente** del plan: el subagente no ve la issue ni esta conversación.

---

Vas a implementar parte del plan de la issue #<numero> (<titulo-de-la-issue>) del repositorio.

## Dónde trabajas

- Worktree (ruta absoluta): `<ruta-absoluta-al-worktree>`
- Rama: `<tipo>/<numero>-<descripcion>--<area>` (ya creada y activa en ese worktree)
- Área: `<area>` → solo puedes modificar ficheros dentro de `<ruta-del-paquete>`.

Ejecuta **todos** los comandos dentro de ese worktree (rutas absolutas o `cd <ruta-absoluta-al-worktree>` en cada comando). No toques el checkout principal ni otros worktrees. No cambies de rama. No hagas push, merge, rebase ni `--amend`.

## Tus tareas (en este orden)

<lista literal de tareas del plan asignadas a esta área>

## Criterios de aceptación y casos borde relevantes

<criterios y casos borde del plan que afectan a esta área>

## Contrato con otras áreas

<tipos, endpoints, payloads o componentes compartidos que debes respetar; "ninguno" si no aplica>

## Cómo ejecutar los tests

`<comando de tests del área>`

## Forma de trabajar: TDD estricto + un commit por tarea

Para cada tarea, sin saltarte ningún paso:

1. **Red**: escribe primero el test. Ejecútalo y comprueba que falla por el motivo correcto (no por sintaxis ni imports rotos).
2. **Green**: escribe el mínimo código de producción para que pase.
3. **Refactor**: limpia manteniendo todo en verde.
4. Ejecuta la suite completa del área: debe pasar entera.
5. Haz **un commit** con el test y el código de esa tarea:

   ```
   <tipo>(<area>): <descripción de la tarea en imperativo, en inglés>

   Refs #<numero>
   ```

   - Añade ficheros por nombre (nunca `git add -A` ni `git add .`); nunca `*.db`, `.env` ni `node_modules`.
   - Termina el mensaje con estas líneas de atribución: <líneas de atribución de la sesión, o "ninguna">
   - Si un hook falla, corrige y vuelve a hacer el commit; no uses `--no-verify`.

Reglas:

- Nada de código de producción sin un test en rojo que lo justifique.
- No empieces una tarea sin haber hecho el commit de la anterior con la suite en verde.
- No modifiques el fichero del plan en `docs/plans/`: lo actualiza el orquestador.
- Los tests no tocan la base de datos real (usa `DB_PATH` temporal o `:memory:`).
- Código, tests y commits en inglés.
- Si el plan es incorrecto, falta información o necesitas tocar ficheros de otra área, **para** y descríbelo en tu informe en lugar de improvisar.

## Informe final (en español)

Devuelve:

1. Lista de commits creados (hash corto + mensaje), uno por tarea.
2. Tareas completadas y tareas pendientes.
3. Salida resumida de la última ejecución de la suite.
4. Bloqueos, dudas o desviaciones respecto al plan.
