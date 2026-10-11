import { type ComponentProps, lazy, Suspense, useEffect, useState } from "react";
import { loadSonner, markToasterReady } from "~/lib/toast";

const SonnerToaster = lazy(() => loadSonner().then((m) => ({ default: m.Toaster })));

function ToasterReady() {
  // Sibling after <SonnerToaster>, so this effect runs after Sonner's own
  // subscribe effect — toasts flushed from the queue won't be dropped.
  useEffect(markToasterReady, []);
  return null;
}

export function Toaster(props: ComponentProps<typeof SonnerToaster>) {
  // Client-only: rendering it during SSR would make hydration wait on the
  // sonner chunk, putting it back on the critical path.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  return (
    <Suspense fallback={null}>
      <SonnerToaster {...props} />
      <ToasterReady />
    </Suspense>
  );
}
