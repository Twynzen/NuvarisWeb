# Configurar Claude Code Action en GitHub

Esta guía explica cómo configurar Claude Code para que responda automáticamente en PRs e issues cuando mencionas @claude.

**Esta guía funciona para cualquier proyecto de GitHub** - solo ajusta el nombre del repositorio según tu proyecto.

## Requisitos

- Tener Claude Max (para usar OAuth token)
- Ser admin del repositorio
- Repositorio en GitHub (público o privado)

## Pasos de Configuración

### 1. Instalar la App de Claude en GitHub

Ve a: https://github.com/apps/claude

1. Click en "Install"
2. Selecciona tu repositorio (ej: `tu-usuario/tu-repo`)
3. Acepta los permisos

### 2. Generar el Token OAuth

En tu terminal local, ejecuta:

```bash
claude setup-token
```

Esto abrirá el navegador para autenticarte. Copia el token que te muestra.

### 3. Agregar el Secret en GitHub

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (pestaña arriba)
3. En el menú izquierdo: **Secrets and variables** > **Actions**
4. Click en **New repository secret**
5. Name: `CLAUDE_CODE_OAUTH_TOKEN`
6. Secret: pega el token que copiaste
7. Click en **Add secret**

### 4. Configurar la Rama Default

**IMPORTANTE**: El workflow solo funciona en la rama DEFAULT del repositorio.

1. Ve a **Settings** > **General**
2. En "Default branch", selecciona tu rama principal (ej: `main`, `development`)
3. Guarda los cambios

### 5. Crear el Archivo de Workflow

Crea el archivo `.github/workflows/claude.yml` con este contenido:

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  pull_request:
    types: [opened, synchronize]

jobs:
  claude:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Claude Code
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          show_full_output: true
```

### 6. Hacer Commit y Push

```bash
git add .github/workflows/claude.yml
git commit -m "feat: add Claude Code Action workflow"
git push
```

**Espera 1-2 minutos** para que GitHub detecte el nuevo workflow.

---

## Cómo Usar Claude Code

### Triggers Disponibles

Puedes mencionar `@claude` en:

- **Comentarios de Issues**: Crea un comentario con `@claude` + tu solicitud
- **Comentarios de Pull Requests**: Mismo formato
- **Reviews de código**: Comenta en líneas específicas

### ✅ Buenos Prompts (Específicos y Acotados)

Claude funciona mejor con tareas **concretas y pequeñas**:

```
@claude lista la estructura de carpetas del proyecto y explica qué hace cada una
```

```
@claude revisa el archivo README.md y actualízalo con la información que falte
```

```
@claude crea un documento que explique la arquitectura del módulo de autenticación
```

```
@claude lee src/services/api.ts y documenta sus métodos principales
```

```
@claude agrega tests unitarios para la función calculateTotal() en utils/math.ts
```

### ❌ Malos Prompts (Muy Amplios)

Evita prompts vagos o demasiado amplios:

```
@claude documenta todo el proyecto
```

```
@claude evalúa el software y dame un repaso completo
```

```
@claude arregla todos los bugs
```

**Por qué fallan**: Claude no sabe por dónde empezar, puede quedarse "pensando" sin producir resultados, o el workflow excederá el timeout.

### 💡 Regla de Oro

**Si una tarea te tomaría más de 30 minutos, divídela en subtareas más pequeñas.**

---

## Troubleshooting

### Error: `Could not fetch an OIDC token`

```
Failed to setup GitHub token: Error: Could not fetch an OIDC token.
Did you remember to add `id-token: write` to your workflow permissions?
```

**Solución**: Agrega `id-token: write` a los permisos:

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
  id-token: write  # <-- Agregar esto
```

### Error: `fatal: not a git repository`

```
error: Command failed: git fetch origin development --depth=1
fatal: not a git repository (or any of the parent directories): .git
```

**Solución**: Falta el paso de checkout. Agrega antes del paso de Claude:

```yaml
steps:
  - name: Checkout repository
    uses: actions/checkout@v4
    with:
      fetch-depth: 0

  - name: Run Claude Code
    uses: anthropics/claude-code-action@v1
    # ...
```

### Error: Claude no puede hacer push

```
Branch claude/issue-X does not exist remotely
```

**Solución**: Cambia `contents: read` a `contents: write`:

```yaml
permissions:
  contents: write  # <-- Debe ser "write" no "read"
  pull-requests: write
  issues: write
  id-token: write
```

### El workflow se queda colgado (1+ hora)

**Causa**: Prompt demasiado amplio o tarea muy grande.

**Solución**:
1. Cancela el workflow en Actions
2. Agrega `timeout-minutes: 30` al job:
   ```yaml
   jobs:
     claude:
       timeout-minutes: 30  # <-- Agregar esto
   ```
3. Usa prompts más específicos

### El workflow no se ejecuta

**Posibles causas**:

1. **Workflow no está en la rama default**
   - Verifica en Settings > General > Default branch
   - El workflow DEBE estar en esa rama

2. **No mencionaste @claude correctamente**
   - Debe ser exactamente `@claude` (minúsculas)
   - Debe estar en un COMENTARIO nuevo (no en el body del issue)

3. **La app de Claude no está instalada**
   - Ve a https://github.com/apps/claude
   - Verifica que esté instalada en tu repo

### Error: Failed to access repository

**Solución**:
- Verifica que la app de Claude esté instalada en el repo
- Ve a https://github.com/apps/claude y reinstala si es necesario

### Error: API key is required

**Solución**:
- Asegúrate de usar `CLAUDE_CODE_OAUTH_TOKEN` (no `ANTHROPIC_API_KEY`)
- Verifica que el secret esté bien configurado en GitHub

### Ver qué está haciendo Claude

Si quieres ver el output completo en los logs:

```yaml
- name: Run Claude Code
  uses: anthropics/claude-code-action@v1
  with:
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    show_full_output: true  # <-- Agrega esto
```

---

## Workflow Completo (Copia y Pega)

Si quieres empezar desde cero, usa este workflow completo probado y funcional:

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  pull_request:
    types: [opened, synchronize]

jobs:
  claude:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Claude Code
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          show_full_output: true
```

---

## Ejemplo Completo de Uso

### 1. Crear un Issue

**Título**: "Documentar estructura del proyecto"

**Descripción**:
```
@claude Por favor genera un documento con:

1. Lista de todas las carpetas principales del proyecto
2. Breve explicación (1-2 líneas) de qué contiene cada carpeta
3. Arquitectura general

El documento debe llamarse ARCHITECTURE.md en la raíz del proyecto.
```

### 2. Claude Responde

Claude:
- Creará un comentario con checkboxes de progreso
- Generará el archivo ARCHITECTURE.md
- Hará commit y push
- Te dará un link para crear el PR

### 3. Revisar y Mergear

- Revisa el PR generado
- Si está correcto, haz merge a tu rama principal
- ¡Listo!

---

## Notas Importantes

- **Solo comentarios NUEVOS**: Los comentarios agregados ANTES de configurar el workflow no dispararán la acción
- **Rama default**: El workflow SOLO funciona si está en la rama default del repositorio
- **GitHub Actions temporales**: Los commits que Claude no puede pushear se pierden cuando termina el workflow
- **Permisos**: `contents: write` es necesario para que Claude pueda crear branches y hacer push

---

## Referencias

- [Claude Code Action - Repositorio Oficial](https://github.com/anthropics/claude-code-action)
- [Documentación Oficial](https://docs.claude.com/en/docs/claude-code/github-actions)
- [Issue #721 - OIDC Token Fix](https://github.com/anthropics/claude-code-action/issues/721)

---

*Guía actualizada: 2025-12-29*
*Probada y funcional en proyectos reales*
