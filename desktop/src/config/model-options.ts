export interface ModelOption {
  id: string;
  name: string;
  description: string;
  size: string;
  url: string;
  default: boolean;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'mistral-7b-instruct-v0.2-q4_k_m',
    name: 'Enhanced Model',
    description: 'Best for health and care questions. Strong reasoning and medical accuracy.',
    size: '~4.4GB',
    url: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    default: true,
  },
  {
    id: 'llama-3.2-3b-instruct-q4_k_m',
    name: 'Standard Model',
    description: 'Smaller and faster. Good for limited storage or slower computers.',
    size: '~2.5GB',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    default: false,
  },
];

export const getDefaultModel = (): ModelOption => {
  return MODEL_OPTIONS.find(m => m.default) || MODEL_OPTIONS[0];
};
