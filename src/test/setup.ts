import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
    }
  }
  // @ts-expect-error polyfill for jsdom
  window.PointerEvent = PointerEventPolyfill;
}

