import { type ComponentProps, Suspense, use, useEffect, useState } from "react";
import type { Toaster as SonnerToaster } from "sonner";
import { loadSonner, markToasterReady } from "~/lib/toast";

type ToasterProps = ComponentProps<typeof SonnerToaster>;

function LoadedToaster(props: ToasterProps) {
  // loadSonner() returns the same cached promise every time, as use() needs.
  const { Toaster } = use(loadSonner());

  // Child effects run first, so this runs after Sonner's own subscribe
  // effect — toasts flushed from the queue won't be dropped.
  useEffect(markToasterReady, []);

  return <Toaster {...props} />;
}

export function Toaster(props: ToasterProps) {
  // Client-only: rendering it during SSR would make hydration wait on the
  // sonner chunk, putting it back on the critical path.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  return (
    <Suspense fallback={null}>
      <LoadedToaster {...props} />
    </Suspense>
  );
}
