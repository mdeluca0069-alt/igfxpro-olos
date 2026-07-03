import { create } from "zustand";
import { WatchlistAPI } from "../api/endpoints/watchlist";
import type { WatchlistRow } from "../api/endpoints/watchlist";

type WatchlistState = {
  lists:         WatchlistRow[];
  activeListId:  string | null;
  loading:       boolean;
  error:         string | null;

  // Derived
  activeList:    WatchlistRow | null;
  favorites:     WatchlistRow | null;

  // Actions
  load:          () => Promise<void>;
  setActiveList: (id: string) => void;

  createList:    (name: string) => Promise<WatchlistRow>;
  renameList:    (id: string, name: string) => Promise<void>;
  deleteList:    (id: string) => Promise<void>;

  addSymbol:     (listId: string, symbol: string) => Promise<void>;
  removeSymbol:  (listId: string, symbol: string) => Promise<void>;
  reorderSymbols:(listId: string, symbols: string[]) => Promise<void>;

  // Favorite-list shortcuts
  addToFavorites:    (symbol: string) => Promise<void>;
  removeFromFavorites: (symbol: string) => Promise<void>;
  isFavorite:        (symbol: string) => boolean;
};

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  lists:        [],
  activeListId: null,
  loading:      false,
  error:        null,

  get activeList() {
    const { lists, activeListId } = get();
    return lists.find((l) => l.id === activeListId) ?? lists[0] ?? null;
  },

  get favorites() {
    return get().lists.find((l) => l.isDefault) ?? null;
  },

  // ── Load ────────────────────────────────────────────────────────────────────

  load: async () => {
    set({ loading: true, error: null });
    try {
      const lists = await WatchlistAPI.getAll();
      const defaultId = lists.find((l) => l.isDefault)?.id ?? lists[0]?.id ?? null;
      set({
        lists,
        activeListId: get().activeListId ?? defaultId,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  setActiveList: (id) => set({ activeListId: id }),

  // ── List CRUD ────────────────────────────────────────────────────────────────

  createList: async (name) => {
    const list = await WatchlistAPI.create(name);
    set((s) => ({ lists: [...s.lists, list] }));
    return list;
  },

  renameList: async (id, name) => {
    const updated = await WatchlistAPI.rename(id, name);
    set((s) => ({ lists: s.lists.map((l) => (l.id === id ? updated : l)) }));
  },

  deleteList: async (id) => {
    await WatchlistAPI.deleteList(id);
    set((s) => {
      const lists      = s.lists.filter((l) => l.id !== id);
      const activeListId =
        s.activeListId === id
          ? (lists.find((l) => l.isDefault)?.id ?? lists[0]?.id ?? null)
          : s.activeListId;
      return { lists, activeListId };
    });
  },

  // ── Symbol mutations ─────────────────────────────────────────────────────────

  addSymbol: async (listId, symbol) => {
    const updated = await WatchlistAPI.addSymbol(listId, symbol.toUpperCase());
    set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
  },

  removeSymbol: async (listId, symbol) => {
    const updated = await WatchlistAPI.removeSymbol(listId, symbol.toUpperCase());
    set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
  },

  reorderSymbols: async (listId, symbols) => {
    const updated = await WatchlistAPI.reorderSymbols(listId, symbols);
    set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
  },

  // ── Favorites shortcuts ──────────────────────────────────────────────────────

  addToFavorites: async (symbol) => {
    const fav = get().favorites;
    if (!fav) return;
    await get().addSymbol(fav.id, symbol);
  },

  removeFromFavorites: async (symbol) => {
    const fav = get().favorites;
    if (!fav) return;
    await get().removeSymbol(fav.id, symbol);
  },

  isFavorite: (symbol) => {
    const fav = get().favorites;
    return fav?.symbols.includes(symbol.toUpperCase()) ?? false;
  },
}));
