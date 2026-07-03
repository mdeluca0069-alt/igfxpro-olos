/**
 * useAIStream — Real SSE streaming hook for OLOS AI chat.
 * Connects to /api/v1/ai/chat and receives token-by-token text.
 */
import { useState, useRef, useCallback } from "react";
import { tokenVault } from "../shared/lib/tokenVault";

export type AIStreamState = {
  text:      string;
  streaming: boolean;
  error:     string | null;
};

export type UseAIStreamReturn = AIStreamState & {
  send:  (message: string, context?: Record<string, unknown>) => Promise<void>;
  reset: () => void;
  abort: () => void;
};

export function useAIStream(): UseAIStreamReturn {
  const [state,    setState]  = useState<AIStreamState>({ text: "", streaming: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState({ text: "", streaming: false, error: null });
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, streaming: false }));
  }, []);

  const send = useCallback(async (message: string, context: Record<string, unknown> = {}) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ text: "", streaming: true, error: null });

    try {
      const token = tokenVault.getAccessToken();
      const res = await fetch("/api/v1/ai/chat", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body:   JSON.stringify({ message, context }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setState({ text: "", streaming: false, error: `API error: ${res.status}` });
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
      let   full    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const { token: tok } = JSON.parse(data) as { token: string };
            full += tok;
            setState({ text: full, streaming: true, error: null });
          } catch { /* skip malformed */ }
        }
      }

      setState({ text: full, streaming: false, error: null });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setState(prev => ({ ...prev, streaming: false, error: (err as Error).message }));
      } else {
        setState(prev => ({ ...prev, streaming: false }));
      }
    }
  }, []);

  return { ...state, send, reset, abort };
}

export default useAIStream;
