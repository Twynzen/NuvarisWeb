# Configurar Claude Code Action en GitHub

Esta guia explica como configurar Claude Code para que responda automaticamente en PRs e issues cuando mencionas @claude.

## Requisitos

- Tener Claude Max (para usar OAuth token)
- Ser admin del repositorio

## Pasos

### 1. Instalar la App de Claude en GitHub

Ve a: https://github.com/apps/claude

Click en "Install" y selecciona el repositorio NuvarisWeb.

### 2. Generar el Token OAuth

En tu terminal local, ejecuta:

```bash
claude setup-token
```

Esto abrira el navegador para autenticarte. Copia el token que te muestra.

### 3. Agregar el Secret en GitHub

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (pestaña arriba)
3. En el menu izquierdo: **Secrets and variables** > **Actions**
4. Click en **New repository secret**
5. Name: `CLAUDE_CODE_OAUTH_TOKEN`
6. Secret: pega el token que copiaste
7. Click en **Add secret**

### 4. Archivo de Workflow

El archivo ya esta creado en `.github/workflows/claude.yml`:

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
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - name: Run Claude Code
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

### 5. Hacer Push

```bash
git add .github/workflows/claude.yml
git commit -m "feat: add Claude Code Action workflow"
git push
```

## Como Usar

Una vez configurado, puedes mencionar `@claude` en:

- Comentarios de Issues
- Comentarios de Pull Requests
- Reviews de codigo

Claude respondera automaticamente con analisis, sugerencias o codigo.

## Troubleshooting

### Error: Failed to access repository

- Verifica que la app de Claude este instalada en el repo
- Ve a https://github.com/apps/claude y reinstala si es necesario

### Error: API key is required

- Asegurate de usar `CLAUDE_CODE_OAUTH_TOKEN` (no `ANTHROPIC_API_KEY`)
- Verifica que el secret este bien configurado en GitHub

### El workflow no se ejecuta

- Verifica que el archivo este en `.github/workflows/claude.yml`
- Asegurate de mencionar `@claude` en el comentario
