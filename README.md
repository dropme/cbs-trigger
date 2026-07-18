# Triggerd

A desktop app (Electron + React) for building and running **live shows** as a visual node
graph. Wire audio, video, MIDI, lighting and control cues together, decide how the playhead
advances between them (a key press, an automatic delay, a beat, incoming timecode…), and drive
the whole thing live — with the picture mirrored to a second display for the audience.

Triggerd started as a sound-cue player and grew into a general show-control tool for
performances, theatre, installations, etc. It ships with a portable Web Audio engine
and an optional native **JUCE audio sidecar** for pro features (VST3 plugins, mixer buses,
low-latency ASIO, recording).
## Features

**Show builder**
- **Node-graph editor** (React Flow): drop cues on a canvas and wire them together. Connections
  carry the logic — how and *when* the next cue fires (wait-for-key, autoplay after a delay, on a
  beat/bar, on timecode) — so a show can branch, loop, and run parallel lanes.
- **~27 node kinds**: audio cues, MIDI/instrument cues, pad banks, keyboard splits, video/image/
  text/camera visuals, go-to, set-lists, groups, repeats, waits, delays, fades, OSC/HTTP, DMX
  lighting, variables/conditions, and more.
- **Save/load** projects as JSON (versioned, auto-migrated); **undo/redo**, templates,
  drag-and-drop media import, and a pre-show readiness **Check**.

**Audio**
- **Two engines, one interface**: a portable Web Audio engine, or a native **JUCE C++ sidecar**
  for VST3 instrument/effect hosting, mixer **buses** (volume/pan/5-band EQ/FX inserts/routing/
  ducking), a master limiter with LUFS metering, hardware-input routing, a metronome, and WAV
  **recording**.
- **Per-cue & per-bus pan**, **monitor/PFL** pre-listen, **gapless & beat-synced** cue launch,
  and **offline export** of a cue chain to one WAV or to per-bus stems.

**Visuals** (mirrored to a second display)
- **Multi-layer compositing** (8 layers) with per-layer transform, colour grading, blend modes,
  and **chroma key** (green-screen).
- **Ten transitions** (cut/fade/slide/wipe/zoom), **text & lyrics** overlays with outline/shadow,
  **SRT/VTT subtitles**, **camera** input, and **screen/window capture** (mirror slides or any app).

**MIDI & show control**
- MIDI in/out (notes, CC, clock/tempo), **MIDI Show Control** (in + out), **MTC timecode** chase
  and generation, **OSC** over UDP, **Art-Net/DMX** lighting, and a phone-friendly **LAN web remote**.

**Live operation**
- **Play** and **Show** modes, a **cue list**, on-deck monitor, master meter, blackout,
  and a fullscreen **presentation** window on a chosen display.

**Extensible & localized**
- A trusted in-process **plugin** system (new node kinds, commands, UI) — see the
  [plugin guide](docs/plugin-developer-guide.md) and [tutorials](docs/plugin-tutorials.html).
- Localized in **English** and **Spanish**.

