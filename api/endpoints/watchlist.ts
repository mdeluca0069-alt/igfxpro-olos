import { apiGet, apiPost, apiPut, apiDelete } from "../../shared/lib/apiHelpers";

export type WatchlistRow = {
  id:        string;
  userId:    string;
  name:      string;
  symbols:   string[];
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type QuoteMover = {
  symbol:    string;
  bid:       number;
  ask:       number;
  mid:       number;
  spread:    number;
  changePct: number;
  ts:        string;
};

export const WatchlistAPI = {
  // ── Lists ──────────────────────────────────────────────────────────────────

  async getAll(): Promise<WatchlistRow[]> {
    const res = await apiGet<{ watchlists: WatchlistRow[] }>("/api/v1/watchlists");
    return res.watchlists ?? [];
  },

  async create(name: string, symbols: string[] = []): Promise<WatchlistRow> {
    return apiPost<WatchlistRow>("/api/v1/watchlists", { name, symbols });
  },

  async rename(id: string, name: string): Promise<WatchlistRow> {
    return apiPut<WatchlistRow>(`/api/v1/watchlists/${id}/name`, { name });
  },

  async deleteList(id: string): Promise<void> {
    await apiDelete(`/api/v1/watchlists/${id}`);
  },

  // ── Symbols ────────────────────────────────────────────────────────────────

  async addSymbol(id: string, symbol: string): Promise<WatchlistRow> {
    return apiPost<WatchlistRow>(`/api/v1/watchlists/${id}/symbols`, { symbol });
  },

  async removeSymbol(id: string, symbol: string): Promise<WatchlistRow> {
    return apiDelete<WatchlistRow>(`/api/v1/watchlists/${id}/symbols/${encodeURIComponent(symbol)}`);
  },

  async reorderSymbols(id: string, symbols: string[]): Promise<WatchlistRow> {
    return apiPut<WatchlistRow>(`/api/v1/watchlists/${id}/symbols`, { symbols });
  },

  // ── Discovery ──────────────────────────────────────────────────────────────

  async getTopMovers(limit = 10): Promise<QuoteMover[]> {
    const res = await apiGet<{ movers: QuoteMover[] }>(
      `/api/v1/watchlists/top-movers?limit=${limit}`
    );
    return res.movers ?? [];
  },

  async getHotSymbols(limit = 10): Promise<QuoteMover[]> {
    const res = await apiGet<{ hot: QuoteMover[] }>(
      `/api/v1/watchlists/hot-symbols?limit=${limit}`
    );
    return res.hot ?? [];
  },
};

export default WatchlistAPI;
