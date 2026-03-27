import { CertBuilderOptions } from '../../types';

const BLOCK_ID = 'cert-shortcode';
const TYPE_ID = 'cert-shortcode';

export function registerShortcodePlugin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  options: CertBuilderOptions,
): void {
  const availableShortcodes = options.shortcodes ?? [];

  editor.DomComponents.addType(TYPE_ID, {
    model: {
      defaults: {
        tagName: 'span',
        name: 'Shortcode',
        draggable: '[data-cert-canvas], [data-gjs-droppable], .cell, .row, .cert-column, .cert-row, [data-cert-text]',
        droppable: false,
        editable: false,
        attributes: {
          'data-cert-shortcode': 'true',
          'data-key': availableShortcodes[0] ?? 'name',
        },
        style: {
          display: 'inline-block',
          'background-color': '#e0f2fe',
          color: '#0369a1',
          border: '1px solid #7dd3fc',
          'border-radius': '4px',
          padding: '2px 8px',
          'font-size': '13px',
          'font-family': 'monospace',
          cursor: 'move',
          'white-space': 'nowrap',
        },
        traits: [
          {
            type: availableShortcodes.length > 0 ? 'select' : 'text',
            name: 'shortcodeKey',
            label: 'Shortcode Key',
            ...(availableShortcodes.length > 0
              ? { options: availableShortcodes.map((key) => ({ id: key, label: `{{${key}}}` })) }
              : { placeholder: 'e.g. name' }),
            changeProp: true,
          },
        ],
      },
      init(this: any) {
        this.updateLabel();
        this.listenTo(this, 'change:shortcodeKey', this.updateLabel);
      },
      updateLabel(this: any) {
        const key = (this.get('shortcodeKey') as string) || (this.getAttributes()['data-key'] as string) || 'name';
        this.set('content', `{{${key}}}`);
        this.addAttributes({ 'data-key': key });
      },
    },
  });

  editor.BlockManager.add(BLOCK_ID, {
    id: BLOCK_ID,
    label: 'Shortcode',
    category: 'Certificate',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>`,
    content: {
      type: TYPE_ID,
      attributes: { 'data-key': availableShortcodes[0] ?? 'name' },
    },
  });
}