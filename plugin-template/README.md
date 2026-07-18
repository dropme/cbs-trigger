# Triggerd plugin template

A minimal starting point for a Triggerd plugin — one CommonJS module, **no build step**.

## Files
- `manifest.json` — id, name, version, and `apiVersion` (the host API version you target).
- `index.js` — the plugin. The app evaluates it with `(module, exports, host, React)` and calls
  `activate(host)`. Build UI with `React.createElement` so you share the host's React instance.
- `jsconfig.json` — turns on JS type-checking against `../triggerd-plugin.d.ts` for full
  autocomplete + errors in your editor.

## Develop
1. Point Triggerd at this folder: **Settings → Plugins → add a plugin folder**.
2. Edit `index.js`.
3. **Settings → Plugins → Reload plugins** to apply changes without relaunching the app.

## Types
The full host surface is documented in `../triggerd-plugin.d.ts`. Reference it from JS with JSDoc:

```js
/** @param {import('../triggerd-plugin').PluginHost} host */
function activate(host) { /* host.transport, host.vars, host.lighting, host.timecode, … */ }
```

## What `host` gives you (v5)
- `registerNodeType / registerCommand / registerTransportControl`
- `midi`, `osc`, `http`, `mixer.fade`
- `transport` (go/stop/pause/resume/panic/blackout/goto) — drive the show
- `vars` — read/write the show variables (shared with the Variable/Condition nodes)
- `lighting` — Art-Net/DMX out; `timecode` — incoming MTC
- `audio`, `files`, `playback`, `keyboard`, `nodes`, `storage`, `state`, `ui.toast`
- Node types can own a `layer` (visual/text) — the node's layer index + composition transform apply.

Deactivate cleanup: if your plugin adds raw listeners (`host.keyboard.onKey`, `host.midi.onMessage`,
subscriptions), dispose them in an optional `deactivate()` so hot-reload stays clean.
