/**
 * Knowledge base options. The option with default: true is the bundled default
 * (see desktop/BUNDLED_RESOURCES.md for where the app looks for the bundled KB file).
 * The url field is used by Settings when the user downloads a KB; it can be empty for the default if using bundling only.
 */
export interface KBOption {
  id: string;
  name: string;
  description: string;
  size: string;
  documentCount: string;
  url: string;
  default: boolean;
}

export const KB_OPTIONS: KBOption[] = [
  {
    id: 'lightweight-mental-health-kb',
    name: 'Lightweight Mental Health KB',
    description: 'Essential mental health topics—gratitude, mindfulness, mood, stress. Quick to download and use.',
    size: '~500MB',
    documentCount: '~1,000 documents',
    url: '', // TODO: Add actual URL when KB is hosted
    default: true,
  },
  {
    id: 'comprehensive-mental-health-kb',
    name: 'Comprehensive Mental Health KB',
    description: 'Broader mental health coverage and more detail. Best if you have space and want depth.',
    size: '~2GB',
    documentCount: '~5,000 documents',
    url: '', // TODO: Add actual URL when KB is hosted
    default: false,
  },
];

export const getDefaultKB = (): KBOption => {
  return KB_OPTIONS.find(kb => kb.default) || KB_OPTIONS[0];
};
