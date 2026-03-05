'use client';

import { useEffect } from 'react';

function isExtensionNoise(message: string, stack?: string, filename?: string): boolean {
  const text = `${message || ''} ${stack || ''} ${filename || ''}`.toLowerCase();
  return (
    text.includes('chrome-extension://') ||
    text.includes('shouldsettallyforcurrentprovider') ||
    text.includes('window.ethereum') ||
    text.includes("cannot assign to read only property 'aptos'") ||
    text.includes('cannot redefine property: ethereum')
  );
}

export default function DevErrorFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const onError = (event: ErrorEvent) => {
      if (isExtensionNoise(event.message || '', event.error?.stack, event.filename)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : (reason?.message as string) || '';
      const stack = reason?.stack as string | undefined;
      if (isExtensionNoise(message, stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onUnhandled, true);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onUnhandled, true);
    };
  }, []);

  return null;
}
