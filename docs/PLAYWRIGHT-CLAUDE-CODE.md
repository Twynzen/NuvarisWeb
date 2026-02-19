# Playwright MCP Integration for Claude Code

Universal guide for integrating Playwright browser automation into any Claude Code project.
Enables Claude to visually verify UI changes, take screenshots, interact with web apps, and debug rendering issues autonomously.

---

## 1. Install the Playwright MCP Server

Add the Playwright MCP server to your Claude Code configuration.

### Option A: Project-level (recommended for teams)

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-playwright@latest"]
    }
  }
}
```

### Option B: Global user-level

Run this in your terminal:

```bash
claude mcp add playwright -- npx @anthropic-ai/mcp-playwright@latest
```

This adds the server to `~/.claude.json` and makes it available in all projects.

### Verify Installation

After restarting Claude Code, ask Claude to navigate to any URL. If Playwright isn't installed, Claude can call `browser_install` to set it up automatically.

---

## 2. Add Visual Verification to CLAUDE.md

Add this section to your project's `CLAUDE.md` so Claude knows when and how to use Playwright:

```markdown
## Visual Verification Workflow
After ANY visual/rendering change:
1. Use Playwright MCP to navigate to localhost:<PORT>
2. Take a screenshot with browser_take_screenshot
3. Check browser console for errors with browser_console_messages
4. Iterate until visually correct

## MCP Servers Available
- Playwright: browser automation, screenshots, console reading
```

Replace `<PORT>` with your dev server port (e.g., 4200 for Angular, 3000 for Next.js, 5173 for Vite).

---

## 3. Available Playwright Tools

### Navigation & Page State

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `browser_navigate` | Go to a URL | Navigate to `http://localhost:3000` |
| `browser_navigate_back` | Go back in history | Return to previous page |
| `browser_snapshot` | Get accessibility tree (best for finding elements) | Identify clickable elements by ref |
| `browser_take_screenshot` | Capture visual state as PNG | Verify UI after changes |
| `browser_console_messages` | Read browser console logs | Check for errors/warnings |
| `browser_network_requests` | View all network requests | Debug API calls |

### Interaction

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `browser_click` | Click an element by ref | Click buttons, links, cards |
| `browser_type` | Type text into an input | Fill search fields, forms |
| `browser_fill_form` | Fill multiple form fields at once | Complete login forms |
| `browser_select_option` | Select dropdown option | Choose from select menus |
| `browser_press_key` | Press keyboard key | Press Enter, Escape, arrow keys |
| `browser_hover` | Hover over element | Trigger tooltips, hover states |
| `browser_drag` | Drag and drop | Reorder items, drag sliders |
| `browser_file_upload` | Upload files | Test file upload inputs |

### Advanced

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `browser_run_code` | Execute custom Playwright code | Complex interactions, hold keys |
| `browser_evaluate` | Run JavaScript on the page | Read JS variables, call functions |
| `browser_wait_for` | Wait for text/condition | Wait for loading to complete |
| `browser_tabs` | Manage browser tabs | Open new tab, switch tabs |
| `browser_resize` | Resize browser window | Test responsive layouts |
| `browser_handle_dialog` | Accept/dismiss dialogs | Handle alert/confirm/prompt |
| `browser_close` | Close the browser | Clean up when done |

---

## 4. Workflow Patterns

### Pattern 1: Visual Verification After Code Changes

This is the most common pattern. After modifying UI code, verify it visually.

```
Claude's workflow:
1. Edit the code (component, styles, etc.)
2. browser_navigate → localhost:PORT
3. browser_take_screenshot → inspect the result
4. If wrong → edit code → screenshot again
5. If correct → report to user
```

**CLAUDE.md snippet:**
```markdown
## Visual Verification Workflow
After ANY visual/rendering change:
1. Navigate to localhost:4200
2. Take a screenshot to verify the result
3. Check browser console for errors
4. Iterate until visually correct
```

### Pattern 2: Interactive Testing (Games, SPAs)

For apps requiring user interaction (clicking, typing, keyboard input).

```
Claude's workflow:
1. browser_navigate → app URL
2. browser_snapshot → get element refs
3. browser_click → interact with UI elements
4. browser_run_code → for complex input (hold keys, sequences)
5. browser_take_screenshot → verify state
```

**Example - Game testing with keyboard input:**
```javascript
// Using browser_run_code for holding keys
async (page) => {
  await page.keyboard.down('w');        // Start moving
  await page.waitForTimeout(2000);      // Hold for 2 seconds
  await page.keyboard.up('w');          // Stop
  await page.waitForTimeout(500);       // Wait for state to settle
}
```

### Pattern 3: Form & API Testing

For testing forms, authentication flows, API interactions.

```
Claude's workflow:
1. browser_navigate → form page
2. browser_snapshot → identify form fields
3. browser_fill_form → fill all fields at once
4. browser_click → submit
5. browser_wait_for → wait for response
6. browser_take_screenshot → verify result
7. browser_console_messages → check for errors
```

### Pattern 4: Responsive Design Testing

```
Claude's workflow:
1. browser_navigate → page
2. browser_resize → { width: 375, height: 812 }   // Mobile
3. browser_take_screenshot → verify mobile layout
4. browser_resize → { width: 768, height: 1024 }   // Tablet
5. browser_take_screenshot → verify tablet layout
6. browser_resize → { width: 1920, height: 1080 }  // Desktop
7. browser_take_screenshot → verify desktop layout
```

### Pattern 5: Debugging Runtime Errors

```
Claude's workflow:
1. browser_navigate → page with issue
2. browser_console_messages(level: "error") → get errors
3. browser_network_requests → check failed requests
4. browser_evaluate → inspect DOM/JS state
5. Fix the code based on findings
```

---

## 5. Key Techniques

### Finding Elements: Snapshot First, Then Act

Always use `browser_snapshot` before clicking. It returns an accessibility tree with `ref` attributes that you use for interactions:

```yaml
# Snapshot output example:
- button "Submit" [ref=e42]: Submit
- textbox "Email" [ref=e38]
- link "Sign Up" [ref=e45]
```

Then use the ref: `browser_click(ref: "e42", element: "Submit button")`

### Screenshots vs Snapshots

- **`browser_take_screenshot`**: Returns a visual PNG image. Use for verifying visual appearance (colors, layout, rendering).
- **`browser_snapshot`**: Returns accessibility tree as text. Use for finding interactive elements and their refs. Faster and more reliable for automation.

**Rule of thumb:** Snapshot to find elements, screenshot to verify visuals.

### Complex Keyboard Interactions

Use `browser_run_code` for anything beyond simple key presses:

```javascript
// Hold multiple keys
async (page) => {
  await page.keyboard.down('Shift');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.up('Shift');
}

// Type with delays (triggers key handlers)
async (page) => {
  await page.locator('#search').pressSequentially('hello', { delay: 100 });
}
```

### Reading Page JavaScript State

Use `browser_evaluate` to inspect runtime state:

```javascript
// Read a global variable
() => { return window.__APP_STATE__; }

// Get computed styles
(element) => { return getComputedStyle(element).color; }

// Check framework state (e.g., Angular)
() => {
  const el = document.querySelector('app-root');
  return el?.__ngContext__ ? 'Angular loaded' : 'Not loaded';
}
```

### Waiting for Dynamic Content

```
browser_wait_for(text: "Loading complete")     // Wait for text to appear
browser_wait_for(textGone: "Loading...")        // Wait for text to disappear
browser_wait_for(time: 2)                      // Wait 2 seconds
```

---

## 6. Framework-Specific Tips

### Angular
```markdown
- Dev server: `ng serve` (port 4200)
- Wait for: "Angular is running in development mode" in console
- Components render async; add browser_wait_for(time: 1) after navigation
```

### React / Next.js
```markdown
- Dev server: `npm run dev` (port 3000)
- Wait for hydration before interacting
- Use browser_wait_for(textGone: "Loading") for Suspense boundaries
```

### Vue / Nuxt
```markdown
- Dev server: `npm run dev` (port 5173 Vite / 3000 Nuxt)
- Components mount async; snapshot after brief wait
```

### Three.js / WebGL / Canvas Games
```markdown
- Add `preserveDrawingBuffer: true` to WebGLRenderer for screenshots to work
- Canvas content is NOT in the accessibility snapshot; use screenshots only
- Use browser_console_messages to check for WebGL errors
- Use browser_run_code for game input (keyboard hold, mouse drag)
```

**Important:** Without `preserveDrawingBuffer: true`, canvas screenshots will be blank/black.

---

## 7. Troubleshooting

### Browser not installed
Claude will get an error about missing browser. Fix:
```
Call browser_install tool - it auto-downloads Chromium
```

### Screenshots are black/blank for Canvas/WebGL
Add to your renderer initialization:
```javascript
new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
// or for plain canvas:
canvas.getContext('webgl', { preserveDrawingBuffer: true });
```

### Elements not found in snapshot
- Page may still be loading. Use `browser_wait_for` first.
- Content may be inside Shadow DOM or iframes.
- For canvas-based apps, elements won't appear in snapshot; use screenshots.

### Interactions not working
- Always click on the game canvas first to give it focus before keyboard input.
- Use `browser_run_code` for complex interactions that need precise timing.
- Check that the ref from snapshot is still valid (page may have re-rendered).

### Dev server not running
Claude cannot start your dev server inside Playwright. Start it in a separate terminal first:
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run Claude Code
claude
```

---

## 8. Complete CLAUDE.md Template

Copy this into any project's `CLAUDE.md` to enable Playwright integration:

```markdown
## Visual Verification Workflow
After ANY visual/rendering change:
1. Use Playwright MCP to navigate to localhost:<PORT>
2. Take a screenshot with browser_take_screenshot
3. Check browser console for errors with browser_console_messages
4. Iterate until visually correct

## MCP Servers Available
- Playwright: browser automation, screenshots, console reading
```

For canvas/WebGL projects, add:
```markdown
## Renderer Requirements
- WebGLRenderer must use `preserveDrawingBuffer: true` for Playwright screenshots
- Canvas elements won't appear in browser_snapshot; use browser_take_screenshot
- Use browser_run_code for game input (keyboard holds, mouse drags)
```

---

## 9. MCP Config Reference

### Minimal `.mcp.json`
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-playwright@latest"]
    }
  }
}
```

### With additional MCP servers (example)
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-playwright@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/context7-mcp@latest"]
    }
  }
}
```

Place this file at your project root. Claude Code detects it automatically on startup.
