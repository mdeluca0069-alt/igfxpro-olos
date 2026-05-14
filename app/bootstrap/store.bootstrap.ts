const STORE_VERSION_KEY = "olos.store.version";

export async function initializeStores(): Promise<void> {
  if (!localStorage.getItem(STORE_VERSION_KEY)) {
    localStorage.setItem(STORE_VERSION_KEY, "1");
  }
}
