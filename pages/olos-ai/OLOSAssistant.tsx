/**
 * OLOS Assistant — Real AI Chat (Claude + SSE streaming)
 * Falls back to intelligent rule-based when ANTHROPIC_API_KEY is not configured.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Sparkles, TrendingUp, TrendingDown,
  Zap, Brain, Cpu, RefreshCw, Maximize2, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAiStore }      from "../../store/ai.store";
import { useMarketStore }  from "../../store/market.store";
import { useTradingStore } from "../../store/trading.store";
import { tokenVault }      from "../../shared/lib/tokenVault";
import { getClientEnv }   from "../../shared/config/clientEnv";

type Message = {
  id:   string;
  role: "user" | "assistant";
  text: string;
  ts:   Date;
  streaming?: boolean;
};

const QUICK_PROMPTS = [
  "What's the top BUY signal now?",
  "Analyze EURUSD",
  "What's my portfolio P&L?",
  "Explain OLOS confidence score",
  "Best hedge for my positions?",
  "How does backtesting work?",
];

// ─── SSE streaming fetch ──────────────────────────────────────────────────────
async function streamChat(
  message: string,
  context: Record<string, unknown>,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const token = tokenVault.getAccessToken();
  const res = await fetch(`${getClientEnv().API_BASE_URL}/api/v1/ai/chat`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    credentials: "include",
    body:   JSON.stringify({ message, context }),
    signal,
  });

  if (!res.ok || !res.body) {
    onToken("[AI service unavailable. Please try again.]");
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const { token: tok } = JSON.parse(data) as { token: string };
        onToken(tok);
      } catch {
        // skip malformed chunk
      }
    }
  }
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const text   = msg.text;

  // Render **bold** markdown
  const renderText = (t: string) =>
    t.split("**").map((part, i) =>
      i % 2 === 1
        ? <strong key={i} className={isUser ? "font-black text-slate-900" : "font-black text-white"}>{part}</strong>
        : part
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5`}
    >
      {!isUser && (
        <div className="flex-shrink-0 mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10">
          <Brain size={13} className="text-cyan-400" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-6 ${
        isUser
          ? "rounded-tr-sm bg-cyan-400 text-slate-950 font-medium"
          : "rounded-tl-sm border border-white/[0.07] bg-slate-800/80 text-slate-200"
      }`}>
        {text.split("\n\n").map((para, pi) => (
          <p key={pi} className={pi > 0 ? "mt-2" : ""}>
            {para.split("\n").map((line, li) => (
              <span key={li}>
                {renderText(line)}
                {li < para.split("\n").length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
        {msg.streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded bg-cyan-400" />
        )}
        <p className={`mt-1.5 text-[10px] ${isUser ? "text-slate-700" : "text-slate-600"}`}>
          {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10">
        <Brain size={13} className="text-cyan-400" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-white/[0.07] bg-slate-800/80 px-4 py-3.5">
        <div className="flex gap-1.5 items-center">
          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OLOSAssistant() {
  const signals             = useAiStore(s => s.signals);
  const fetchSignals        = useAiStore(s => s.fetchSignals);
  const fetchConfidence     = useAiStore(s => s.fetchConfidence);
  const getTopSignal        = useAiStore(s => s.getTopSignal);
  const getOverallConfScore = useAiStore(s => s.getOverallConfidenceScore);
  const subscribeWs         = useAiStore(s => s.subscribeWs);
  const quotes              = useMarketStore(s => s.quotes);
  const positions           = useTradingStore(s => s.positions);

  const [messages,  setMessages]  = useState<Message[]>([{
    id:   "welcome",
    role: "assistant",
    text: "Benvenuto! Sono **OLOS**, l'AI di IGFXPRO.\n\nAnalizzo segnali in tempo reale, indicatori tecnici, correlazioni di mercato e rispondo alle tue domande di trading. Posso aiutarti a identificare opportunità, capire i segnali attivi o spiegare qualsiasi aspetto della piattaforma.\n\nCome posso aiutarti oggi?",
    ts:   new Date(),
  }]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showInfo,  setShowInfo]  = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const abortRef   = useRef<AbortController | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchSignals();
    void fetchConfidence();
    const unsub = subscribeWs();
    return unsub;
  }, [fetchSignals, fetchConfidence, subscribeWs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    // Abort previous stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Add user message
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", text: text.trim(), ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    // Create assistant message shell (will be filled by stream)
    const aiId = `a_${Date.now()}`;
    setMessages(prev => [...prev, { id: aiId, role: "assistant", text: "", ts: new Date(), streaming: true }]);

    // Build context from live stores
    const context = {
      signals:         signals.map(s => ({
        symbol:      s.symbol,
        signalType:  s.signalType,
        confidence:  s.confidence,
        status:      (s as unknown as { status?: string }).status ?? "ACTIVE",
        entryPrice:  (s as unknown as { entryPrice?: number }).entryPrice ?? 0,
        stopLoss:    (s as unknown as { stopLoss?: number }).stopLoss ?? 0,
        timeframe:   (s as unknown as { timeframe?: string }).timeframe ?? "H1",
        entryRationale: (s as unknown as { entryRationale?: string }).entryRationale ?? "",
      })),
      positions:       positions.map(p => ({ symbol: p.symbol, side: p.side, pnl: p.pnl })),
      quotes:          Object.fromEntries(
        Object.entries(quotes).map(([k, v]) => [k, { mid: v.mid, changePct: v.changePct ?? 0 }])
      ),
      confidenceScore: getOverallConfScore(),
    };

    try {
      await streamChat(
        text.trim(),
        context,
        (token) => {
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, text: m.text + token, streaming: true } : m
          ));
        },
        abortRef.current.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, text: m.text || "[Connection error. Please try again.]" } : m
        ));
      }
    }

    // Finalize
    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m));
    setStreaming(false);
    inputRef.current?.focus();
  }, [streaming, signals, positions, quotes, getOverallConfScore]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); void sendMessage(input); };

  const topSignal    = getTopSignal();
  const confScore    = getOverallConfScore();
  const activeCount  = signals.filter(s => (s as unknown as { status?: string }).status === "ACTIVE" || true).length;
  const buyCount     = signals.filter(s => s.signalType === "BUY").length;
  const sellCount    = signals.filter(s => s.signalType === "SELL").length;

  return (
    <div className="flex flex-col bg-[#05070d]" style={{ height: "calc(100vh - 0px)" }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/[0.06] bg-[#060a12]">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
              <Brain size={18} className="text-cyan-400" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-1 ring-[#060a12]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-black text-white">OLOS Assistant</h1>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">LIVE</span>
              </div>
              <p className="text-[11px] text-slate-500">AI di trading istituzionale · aggiornato ogni 60s</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setShowInfo(v => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/60 px-3 py-1.5 text-[11px] text-slate-400 transition hover:border-slate-600 hover:text-white">
              <Cpu size={11} /> Info
              <ChevronDown size={10} className={`transition-transform ${showInfo ? "rotate-180" : ""}`} />
            </button>
            <button onClick={() => abortRef.current?.abort()} disabled={!streaming}
              className="rounded-xl border border-slate-700/60 p-1.5 text-slate-500 transition hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-30">
              <RefreshCw size={13} className={streaming ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-5 border-t border-white/[0.04] px-5 py-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-cyan-400" />
            <span className="text-[10px] text-slate-500">Signals: <span className="font-black text-white">{activeCount}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={11} className="text-emerald-400" />
            <span className="text-[10px] text-slate-500">BUY: <span className="font-black text-emerald-300">{buyCount}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={11} className="text-rose-400" />
            <span className="text-[10px] text-slate-500">SELL: <span className="font-black text-rose-300">{sellCount}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={11} className="text-amber-400" />
            <span className="text-[10px] text-slate-500">Confidence:{" "}
              <span className={`font-black ${confScore > 0.7 ? "text-emerald-300" : confScore > 0.4 ? "text-amber-300" : "text-rose-300"}`}>
                {(confScore * 100).toFixed(0)}%
              </span>
            </span>
          </div>
          {topSignal && (
            <div className="flex items-center gap-1.5">
              {topSignal.signalType === "BUY" ? <TrendingUp size={11} className="text-emerald-400" /> : <TrendingDown size={11} className="text-rose-400" />}
              <span className="text-[10px] text-slate-500">Top: <span className="font-black text-white">{topSignal.symbol} {topSignal.signalType} {topSignal.confidence.toFixed(0)}%</span></span>
            </div>
          )}
        </div>

        {/* Info panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden border-t border-white/[0.04]">
              <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
                {[
                  { label: "AI Engine",   value: "OLOS + Claude", icon: Brain,   color: "text-cyan-400"    },
                  { label: "Models active", value: "12",                                                                icon: Cpu,     color: "text-violet-400" },
                  { label: "Signal cycle",  value: "60s",                                                               icon: RefreshCw, color: "text-amber-400" },
                  { label: "Positions",     value: String(positions.length),                                             icon: Maximize2, color: "text-emerald-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon size={13} className={color} />
                    <div>
                      <p className="text-[9px] text-slate-600">{label}</p>
                      <p className="text-[12px] font-black text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ scrollbarWidth: "thin" }}>
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {streaming && messages[messages.length - 1]?.streaming !== true && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick prompts ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.04] px-5 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => void sendMessage(p)} disabled={streaming}
              className="shrink-0 rounded-full border border-slate-700/60 bg-slate-900/40 px-3 py-1.5 text-[11px] text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-40">
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.05] bg-[#060a12] px-5 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Chiedi a OLOS..."
            disabled={streaming}
            className="flex-1 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-[13px] text-white placeholder-slate-500 outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/10 disabled:opacity-50"
          />
          <button type="submit" disabled={streaming || !input.trim()}
            className="rounded-xl bg-cyan-400 px-4 py-3 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300 disabled:opacity-40">
            <Send size={16} />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-slate-700">
          OLOS AI utilizza dati live di mercato · Non costituisce consulenza finanziaria
        </p>
      </div>
    </div>
  );
}

export { OLOSAssistant };
