/**
 * Full localStorage stub for sync tests. jsdom's localStorage is not usable
 * here, and the existing per-store stubs leave `key()`/`length` as no-ops —
 * but the snapshot module iterates real keys via `length` + `key(i)`, so it
 * needs a complete, index-aware implementation.
 */
export function installLocalStorageMock(): Storage {
  let store = new Map<string, string>()
  const mock: Storage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => {
      store = new Map()
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    configurable: true,
    writable: true,
  })
  return mock
}
