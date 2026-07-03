import { useEffect, useRef } from "react";

type ShortcutMap = Record<string, () => void>;

/**
 * Registers keyboard shortcuts on the document.
 * Ignores shortcuts when focus is inside an <input>, <textarea>, or <select>.
 *
 * @example
 * useKeyboardShortcuts({
 *   "b":      () => setSide("BUY"),
 *   "s":      () => setSide("SELL"),
 *   "Escape": () => closeDialog(),
 *   "1":      () => setTimeframe("1M"),
 * });
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't fire shortcuts when typing in form fields
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Don't fire with modifier keys (except Escape, which is always safe)
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key !== "Escape") return;

      const action = shortcutsRef.current[e.key];
      if (action) {
        e.preventDefault();
        action();
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}

export default useKeyboardShortcuts;
