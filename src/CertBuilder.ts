import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { CertBuilderOptions, CertBuilderTheme, ShortcodeMap, Orientation } from './types';
import { registerBackgroundPlugin } from './plugins/background';
import { registerTextPlugin } from './plugins/text-ckeditor';
import { registerColumnsPlugin } from './plugins/columns';
import { parseShortcodes } from './utils/shortcode-parser';

const PORTRAIT_W = 794;
const PORTRAIT_H = 1123;

function resolveDimensions(opts: CertBuilderOptions): { width: number; height: number } {
    if (opts.orientation === 'landscape') {
        return { width: opts.width ?? PORTRAIT_H, height: opts.height ?? PORTRAIT_W };
    }
    return { width: opts.width ?? PORTRAIT_W, height: opts.height ?? PORTRAIT_H };
}

const DEFAULT_THEME: Required<CertBuilderTheme> = {
    primary: '#4a5568',
    secondary: '#718096',
    panelBg: '#ffffff',
    canvasBg: '#f7fafc',
    border: '#e2e8f0',
    highlight: '#4a5568',
};

function buildThemeCss(t: Required<CertBuilderTheme>): string {
    return `
    /* ── cert-builder theme overrides ─────────────────── */
    :root {
      --cb-primary: ${t.primary};
      --cb-secondary: ${t.secondary};
      --cb-panel-bg: ${t.panelBg};
      --cb-canvas-bg: ${t.canvasBg};
      --cb-border: ${t.border};
      --cb-highlight: ${t.highlight};
      --cb-text: #2d3748;
    }
    /* Selected component outline */
    .gjs-selected { outline: 2px solid var(--cb-highlight) !important; outline-offset: -2px; }
    /* Hovered component outline */
    .gjs-hovered { outline: 1px dashed var(--cb-secondary) !important; }
    /* Toolbar */
    .gjs-toolbar { background: var(--cb-primary) !important; }
    .gjs-toolbar-item { color: #fff !important; }
    /* Badge (component label on hover) */
    .gjs-badge { background-color: var(--cb-primary) !important; color: #fff !important; }
    /* Highlighter (resize handles) */
    .gjs-highlighter { outline-color: var(--cb-highlight) !important; }
    .gjs-resizer-h { border-color: var(--cb-highlight) !important; background: var(--cb-highlight) !important; }
    /* Blocks */
    .gjs-block { border: 1px solid var(--cb-border); border-radius: 6px; background: var(--cb-panel-bg);
      color: var(--cb-text); transition: border-color .15s, box-shadow .15s; }
    .gjs-block:hover { border-color: var(--cb-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-primary) 15%, transparent); }
    .gjs-block svg { stroke: var(--cb-secondary); }
    /* Block categories */
    .gjs-block-category .gjs-title { background: var(--cb-panel-bg) !important;
      border-bottom: 1px solid var(--cb-border) !important; color: var(--cb-text) !important;
      font-weight: 600; letter-spacing: .3px; }
    /* Traits panel */
    .gjs-trt-trait { border-bottom: 1px solid var(--cb-border); }
    .gjs-trt-trait .gjs-label { color: var(--cb-text); }
    .gjs-field { background: #f7fafc; border: 1px solid var(--cb-border); border-radius: 4px; }
    .gjs-field:focus-within { border-color: var(--cb-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--cb-primary) 20%, transparent); }
    /* Style Manager */
    .gjs-sm-sector .gjs-sm-sector-title { background: var(--cb-panel-bg) !important;
      color: var(--cb-text) !important; border-bottom: 1px solid var(--cb-border) !important;
      font-weight: 600; font-size: 12px; letter-spacing: .3px; }
    .gjs-sm-property { color: var(--cb-text); }
    .gjs-sm-property .gjs-sm-label { color: var(--cb-text); font-size: 11px; }
    /* Canvas frame */
    .gjs-frame-wrapper { background: var(--cb-canvas-bg); padding: 0 !important; }
    /* Canvas wrapper — no extra padding around the certificate */
    .gjs-frame { margin: 0 !important; padding: 0 !important; border: none !important; }
    .gjs-cv-canvas { background: var(--cb-canvas-bg);
      width: 100% !important; height: 100% !important; top: 0 !important; bottom: 0 !important; }
    .gjs-cv-canvas .gjs-frame-wrapper { padding: 0 !important; margin: 0 !important; }
    /* GrapesJS ghost/offset helpers that can cause gaps */
    .gjs-cv-canvas__frames { padding: 0 !important; }
    /* Remove GrapesJS default pink/purple tints */
    .gjs-one-bg { background-color: var(--cb-panel-bg) !important; }
    .gjs-two-color { color: var(--cb-text) !important; }
    .gjs-three-bg { background-color: var(--cb-primary) !important; }
    .gjs-four-color, .gjs-four-color-h:hover { color: var(--cb-primary) !important; }
    `;
}

export class CertBuilder {
    private editor!: Editor;
    private options: Required<CertBuilderOptions>;
    private root!: HTMLElement;
    private styleEl: HTMLStyleElement | null = null;

    constructor(options: CertBuilderOptions) {
        const dims = resolveDimensions(options);
        this.options = {
            orientation: (options.orientation ?? 'portrait') as Orientation,
            shortcodes: [],
            onSave: () => undefined,
            onLoad: () => undefined,
            onUpload: undefined as unknown as (file: File) => Promise<string>,
            theme: {},
            ...options,
            // resolved dims always win
            width: dims.width,
            height: dims.height,
        };
        this.init();
    }

    private init(): void {
        const { container, width, height } = this.options;

        // Resolve the container element
        this.root =
            typeof container === 'string'
                ? (document.querySelector(container) as HTMLElement)
                : container;

        if (!this.root) throw new Error('[cert-builder] Container element not found.');

        // Inject theme CSS
        const theme: Required<CertBuilderTheme> = { ...DEFAULT_THEME, ...(this.options.theme ?? {}) };
        this.styleEl = document.createElement('style');
        this.styleEl.setAttribute('data-cert-builder-theme', '');
        this.styleEl.textContent = buildThemeCss(theme);
        document.head.appendChild(this.styleEl);

        // Build editor layout: sidebar (blocks + traits + styles) | centered canvas
        this.root.innerHTML = `
          <div class="cert-builder-wrap" style="display:flex;height:100%;min-height:600px;background:var(--cb-canvas-bg,#f7fafc);overflow:hidden;">
            <div class="cert-builder-sidebar" style="height: 100vh; width:260px;border-right:1px solid var(--cb-border,#e2e8f0);background:var(--cb-panel-bg,#fff);flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;">
              <div class="cert-builder-orientation" style="padding:10px 12px;border-bottom:1px solid var(--cb-border,#e2e8f0);display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <label style="font-size:12px;font-weight:600;color:var(--cb-text,#2d3748);white-space:nowrap;">Orientation</label>
                <select class="cert-builder-orientation-select" style="flex:1;padding:4px 6px;font-size:12px;border:1px solid var(--cb-border,#e2e8f0);border-radius:4px;background:#fff;">
                  <option value="portrait"${this.options.orientation === 'portrait' ? ' selected' : ''}>Portrait</option>
                  <option value="landscape"${this.options.orientation === 'landscape' ? ' selected' : ''}>Landscape</option>
                </select>
              </div>
              <div class="cert-builder-sidebar-scroll" style="height: 100vh; flex:1;overflow-y:auto;overflow-x:hidden;">
                <div class="cert-builder-blocks" style="padding:8px;"></div>
                <div class="cert-builder-traits" style="padding:8px;border-top:1px solid var(--cb-border,#e2e8f0);"></div>
                <div class="cert-builder-styles" style="padding:8px;border-top:1px solid var(--cb-border,#e2e8f0);"></div>
              </div>
            </div>
            <div class="cert-builder-canvas-area" style="flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:24px;">
              <div class="cert-builder-editor" style="box-shadow:0 2px 12px rgba(0,0,0,.08);border-radius:2px;flex-shrink:0;"></div>
            </div>
          </div>
        `;

        const editorEl = this.root.querySelector('.cert-builder-editor') as HTMLElement;
        const blocksEl = this.root.querySelector('.cert-builder-blocks') as HTMLElement;
        const traitsEl = this.root.querySelector('.cert-builder-traits') as HTMLElement;
        const stylesEl = this.root.querySelector('.cert-builder-styles') as HTMLElement;
        const orientationSel = this.root.querySelector('.cert-builder-orientation-select') as HTMLSelectElement;

        // Orientation toggle
        orientationSel.addEventListener('change', () => {
          const newOrientation = orientationSel.value as Orientation;
          const newW = newOrientation === 'landscape' ? PORTRAIT_H : PORTRAIT_W;
          const newH = newOrientation === 'landscape' ? PORTRAIT_W : PORTRAIT_H;
          this.options.orientation = newOrientation;
          this.options.width = newW;
          this.options.height = newH;

          // Resize the background component
          const wrapper = this.editor.getWrapper();
          const bg = wrapper?.find('[data-cert-canvas]')?.[0];
          if (bg) {
            bg.addStyle({ width: `${newW}px`, height: `${newH}px` });
          }
        });

        this.editor = grapesjs.init({
            container: editorEl,
            height: `${height}px`,
            width: `${width}px`,
            fromElement: false,
            storageManager: false,
            blockManager: {
                appendTo: blocksEl,
            },
            traitManager: {
                appendTo: traitsEl,
            },
            styleManager: {
                appendTo: stylesEl,
                sectors: [
                    {
                        name: 'Layout',
                        open: true,
                        properties: [
                            'display', 'flex-direction', 'flex-wrap',
                            'justify-content', 'align-items', 'align-content',
                            'gap',
                        ],
                    },
                    {
                        name: 'Flex Child',
                        open: false,
                        properties: [
                            'flex-basis', 'flex-grow', 'flex-shrink',
                            'align-self', 'order',
                        ],
                    },
                    {
                        name: 'Spacing',
                        open: false,
                        properties: [
                            'padding', 'margin',
                        ],
                    },
                    {
                        name: 'Size',
                        open: false,
                        properties: [
                            'width', 'min-width', 'max-width',
                            'height', 'min-height', 'max-height',
                        ],
                    },
                    {
                        name: 'Typography',
                        open: false,
                        properties: [
                            'font-family', 'font-size', 'font-weight',
                            'letter-spacing', 'line-height', 'text-align',
                            'color',
                        ],
                    },
                ],
            },
            panels: { defaults: [] },
            deviceManager: { devices: [] },
            canvas: {
                styles: [],
                scripts: [],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(({ frames: [{
                    component: '',
                    width: `${width}px`,
                    height: `${height}px`,
                }] }) as any),
            },
        });

        // Reset canvas iframe to match certificate dimensions exactly
        this.editor.on('load', () => {
            const frame = this.editor.Canvas.getFrameEl() as HTMLIFrameElement;
            if (frame) {
                frame.style.width = `${width}px`;
                frame.style.height = `${height}px`;
                frame.style.margin = '0';
                frame.style.padding = '0';
                frame.style.border = 'none';
            }

            // Also reset the frame wrapper div
            const frameWrapper = frame?.parentElement;
            if (frameWrapper) {
                frameWrapper.style.width = `${width}px`;
                frameWrapper.style.height = `${height}px`;
                frameWrapper.style.padding = '0';
                frameWrapper.style.margin = '0';
                frameWrapper.style.position = 'relative';
            }

            const doc = frame?.contentDocument;
            if (doc) {
                const resetStyle = doc.createElement('style');
                resetStyle.textContent = `
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden;
                        width: ${width}px;
                        height: ${height}px;
                    }
                    body > * {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                `;
                doc.head.appendChild(resetStyle);
            }
            this.options.onLoad();
        });

        // Ensure the wrapper component has no padding
        this.editor.on('load', () => {
            const wrapper = this.editor.getWrapper();
            if (wrapper) {
                wrapper.setStyle({
                    'padding': '0',
                    'margin': '0',
                    'overflow': 'hidden',
                });
            }
        });

        registerBackgroundPlugin(this.editor, this.options);
        registerTextPlugin(this.editor, this.options);
        registerColumnsPlugin(this.editor, this.options);

        this.editor.Commands.add('cert-save', {
            run: () => this.options.onSave(this.export()),
        });
    }

    export(): string {
        const html = this.editor.getHtml();
        const css = this.editor.getCss();
        if (!css) return html;
        // Inject <style> into the output so all component styles are preserved
        return html.replace(
            /(<body[^>]*>)/i,
            `$1<style>${css}</style>`,
        );
    }

    render(data: ShortcodeMap, removeUnknown = false): string {
        return parseShortcodes(this.export(), data, removeUnknown);
    }

    async exportPDF(data?: ShortcodeMap, filename = 'certificate.pdf'): Promise<void> {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf'),
        ]);

        const { width, height } = this.options;
        const canvasFrame = this.editor.Canvas.getFrameEl() as HTMLIFrameElement;
        const body = canvasFrame?.contentDocument?.body;

        if (!body) throw new Error('[cert-builder] Cannot access canvas frame for PDF export.');

        let tempContainer: HTMLDivElement | null = null;
        let targetEl: HTMLElement = body;

        if (data) {
            const rendered = this.render(data);
            tempContainer = document.createElement('div');
            tempContainer.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${width}px;height:${height}px;overflow:hidden;`;
            tempContainer.innerHTML = rendered;
            document.body.appendChild(tempContainer);
            targetEl = tempContainer;
        }

        const canvas = await html2canvas(targetEl, { scale: 2, useCORS: true, width, height });
        const pdf = new jsPDF({
            orientation: width > height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [width, height],
        });

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
        pdf.save(filename);

        if (tempContainer) document.body.removeChild(tempContainer);
    }

    exportJson(): Record<string, unknown> {
        return {
            components: this.editor.getComponents().map((c: any) => c.toJSON()),
            styles: this.editor.getStyle().map((s: any) => s.toJSON()),
            orientation: this.options.orientation,
            width: this.options.width,
            height: this.options.height,
        };
    }

    importJson(json: Record<string, unknown>): void {
        if (json.orientation || json.width || json.height) {
            const orientation = (json.orientation as Orientation) ?? this.options.orientation;
            const w = (json.width as number) ?? (orientation === 'landscape' ? PORTRAIT_H : PORTRAIT_W);
            const h = (json.height as number) ?? (orientation === 'landscape' ? PORTRAIT_W : PORTRAIT_H);
            this.options.orientation = orientation;
            this.options.width = w;
            this.options.height = h;

            // Update orientation selector if present
            const sel = this.root.querySelector('.cert-builder-orientation-select') as HTMLSelectElement | null;
            if (sel) sel.value = orientation;
        }

        if (Array.isArray(json.components)) {
            this.editor.setComponents(json.components);
        }
        if (Array.isArray(json.styles)) {
            this.editor.setStyle(json.styles);
        }
    }

    loadTemplate(html: string): void {
        this.editor.setComponents(html);
    }

    destroy(): void {
        if (this.styleEl) {
            this.styleEl.remove();
            this.styleEl = null;
        }
        this.editor.destroy();
    }

    getEditor(): Editor {
        return this.editor;
    }
}

export default CertBuilder;