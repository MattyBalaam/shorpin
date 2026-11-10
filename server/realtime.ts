// In-process fan-out of "this list changed" to the SSE streams open on it
// (see GET /lists/:list/events). One Node process serves the app (a single
// Coolify container), so a Map is the whole pub/sub; more than one instance
// would need a shared channel — Supabase Realtime broadcast or Postgres
// LISTEN/NOTIFY — feeding this same publish().

type Listener = (sourceClientId: string | null) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(listId: string, listener: Listener) {
  let set = listeners.get(listId);
  if (!set) listeners.set(listId, (set = new Set()));
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(listId);
  };
}

export function publish(listId: string, sourceClientId: string | null) {
  for (const listener of listeners.get(listId) ?? []) listener(sourceClientId);
}
