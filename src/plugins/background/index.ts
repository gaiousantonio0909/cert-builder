import type { CertBuilderOptions } from '../../types';

const BLOCK_ID = 'cert-background';
const TYPE_ID = 'cert-background';

export function registerBackgroundPlugin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  options: CertBuilderOptions,
): void {
  const { width = 794, height = 1123, onUpload } = options;

  editor.DomComponents.addType(TYPE_ID, {
    model: {
      defaults: {
        tagName: 'div',
        name: 'Background',
        draggable: false,
        droppable: true,
        removable: false,
        copyable: false,
        attributes: { 'data-cert-canvas': 'true' },
        style: {
          width: `${width}px`,
          height: `${height}px`,
          position: 'relative',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat',
          overflow: 'hidden',
        },
        traits: [
          {
            type: 'text',
            name: 'backgroundImage',
            label: 'Background Image URL',
            changeProp: true,
          },
          {
            type: 'select',
            name: 'backgroundSize',
            label: 'Background Size',
            options: [
              { id: 'cover', label: 'Cover' },
              { id: 'contain', label: 'Contain' },
              { id: '100% 100%', label: 'Stretch' },
            ],
            changeProp: true,
          },
          {
            type: 'select',
            name: 'backgroundRepeat',
            label: 'Background Repeat',
            options: [
              { id: 'no-repeat', label: 'No Repeat' },
              { id: 'repeat', label: 'Repeat' },
              { id: 'repeat-x', label: 'Repeat X' },
              { id: 'repeat-y', label: 'Repeat Y' },
            ],
            changeProp: true,
          },
        ],
      },
      init(this: any) {
        this.listenTo(this, 'change:backgroundImage', this.onBgImageChange);
        this.listenTo(this, 'change:backgroundSize', this.onBgSizeChange);
        this.listenTo(this, 'change:backgroundRepeat', this.onBgRepeatChange);
      },
      onBgImageChange(this: any) {
        const url = this.get('backgroundImage') as string;
        if (url) {
          this.addStyle({ 'background-image': `url(${url})` });
        } else {
          this.removeStyle('background-image');
        }
      },
      onBgSizeChange(this: any) {
        const size = (this.get('backgroundSize') as string) || 'cover';
        this.addStyle({ 'background-size': size });
      },
      onBgRepeatChange(this: any) {
        const repeat = (this.get('backgroundRepeat') as string) || 'no-repeat';
        this.addStyle({ 'background-repeat': repeat });
      },
    },
  });

  // ── File-upload trait (shown only when onUpload is provided) ──
  if (onUpload) {
    editor.TraitManager.addType('cert-file-upload', {
      createInput({ trait }: any) {
        const el = document.createElement('div');
        el.innerHTML = `
          <label
            style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;
                   border:1px dashed var(--cb-border,#cbd5e0);border-radius:4px;
                   cursor:pointer;font-size:12px;color:var(--cb-text,#4a5568);width:100%;
                   box-sizing:border-box;"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="cb-upload-label">Upload Image</span>
            <input type="file" accept="image/*" style="display:none;" />
          </label>
        `;
        const input = el.querySelector('input') as HTMLInputElement;
        const label = el.querySelector('.cb-upload-label') as HTMLSpanElement;
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;
          label.textContent = 'Uploading…';
          try {
            const url = await onUpload(file);
            const component = editor.getSelected();
            if (component) {
              component.set('backgroundImage', url);
              component.trigger('change:backgroundImage');
            }
            label.textContent = 'Uploaded ✓';
          } catch {
            label.textContent = 'Upload failed';
          }
          setTimeout(() => { label.textContent = 'Upload Image'; }, 2500);
          input.value = '';
        });
        return el;
      },
      onUpdate({ trait, elInput, component }: any) {
        // no-op — we push values imperatively above
      },
    });

    // Extend the background type to include the upload trait
    const origDefaults = editor.DomComponents.getType(TYPE_ID).model.prototype.defaults;
    const traits = [...(origDefaults.traits || [])];
    traits.push({
      type: 'cert-file-upload',
      name: 'backgroundUpload',
      label: 'Upload Background',
    });
    origDefaults.traits = traits;
  }

  editor.BlockManager.add(BLOCK_ID, {
    id: BLOCK_ID,
    label: 'Background',
    category: 'Certificate',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>`,
    content: { type: TYPE_ID },
  });

  // Auto-add background on editor load if canvas is empty
  editor.on('load', () => {
    const wrapper = editor.getWrapper();
    if (wrapper && wrapper.components().length === 0) {
      wrapper.append({ type: TYPE_ID });
    }
  });
}
