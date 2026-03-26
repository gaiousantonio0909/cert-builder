# cert-web-tool

> A certificate builder powered by GrapeJS — Image Background, CKEditor 4 text, shortcodes, columns layout, theming, and PDF export.

[![npm version](https://img.shields.io/npm/v/cert-web-tool.svg)](https://www.npmjs.com/package/cert-web-tool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/gaiousantonio0909/cert-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/gaiousantonio0909/cert-builder/actions/workflows/ci.yml)

---

## Features

- 🖼️ **Image Background** — Full-canvas background image with size controls and **file upload** (bring your own uploader — S3, Cloudinary, etc.)
- ✏️ **Rich Text** — Inline CKEditor 4 editing on double-click
- 🔖 **Shortcodes** — `{{name}}`, `{{date}}`, `{{course}}` tokens replaced at render time
- 📐 **Columns Layout** — 2, 3, 4-column and 1/3+2/3 blocks for proper text placement
- 🔄 **Orientation** — Switch between portrait and landscape from the sidebar or via options
- 🎨 **Theming** — Fully customisable colours; gray/white default replaces GrapesJS pink
- 📄 **PDF Export** — `exportPDF()` via `html2canvas` + `jsPDF`
- ⚛️ **React Adapter** — Drop-in `<CertBuilderReact>` component
- 🧩 **Vue 3 Adapter** — Drop-in `<CertBuilderVue>` component
- 📦 **Only `dist/` published** to npm

---

## Installation

```bash
# pnpm (recommended)
pnpm add cert-builder
pnpm add -D grapesjs html2canvas jspdf

# npm
npm install cert-builder grapesjs html2canvas jspdf

# yarn
yarn add cert-builder grapesjs html2canvas jspdf
```

For framework adapters:
```bash
pnpm add vue       # Vue 3
pnpm add react react-dom   # React 18+
```

### CKEditor 4 (optional — add to your HTML for rich-text editing)
```html
<script src="https://cdn.ckeditor.com/4.22.1/standard/ckeditor.js"></script>
```

---

## Quick Start — Vanilla JS / TypeScript

```ts
import CertBuilder from 'cert-builder';

const builder = new CertBuilder({
  container: '#cert-editor',
  orientation: 'portrait',         // 'portrait' | 'landscape'
  shortcodes: ['name', 'date', 'course', 'issuer'],
  onSave: (html) => console.log(html),
  onLoad: () => console.log('Editor ready!'),

  // Optional: enable background image upload
  onUpload: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const { url } = await res.json();
    return url;
  },

  // Optional: customise builder colours
  theme: {
    primary: '#2563eb',
    highlight: '#2563eb',
  },
});
```

---

## Orientation

Set `orientation` to `'portrait'` (794×1123) or `'landscape'` (1123×794). The sidebar also includes a live orientation toggle that resizes the canvas.

You can still pass explicit `width` / `height` to override the preset dimensions:

```ts
new CertBuilder({
  container: '#editor',
  orientation: 'landscape',    // uses 1123×794
});

new CertBuilder({
  container: '#editor',
  width: 1000,                 // custom size, orientation ignored
  height: 700,
});
```

---

## Columns Layout

The builder includes a **Layout** block category with pre-built column blocks:

| Block | Description |
|---|---|
| **2 Columns** | Two equal-width columns |
| **3 Columns** | Three equal-width columns |
| **4 Columns** | Four equal-width columns |
| **1/3 + 2/3** | Narrow + wide split |

Drag a column block onto the certificate background. Each column supports:
- **Flex Grow** — adjust the proportional width of individual columns
- The row supports **Vertical Align**, **Horizontal Align**, and **Gap** settings in the traits panel

Text and shortcode blocks can be dropped inside columns for precise layout.

---

## Background Image Upload

Provide an `onUpload` callback to enable file-based background uploads. The callback receives a `File` object and must return a `Promise<string>` resolving to the uploaded image URL.

```ts
// S3 example
new CertBuilder({
  container: '#editor',
  onUpload: async (file) => {
    const { url } = await myS3Client.upload(file);
    return url;
  },
});
```

When `onUpload` is provided, an **"Upload Image"** button appears in the Background component's traits panel alongside the existing URL input. If omitted, only the URL input is shown.

---

## Theming

Pass a `theme` object to customise the builder's appearance. All properties are optional — unspecified values fall back to the gray/white default.

```ts
new CertBuilder({
  container: '#editor',
  theme: {
    primary: '#2563eb',     // accent colour (selected items, toolbar, badges)
    secondary: '#3b82f6',   // hover, subtle accents
    panelBg: '#ffffff',     // sidebar background
    canvasBg: '#f1f5f9',    // canvas area background
    border: '#e2e8f0',      // borders
    highlight: '#2563eb',   // selection outline, resize handles
  },
});
```

### Default Theme (gray/white)

| Property | Default | Used for |
|---|---|---|
| `primary` | `#4a5568` | Selected outlines, toolbar, badges, active blocks |
| `secondary` | `#718096` | Hover outlines, block icons |
| `panelBg` | `#ffffff` | Sidebar and panel backgrounds |
| `canvasBg` | `#f7fafc` | Canvas area behind the certificate |
| `border` | `#e2e8f0` | All borders and dividers |
| `highlight` | `#4a5568` | Selection outline, resize handles |

---

## React Example

```tsx
import { useRef } from 'react';
import { CertBuilderReact } from 'cert-builder/react';
import type { CertBuilderReactRef } from 'cert-builder/react';

export default function Editor() {
  const ref = useRef<CertBuilderReactRef>(null);

  return (
    <>
      <CertBuilderReact
        ref={ref}
        orientation="landscape"
        shortcodes={['name', 'date', 'course']}
        onSave={(html) => console.log(html)}
        onUpload={async (file) => {
          const form = new FormData();
          form.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: form });
          return (await res.json()).url;
        }}
        theme={{ primary: '#059669' }}
        style={{ width: '100%', height: '100vh' }}
      />
      <button onClick={() => ref.current?.exportPDF({ name: 'Jane' })}>
        Download PDF
      </button>
    </>
  );
}
```

---

## Vue 3 Example

```vue
<template>
  <CertBuilderVue
    ref="certRef"
    orientation="portrait"
    :shortcodes="['name', 'date', 'course']"
    :on-upload="handleUpload"
    :theme="{ primary: '#7c3aed' }"
    @save="onSave"
    @load="onLoad"
  />
  <button @click="download">Export PDF</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CertBuilderVue } from 'cert-builder/vue';

const certRef = ref();

const handleUpload = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  return (await res.json()).url;
};

const onSave = (html: string) => console.log(html);
const onLoad = () => console.log('ready');
const download = () =>
  certRef.value.exportPDF({ name: 'John Doe', date: '2026-03-26' }, 'cert.pdf');
</script>
```

---

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `string \| HTMLElement` | **required** | Mount target (selector or element) |
| `width` | `number` | `794` | Canvas width in px |
| `height` | `number` | `1123` | Canvas height in px |
| `orientation` | `'portrait' \| 'landscape'` | `'portrait'` | Sets default dimensions (overrides width/height) |
| `shortcodes` | `string[]` | `[]` | Available shortcode keys |
| `onSave` | `(html: string) => void` | `() => {}` | Save callback |
| `onLoad` | `() => void` | `() => {}` | Ready callback |
| `onUpload` | `(file: File) => Promise<string>` | `undefined` | Background image file uploader |
| `theme` | `CertBuilderTheme` | gray/white | Customise builder colours |

### Methods

| Method | Returns | Description |
|---|---|---|
| `export()` | `string` | Raw canvas HTML |
| `render(data, removeUnknown?)` | `string` | HTML with shortcodes replaced |
| `exportPDF(data?, filename?)` | `Promise<void>` | Download as PDF |
| `loadTemplate(html)` | `void` | Load HTML into editor |
| `destroy()` | `void` | Destroy editor and clean up theme styles |
| `getEditor()` | `Editor` | Raw GrapeJS instance |

### Exports

```ts
// Core
import CertBuilder from 'cert-builder';
import { parseShortcodes, extractShortcodes } from 'cert-builder';
import { registerColumnsPlugin } from 'cert-builder';

// Types
import type { CertBuilderOptions, CertBuilderTheme, Orientation, ShortcodeMap } from 'cert-builder';

// React
import { CertBuilderReact } from 'cert-builder/react';
import type { CertBuilderReactRef, CertBuilderReactProps } from 'cert-builder/react';

// Vue
import { CertBuilderVue } from 'cert-builder/vue';
```

---

## Shortcodes

```ts
import { parseShortcodes, extractShortcodes } from 'cert-builder';

parseShortcodes('<p>Hello {{name}}</p>', { name: 'Jane' });
// => '<p>Hello Jane</p>'

extractShortcodes('<p>{{name}} completed {{course}}</p>');
// => ['name', 'course']
```

---

## Publishing to npm

1. Add `NPM_TOKEN` to **GitHub → Settings → Secrets → Actions**
2. Create a GitHub Release with tag `v1.0.0`
3. The publish workflow auto-builds and publishes only `dist/`

---

## Local Development

```bash
pnpm install
pnpm dev       # watch mode
pnpm build     # production build → dist/
pnpm typecheck
pnpm lint
```

---

## License

MIT © [gaiousantonio0909](https://github.com/gaiousantonio0909)