import type { Editor } from 'grapesjs';

export type Orientation = 'portrait' | 'landscape';

export interface CertBuilderTheme {
  /** Primary accent color (selected items, active states). Default: `#4a5568` */
  primary?: string;
  /** Secondary color (hover, subtle accents). Default: `#718096` */
  secondary?: string;
  /** Sidebar / panel background. Default: `#ffffff` */
  panelBg?: string;
  /** Canvas area background. Default: `#f7fafc` */
  canvasBg?: string;
  /** Border color. Default: `#e2e8f0` */
  border?: string;
  /** Highlight / selection outline. Default: `#4a5568` */
  highlight?: string;
  /** Main text color. Default: `#2d3748` */
  text?: string;
  /** Secondary/label text color. Default: `#718096` */
  textMuted?: string;
  /** Input/select/textarea background. Default: `#ffffff` */
  inputBg?: string;
}

export interface CertBuilderOptions {
  container: string | HTMLElement;
  width?: number;
  height?: number;
  /** Portrait (794×1123) or landscape (1123×794). Overrides width/height when set. */
  orientation?: Orientation;
  shortcodes?: string[];
  onSave?: (html: string) => void;
  onLoad?: () => void;
  /**
   * Called when a user picks a local file for background upload.
   * Must return a URL string (e.g. after uploading to S3, Cloudinary, etc.).
   * If omitted, file upload UI is hidden and only URL input is shown.
   */
  onUpload?: (file: File) => Promise<string>;
  /** Customise builder colours. Grey/white defaults replace GrapesJS pink. */
  theme?: CertBuilderTheme;
}

export type ShortcodeMap = Record<string, string>;

export interface CertBuilderPlugin {
  (editor: Editor, options: CertBuilderOptions): void;
}
