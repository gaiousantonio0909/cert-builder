import type { CertBuilderOptions } from '../../types';

const BLOCK_ID = 'cert-text';
const TYPE_ID = 'cert-text';

export function registerTextPlugin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  options: CertBuilderOptions,
): void {
  const shortcodes = options.shortcodes ?? [];

  // Extend GrapesJS built-in 'text' type so inline RTE editing works out of the box
  editor.DomComponents.addType(TYPE_ID, {
    extend: 'text',
    model: {
      defaults: {
        tagName: 'div',
        name: 'Text',
        draggable: '[data-cert-canvas], [data-gjs-droppable], .cell, .row, .cert-column, .cert-row',
        droppable: false,
        attributes: { 'data-cert-text': 'true' },
        content: 'Double-click to edit',
        style: {
          padding: '8px 12px',
          'font-size': '16px',
          'font-family': 'sans-serif',
          color: '#000',
          'min-width': '50px',
          'min-height': '24px',
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;

  if (typeof win.CKEDITOR !== 'undefined') {
    // Register the shortcodes CKEditor plugin once (richcombo dropdown)
    if (shortcodes.length > 0 && !win.CKEDITOR.plugins.get('certshortcodes')) {
      win.CKEDITOR.plugins.add('certshortcodes', {
        requires: 'richcombo',
        init(ckEditor: any) {
          const codes: string[] = ckEditor.config.certShortcodes || [];
          if (!codes.length) return;

          ckEditor.ui.addRichCombo('Shortcodes', {
            label: 'Shortcodes',
            title: 'Insert Shortcode',
            toolbar: 'insert',
            panel: {
              css: [win.CKEDITOR.skin.getPath('editor')],
              multiSelect: false,
            },
            init() {
              this.startGroup('Available Shortcodes');
              for (const key of codes) {
                this.add(key, `{{${key}}}`, key);
              }
            },
            onClick(value: string) {
              ckEditor.insertText(`{{${value}}}`);
            },
          });
        },
      });
    }

    editor.setCustomRte({
      enable(el: HTMLElement, rte: any) {
        if (rte) return rte;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config: any = {
          toolbar: [
            { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline'] },
            { name: 'paragraph', items: ['JustifyLeft', 'JustifyCenter', 'JustifyRight'] },
            { name: 'styles', items: ['FontSize', 'Font'] },
            { name: 'colors', items: ['TextColor'] },
          ],
          removePlugins: 'contextmenu,tabletools,tableselection,liststyle',
        };

        if (shortcodes.length > 0) {
          config.extraPlugins = 'certshortcodes';
          config.certShortcodes = shortcodes;
          config.toolbar.push({ name: 'insert', items: ['Shortcodes'] });
        }

        return win.CKEDITOR.inline(el, config);
      },
      disable(el: HTMLElement, rte: any) {
        if (rte?.destroy) rte.destroy();
      },
    });
  }

  // Always add the shortcode hover dropdown to the built-in RTE toolbar
  if (shortcodes.length > 0) {
    editor.RichTextEditor.add('shortcode-menu', {
      icon: (() => {
        // Wrapper with hover behavior
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-block;cursor:pointer;font-size:12px;font-family:sans-serif;white-space:nowrap;padding:2px 4px;';
        wrapper.textContent = 'Short Codes ▾';

        // Dropdown list (hidden by default, shown on hover)
        const dropdown = document.createElement('div');
        dropdown.style.cssText = 'display:none;position:absolute;top:100%;left:0;z-index:9999;background:#fff;border:1px solid #ccc;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.15);min-width:160px;max-height:200px;overflow-y:auto;';

        for (const key of shortcodes) {
          const item = document.createElement('div');
          item.textContent = `{{${key}}}`;
          item.style.cssText = 'padding:6px 12px;cursor:pointer;font-size:12px;font-family:sans-serif;white-space:nowrap;';
          item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#f0f4f8';
          });
          item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = '';
          });
          // mousedown fires BEFORE blur — so the iframe selection is still active
          item.addEventListener('mousedown', (e) => {
            e.preventDefault(); // prevent focus steal
            const frame = editor.Canvas.getFrameEl() as HTMLIFrameElement | null;
            if (frame?.contentDocument) {
              frame.contentDocument.execCommand('insertText', false, `{{${key}}}`);
            }
            dropdown.style.display = 'none';
          });
          dropdown.appendChild(item);
        }

        wrapper.appendChild(dropdown);

        // Show/hide on hover
        wrapper.addEventListener('mouseenter', () => {
          dropdown.style.display = 'block';
        });
        wrapper.addEventListener('mouseleave', () => {
          dropdown.style.display = 'none';
        });

        return wrapper;
      })(),
      result: () => { /* handled by mousedown on items */ },
    });
  }

  editor.BlockManager.add(BLOCK_ID, {
    id: BLOCK_ID,
    label: 'Text',
    category: 'Certificate',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="4 7 4 4 20 4 20 7"/>
      <line x1="9" y1="20" x2="15" y2="20"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </svg>`,
    content: { type: TYPE_ID },
  });
}
