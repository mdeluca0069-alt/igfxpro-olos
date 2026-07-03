import { useEffect } from "react";

const BASE_TITLE = "OLOS Terminal — IGFXPRO";

/**
 * Sets document.title for the current page.
 * Resets to base title on unmount.
 *
 * @example
 * usePageTitle("Trading · EURUSD 1.08514");
 * usePageTitle(`Risk Governor · Score ${score}/100`);
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} — IGFXPRO` : BASE_TITLE;
    return () => { document.title = BASE_TITLE; };
  }, [title]);
}

export default usePageTitle;
