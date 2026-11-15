# Performance, fallback and offline operation (TLM-092)

- **Budget:** `pnpm perf:check` measures each built page's initial JavaScript (entry scripts plus static imports; lazy chunks such as
  TensorFlow.js excluded) and fails above 350,000 bytes. Current pages: about 226–292 KiB.
- **Offline:** `public/sw.js` (registered on every page) caches same-origin GET responses network-first; after one online visit the
  lessons load and run offline. Unsupported browsers simply run online. Nothing is sent anywhere by the worker.
- **Optional services offline:** no lesson depends on the API or tutor; the tutor panel falls back to authored hints.
- **Low-power:** browser-reported low memory/threads or Save-Data select a smaller bounded training plan and hide the GPU option.
- **Unsupported GPU/audio:** TensorFlow.js falls back to the CPU reference; audio lessons have visual transcripts.
- **Reference browsers in CI:** Chromium desktop and Pixel 5 emulation for all specs; Firefox for accessibility and lesson specs.
  WebKit/Safari and real low-end devices have not been tested.
