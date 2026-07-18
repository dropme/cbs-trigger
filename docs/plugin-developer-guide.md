# Triggerd — Plugin Developer Guide

Write a plugin to add your own **nodes**, **transport buttons**, **commands**, and on‑screen
**layers** (custom captions / subtitles / visuals) to the app — no build step, no framework setup.
A plugin is a single JavaScript file plus a small manifest.

> Plugins run **in‑process with full trust** — they are real code loaded into the app. Only install
> plugins you trust, the same way you would a browser extension or a VST.

> **New here?** Start with the step‑by‑step [plugin tutorials](plugin-tutorials.html) (open the HTML in
> a browser) — nine short lessons from a one‑line button to custom nodes, layers, and show automation.
> This guide is the reference.

---

## 1. Quick start

Create a folder for your plugin containing two files:

```
my-plugin/
  manifest.json
  index.js
```

**manifest.json**

```json
{
  "id": "com.example.myplugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "apiVersion": 1,
  "main": "index.js"
}
```

**index.js**

```js
// The app runs this file with (module, exports, host, React) in scope.
// Build UI with React.createElement (or host.React); talk to the app only through `host`.

module.exports = {
  id: 'com.example.myplugin',
  name: 'My Plugin',
  version: '1.0.0',
  apiVersion: 1,

  activate(host) {
    host.registerTransportControl({
      id: 'com.example.hello',
      label: '👋 Hi',
      run() {
        host.ui.toast('Hello from my plugin!')
      }
    })
  }
}
```

Put the folder in the plugins directory (below), restart the app, and your button appears in the
transport bar.

### Where plugins live

The app scans, at startup:

- `<userData>/plugins/` — the per‑user, writable location (survives app updates). On Windows this is
  `%APPDATA%/sound-pattern-player/plugins/`, on macOS `~/Library/Application Support/…`, on Linux
  `~/.config/…`.
- `<app>/plugins/` — a folder next to the app (handy in development).

Each subfolder with a valid `manifest.json` is one plugin. The host runs any plugin targeting its
`apiVersion` **or older**; a plugin built for a newer host is skipped. A plugin that throws is
isolated and never breaks the app or other plugins.

---

## 2. The plugin module

Export a default plugin object (either `module.exports = {…}` or `export default {…}`):

```ts
interface Plugin {
  id: string          // reverse-DNS recommended, e.g. "com.acme.strobe"
  name: string
  version: string
  apiVersion: number  // host runs plugins targeting this version or older (host is currently 5)
  activate(host: PluginHost): void | Promise<void>
  deactivate?(): void
}
```

`activate(host)` is where you register everything. `host` is the **only** surface you touch — a
stable façade over the app. It also carries the app's React instance (`host.React`), so your UI
shares the host's React and needs no bundler.

---

## 3. Host API reference

```ts
interface PluginHost {
  apiVersion: number
  React: typeof import('react')   // use this to build UI

  // --- contributions (each returns a Disposable; call .dispose() to unregister) ---
  registerNodeType(def: NodeTypeDefinition): Disposable
  registerCommand(def: CommandDef): Disposable
  registerTransportControl(def: TransportControlDef): Disposable

  // --- capabilities ---
  midi: {
    send(msg: MidiSend): void
    sendHex(hex: string): void            // raw / SysEx, e.g. "F0 7F 7F 02 01 01 F7"
    onMessage(cb: (m: { type: string; channel: number; number: number; value: number }) => void): Disposable
  }
  osc: {
    send(address: string, args: OscArg[]): void
    onMessage(cb: (msg: { address: string; args: (number | string)[] }) => void): Disposable
  }
  http: {   // (API v2+) HTTP from the app process — NO CORS.
    // Fire-and-forget:
    fire(opts: { url: string; method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: string; headers?: Record<string, string> }): void
    // (API v3+) awaited response — never rejects; a network error resolves as { ok:false, status:0 }:
    request(opts: { url: string; method?; body?; headers? }): Promise<{ ok: boolean; status: number; statusText: string; headers: Record<string, string>; body: string }>
  }
  mixer: {   // (API v4+)
    fade(target: 'master' | string, to: number, seconds: number, shape?: 'linear' | 'equalPower'): void  // to = 0..1
  }
  transport: {   // (API v5+) drive the show
    go(): void; stop(): void; pause(): void; resume(): void; panic(): void
    blackout(on?: boolean): void          // omit to toggle
    goto(cueName: string): boolean        // jump to the first cue with this name; true if found
  }
  vars: {   // (API v5+) the Variable / Condition node values
    get(name: string): number
    set(name: string, value: number): void
    all(): Record<string, number>
    subscribe(cb: (name: string, value: number) => void): Disposable
  }
  lighting: {   // (API v5+) Art-Net / DMX — needs Art-Net enabled in Settings → Lighting
    set(universe: number, channels: DmxChannel[], fadeMs?: number): void  // channels 1-based, 0..255
    blackout(fadeMs?: number): void
  }
  timecode: {   // (API v5+) incoming MIDI Time Code
    get(): PluginTimecode | null          // last position, or null if none/stale
    subscribe(cb: (tc: PluginTimecode) => void): Disposable
  }
  files: {
    pickAudio(): Promise<{ path: string; name: string } | null>
    pickFile(opts?: { extensions?: string[]; name?: string }): Promise<{ path: string; name: string } | null>
    read(path: string): Promise<ArrayBuffer>
    readText(path: string): Promise<string>   // UTF-8; great for subtitle / config files
  }
  playback: {
    getProgress(): { elapsed: number; duration: number }  // current clip/video position, SECONDS
    getElapsedMs(): number                                // ms since the show started (show clock)
  }
  audio: {   // fire sounds directly (samplers / pad banks / one-shots), off the playhead
    play(path: string, opts?: { volume?; fadeIn?; fadeOut?; trimStart?; trimEnd?; detune?; loop?; loopCount?; busId?; layer?; lane? }): void
    playSlice(path: string, start: number, end: number, opts?: { volume?; busId?; detune?; reverse?; chokeKey? }): void
    stop(lane: string): void   // stop a sound started with a matching `lane`
  }
  keyboard: {
    onKey(cb: (e: { key: string; code: string; repeat: boolean }) => void): Disposable  // skipped while typing
  }
  nodes: {
    ofType(kind: string): PluginNode[]   // your node instances in the current project
  }
  windows: {
    open(htmlPath: string, opts?: { width?: number; height?: number; title?: string }): void
    // NOTE: not yet implemented — reserved.
  }
  storage: {
    get<T>(key: string): T | null   // namespaced to your plugin id
    set(key: string, value: JsonValue): void
  }
  state: {
    get(): PublicState
    subscribe(cb: (s: PublicState, prev: PublicState) => void): Disposable
  }
  ui: {
    toast(message: string): void
  }
}

interface PublicState {
  status: 'idle' | 'playing' | 'waiting-key' | 'ended' | 'paused'
  playingCueNames: string[]
  nextCueNames: string[]
  blackout: boolean
  bpm: number
  buses: { id: string; name: string }[]   // output buses, for routing UI
}

interface MidiSend { type: 'program' | 'cc' | 'note'; channel: number; number: number; value: number }
interface OscArg  { type: 'i' | 'f' | 's'; value: number | string }
interface Disposable { dispose(): void }
```

> **Rehearsal mode:** MIDI/OSC that a node emits from its `onEnter` (via the `ctx`, below) is muted
> while the operator is in Rehearsal mode. Direct `host.midi` / `host.osc` calls are **not** muted.

---

## 4. Contributing a node type

The big one. A node type bundles its palette entry, default data, canvas card, inspector, runtime
behaviour, and (optionally) an on‑screen layer.

```ts
interface NodeTypeDefinition {
  id: string                         // unique kind id, namespaced e.g. "acme.strobe"
  category?: string                  // free-form grouping hint
  palette: { icon: string; label: string }   // icon shown in the canvas palette strip
  defaultData(): JsonObject          // fresh state for a new node
  card: Component<NodeCardProps>      // inner content of the canvas card (chrome + handles are provided)
  inspector?: Component<NodeInspectorProps>   // optional side-panel editor
  ports?: {
    input?: boolean            // default true
    output?: boolean           // single unnamed output (default true); ignored if `outputs` given
    outputs?: { id: string; label?: string }[]   // named outputs for a branch/flow node
  }
  route?(node: PluginNode, ctx: PlaybackContext): string | null   // pick an output id (branch)
  onEnter?(node: PluginNode, ctx: PlaybackContext): void | Promise<void>
  duration?(node: PluginNode): number | undefined  // node's own length in SECONDS (see below)
  layer?: { kind: 'visual' | 'text'; render: Component<LayerRenderProps> }
}
```

The node the plugin sees:

```ts
interface PluginNode {
  id: string
  kind: string
  name: string
  color: string | null
  tags: string[]
  operatorNote: string
  data: JsonObject          // your state — freely shaped, persisted with the project
}
```

Component props:

```ts
interface NodeCardProps { node: PluginNode; selected: boolean; playing: boolean; next: boolean }

interface NodeInspectorProps {
  node: PluginNode
  updateData(patch: JsonObject): void   // shallow-merges into node.data
  updateNode(patch: { name?; color?; tags?; operatorNote? }): void
  remove(): void
}

interface LayerRenderProps { node: PluginNode }

interface PlaybackContext {   // passed to onEnter
  sendMidi(msg: MidiSend): void
  sendMidiHex(hex: string): void
  sendOsc(address: string, args: OscArg[]): void
  playFile(path: string, opts?: { volume?: number; busId?: string | null; loop?: boolean }): void
  getState(): PublicState
  log(...args: unknown[]): void
  hold(): () => void   // (API v4+) hold this lane; call the returned release() to advance later
}
```

> **`ctx.hold()` (API v4+).** Call it **synchronously inside `onEnter`** to keep the playhead on your
> node instead of advancing; it returns a `release()` you call later (on your own event/timer) to
> advance along the node's output. Overrides `duration()`. This is how a plugin builds a "wait for X"
> node. Cleaned up automatically on stop/reset/panic.

### Behaviour notes

- **Pass‑through.** A node runs its `onEnter` side effects, then the playhead advances along its
  outgoing connection per that connection's trigger (auto‑advance or wait‑for‑key) — like the
  built‑in OSC / FX nodes. `onEnter` is fire‑and‑forget; it doesn't block the advance.
- **Branch / flow nodes (multiple outputs).** Declare `ports.outputs` (named handles) and a
  `route(node, ctx)` that returns which output id the playhead leaves by (or null to end) — like the
  built-in repeat's loop/done or a random branch (see the example plugin's Random branch). Keep any
  per-node counter for round-robin in your own storage, keyed by `node.id`.
- **Device nodes (triggered off the playhead).** A node doesn't have to run from the playhead. In
  `activate`, register global `host.midi.onMessage` / `host.keyboard.onKey` listeners that call
  `host.nodes.ofType('your.kind')` to find your node instances and `host.audio.playSlice(...)` to
  fire their samples — that's how a pad bank / sampler works (see the example plugin's Pad bank).
- **Duration (a node with its own length).** Return seconds from `duration(node)` to make the node
  *hold* the playhead for that long — like a clip — before advancing (great for a standalone
  subtitle track that runs, say, 90 minutes with no video). While it runs, the node's elapsed clock
  drives the transport progress bar and `host.playback.getProgress()`, freezes on Hold, and the node
  rests/holds its layer. Return 0 for an instant pass‑through.
- **The card** renders only the node's inner content. The app supplies the card frame and the
  input/output handles (per `ports`). Reuse the app's classes for a native look: `spp-node-head`,
  `spp-node-name`, `spp-node-file`.
- **The inspector** appears below the shared Name / Colour / Tags block. Reuse `spp-field`,
  `spp-file-row`, `spp-file-name`, `spp-hint-small`, `spp-mini`.
- **Persistence.** `node.data` is saved and loaded with the project. If a project opens before your
  plugin loads, the node keeps its kind + data and re‑renders as your node once it registers.

### On‑screen layers (captions / subtitles / visuals)

Add `layer` to own one of the app's layers. When the playhead enters your node it becomes the
current node for that layer (last‑wins, like the built‑in image/video and text nodes), and your
`render` component is drawn over the media — in the Play‑Mode preview **and** Show Mode — until
another node takes the layer. Use `text` for captions/subtitles, `visual` for a full‑bleed
background. The layer is full‑bleed and click‑through; position your content with absolute CSS.

To animate against time, read `host.playback` from your own `requestAnimationFrame` loop (see the
subtitle example below).

---

## 5. Other contributions

```ts
interface TransportControlDef {
  id: string
  label: string                 // button text (emoji ok)
  title?: string                // tooltip
  run(): void
  isActive?(): boolean          // live highlight
  when?: 'always' | 'running' | 'idle'   // show only while a show is running / idle
}

interface CommandDef { id: string; title: string; run(): void }
```

---

## 6. Complete example — a timed subtitle node

This picks an `.srt` file, parses it, owns the **text** layer, and shows the cue for the current
playback time. It's the template for any custom subtitle/caption format.

```js
/* global module, host, React */

function parseSrt(text) {
  var toSec = (h, m, s, ms) => +h * 3600 + +m * 60 + +s + +ms / 1000
  var cues = []
  String(text).replace(/\r/g, '').split(/\n\n+/).forEach((b) => {
    var lines = b.split('\n').filter((l) => l.trim() !== '')
    if (lines.length < 2) return
    var i = lines[0].indexOf('-->') >= 0 ? 0 : 1
    var m = /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/.exec(lines[i])
    if (!m) return
    cues.push({ start: toSec(m[1], m[2], m[3], m[4]), end: toSec(m[5], m[6], m[7], m[8]), text: lines.slice(i + 1).join('\n') })
  })
  return cues
}

function Card({ node }) {
  return React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'spp-node-head' },
      React.createElement('span', { className: 'spp-node-name' }, '📄 ' + (node.name || 'Subtitles'))),
    React.createElement('div', { className: 'spp-node-file' }, (node.data && node.data.name) || '(no file)'))
}

function Inspector({ node, updateData }) {
  return React.createElement('div', { className: 'spp-field' },
    React.createElement('span', null, 'Subtitle file'),
    React.createElement('div', { className: 'spp-file-row' },
      React.createElement('span', { className: 'spp-file-name' }, (node.data && node.data.name) || 'No file'),
      React.createElement('button', {
        onClick: async () => {
          var picked = await host.files.pickFile({ extensions: ['srt', 'vtt'], name: 'Subtitles' })
          if (!picked) return
          var text = await host.files.readText(picked.path)
          updateData({ path: picked.path, name: picked.name, cues: parseSrt(text) })
        }
      }, 'Load…')))
}

function Layer({ node }) {
  var cues = (node.data && node.data.cues) || []
  var [t, setT] = React.useState(0)
  React.useEffect(() => {
    var raf
    var tick = () => { setT(host.playback.getProgress().elapsed); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  var active = cues.find((c) => t >= c.start && t < c.end)
  if (!active) return null
  return React.createElement('div',
    { style: { position: 'absolute', left: 0, right: 0, bottom: '8%', textAlign: 'center' } },
    React.createElement('span',
      { style: { background: 'rgba(0,0,0,0.72)', color: '#fff', font: '500 3.6vmin system-ui', padding: '0.15em 0.5em', borderRadius: '0.25em', whiteSpace: 'pre-line' } },
      active.text))
}

module.exports = {
  id: 'com.example.subs', name: 'SRT Subtitles', version: '1.0.0', apiVersion: 1,
  activate(host) {
    host.registerNodeType({
      id: 'com.example.subs.node',
      palette: { icon: '📄', label: 'Subtitles' },
      defaultData: () => ({ path: '', name: '', cues: [] }),
      card: Card, inspector: Inspector,
      ports: { input: true, output: true },
      layer: { kind: 'text', render: Layer }
    })
  }
}
```

Timing note: `getProgress().elapsed` is the **current clip/video** position (resets per cue), which
matches how SRT files are authored against a video. For subtitles timed to the whole show, use
`host.playback.getElapsedMs()` instead.

---

## 7. Tips & gotchas

- **Use `host.React` / the `React` argument** for all UI. Don't bundle your own React — hooks would
  break across two copies.
- **No build step required.** Author `index.js` as plain CommonJS. `React.createElement` avoids
  needing JSX; if you prefer JSX, precompile it yourself and ship the output as `main`.
- **Namespace your ids** (`com.you.thing`) — node kinds, command ids, and transport ids are global.
- **Clean up** in `deactivate()` by disposing what `register*` / `on*` returned, if you keep them.
- **`apiVersion`**: set it to the lowest host version with the features you use (v1 baseline; **v2**
  added `host.http`; **v3** added `host.http.request`; **v4** added `host.mixer.fade` + `ctx.hold()`).
  The host runs plugins targeting its version or
  older, and logs + skips newer ones.
- **Errors are isolated** — a throw in your plugin is caught and logged (open DevTools with
  Ctrl/Cmd+Shift+I to see `[plugin]` messages); it won't crash the app.

A full, runnable reference plugin lives in `plugins/example-toolkit/` (Notify, Caption, and the SRT
subtitle node above).
