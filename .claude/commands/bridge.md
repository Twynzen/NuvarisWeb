# Bridge Sendell Personal ↔ Claude Code (NuvarisWeb) — Modo Escucha Autonomo

Eres el procesador autonomo del bridge entre Sendell Personal (Docker) y Claude Code (host) para el proyecto NuvarisWeb.
Al ejecutar este comando, entras en **modo escucha continuo**: vigilas el bridge esperando tareas de Sendell, las procesas cuando llegan, y vuelves a escuchar.

**IMPORTANTE**: Este es un modo AUTONOMO. Las tareas ya fueron aprobadas por Daniel cuando se las pidio a Sendell. NO pidas confirmacion para ejecutar tareas. Ejecutalas directamente.

## Configuracion del bridge

Este bridge usa un directorio EXTERNO (en el workspace de Sendell Personal):
- **Bridge dir**: `C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris`
- **Notify script**: `C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/scripts/bridge/notify.ts`
- **Bridge name**: nuvaris

## MODO ESCUCHA — Loop principal

Repite este ciclo indefinidamente hasta que Daniel te interrumpa:

### 1. Mostrar estado

Imprime:
```
🔗 Bridge NuvarisWeb en modo escucha... (Ctrl+C para salir)
```

### 2. Esperar tarea (polling sin tokens)

Ejecuta este comando Bash con timeout de 600 segundos (10 minutos). Esto NO gasta tokens — es solo bash esperando:

```bash
BRIDGE="C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris"; for i in $(seq 1 20); do p=$(cat "$BRIDGE/status.json" 2>/dev/null | grep -o '"pending_tasks": [0-9]*' | grep -o '[0-9]*'); f=$(ls "$BRIDGE/inbox/"task-*.json 2>/dev/null | wc -l); if [ "$p" -gt 0 ] 2>/dev/null || [ "$f" -gt 0 ]; then echo "TASK_FOUND"; exit 0; fi; sleep 30; done; echo "TIMEOUT"
```

- Si retorna `TASK_FOUND`: continua al paso 3
- Si retorna `TIMEOUT`: imprime `⏳ 10 min sin tareas... sigo escuchando` y VUELVE al paso 2

### 3. Procesar tareas pendientes

Busca archivos en `C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris/inbox/task-*.json`.
Lee cada uno. Muestra:

```
📥 Tarea recibida: {id}
   Tipo: {type} | Titulo: {title}
   Procesando...
```

Para cada tarea, primero **normaliza los campos** (Sendell a veces usa nombres alternativos):
- Si tiene `taskId` pero no `id` → usa `taskId` como `id`
- Si tiene `notifyChannel` o `requestedBy` pero no `origin` → inferir origin (ej: "WhatsApp" → "whatsapp", "Discord" → "discord")
- Si no tiene `bridge` → inferirlo del directorio: bridge-nuvaris/ = "nuvaris"
- Si `context` es un objeto → convertirlo a string descriptivo
- Si no tiene `targets` → usar `["."]`
- Si no tiene `constraints` → usar `[]`

Luego:

1. **Validar tipo**: Solo aceptar: code-edit, file-create, git-operation, analysis, config-update, screenshot. Rechazar docker-operation (no hay Docker en este proyecto) y otros.
2. **Ejecutar directamente segun tipo** (SIN pedir confirmacion):
   - `analysis` — Lee archivos target, analiza, reporta hallazgos
   - `code-edit` — Lee archivo, aplica los cambios descritos
   - `file-create` — Crea el archivo descrito
   - `git-operation` — Ejecuta la operacion git solicitada. Commits: SI. Push: SOLO si la tarea lo pide explicitamente.
   - `config-update` — Lee config actual, aplica cambios
   - `screenshot` — Captura screenshot usando Playwright MCP tools (browser_navigate + browser_take_screenshot). Si MCP no esta disponible, usa un script de Playwright directo. Guarda la imagen en `C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris/media/screenshot-{taskId}.png`. Incluye `mediaFiles` en el resultado. **Lee `docs/PLAYWRIGHT-CLAUDE-CODE.md` para referencia de herramientas disponibles.**

**NO preguntes "quieres que proceda?" ni "estas seguro?". La tarea ya fue aprobada por Daniel via Sendell. Ejecutala.**

### 4. Escribir resultado

Crea el archivo de resultado en el bridge dir:
`C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris/outbox/result-{taskId}.json`

```json
{
  "taskId": "task-ID",
  "from": "claude-code",
  "timestamp": "ISO-8601",
  "status": "completed",
  "bridge": "nuvaris",
  "origin": "(copiar el campo origin de la tarea original)",
  "summary": "Resumen breve",
  "filesModified": [],
  "mediaFiles": [],
  "details": "Descripcion detallada",
  "errors": []
}
```

**IMPORTANTE**: Copiar el campo `origin` de la tarea original al resultado. Esto permite que la notificacion sepa a que canal de Discord responder.

Si la tarea es tipo `screenshot`, incluir el nombre del archivo en `mediaFiles` (ej: `["screenshot-task-20260216-030.png"]`). El archivo debe estar en `C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris/media/`.

### 5. Archivar y actualizar

1. Mueve tarea de inbox/ a archive/:
   ```bash
   mv "C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris/inbox/task-{id}.json" "C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris/archive/"
   ```
2. Actualiza status.json: decrementa pending_tasks, actualiza last_result_at

### 6. Notificar a Sendell Personal

Despues de escribir el resultado, notifica a Sendell via RPC:

```bash
cd "C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/scripts/bridge" && npx tsx notify.ts --task-id {task-id} --bridge-dir "C:/Users/Daniel/Desktop/Daniel/sendell-platform/sendell-platform/instances/personal/workspace/bridge-nuvaris"
```

Si falla la notificacion, NO es critico — Sendell puede leer outbox/ directamente.

### 7. Volver a escuchar

Muestra:
```
✅ task-{id}: completada — {summary}
🔗 Volviendo a modo escucha...
```

**VUELVE al paso 2** para seguir escuchando.

## Unica restriccion de seguridad

- NUNCA modificar archivos .env o sendell.json (contienen tokens sensibles)
- Todo lo demas: ejecutar directamente segun la tarea
