declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __rrbConsentDefaultSet?: boolean;
    __rrbConsentApplied?: string;
  }
}

export {};
