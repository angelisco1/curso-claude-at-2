---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: [pista opcional sobre el tipo o el alcance]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

## Contexto

- Estado actual: !`git status --short`
- Cambios (staged y unstaged; sin commits previos solo se muestra lo que está en staging): !`git diff HEAD 2>/dev/null || git diff --cached`
- Rama actual: !`git branch --show-current`
- Últimos commits (para seguir el estilo del repositorio; vacío si aún no hay ninguno): !`git log --oneline -10 2>/dev/null || echo "(sin commits todavía)"`

## Tarea

Crea un único commit con los cambios actuales siguiendo **Conventional Commits 1.0.0**.
Pista del usuario (opcional): $ARGUMENTS

### Formato

```
<tipo>(<alcance opcional>)<!>: <descripción>

<cuerpo opcional>

<pie opcional>
```

### Tipos permitidos

- `feat`: nueva funcionalidad
- `fix`: corrección de un error
- `docs`: solo documentación
- `style`: formato que no afecta al significado del código (espacios, comas, etc.)
- `refactor`: cambio de código que no corrige un error ni añade funcionalidad
- `perf`: mejora de rendimiento
- `test`: añadir o corregir tests
- `build`: sistema de build o dependencias
- `ci`: configuración de integración continua
- `chore`: tareas de mantenimiento que no tocan `src` ni tests
- `revert`: revierte un commit anterior

### Reglas

1. Elige el tipo que mejor describa el cambio principal. Si los cambios mezclan propósitos
   distintos, propón dividirlos en varios commits y pregunta antes de continuar.
2. El alcance es opcional; úsalo si aporta claridad (por ejemplo `vendehumos`, `db`, `errorHandler`).
3. La descripción va en minúscula, en modo imperativo, sin punto final y con un máximo de 72 caracteres
   en la primera línea.
4. Usa el cuerpo solo si el "por qué" no es evidente; sepáralo de la primera línea con una línea en blanco.
5. Si hay un cambio incompatible, añade `!` tras el tipo/alcance y un pie `BREAKING CHANGE: <explicación>`.
6. Añade al final del mensaje cualquier línea de atribución (`Co-Authored-By`) que esté configurada para la sesión.

### Pasos

1. Si no hay cambios, díselo al usuario y detente.
2. Si no hay nada en staging, añade con `git add` los archivos relevantes por nombre
   (nunca `git add -A` ni `git add .`, y nunca archivos de secretos como `.env` o bases de datos como `data/*.db`).
3. Redacta el mensaje y ejecuta `git commit` pasando el mensaje con un HEREDOC.
4. Ejecuta `git status` para confirmar el resultado y muestra al usuario el mensaje del commit.

### Restricciones

- No hagas `git push`.
- No uses `--amend`, `--no-verify` ni modifiques la configuración de git.
- Si un hook de pre-commit falla, corrige el problema y crea un commit nuevo; no lo saltes.
