declare global {
  interface Window {
    goatcounter?: {
      count: (vars: { path: string; title: string; event: boolean }) => void
    }
  }
}

export {}
