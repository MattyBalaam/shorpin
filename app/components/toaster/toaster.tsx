import { type ComponentProps, Suspense, use, useEffect } from "react";
import { browser } from "react-dom";
import type { Toaster as SonnerToaster } from "sonner";
import { loadSonner, markToasterReady } from "~/lib/toast";

type ToasterProps = ComponentProps<typeof SonnerToaster>;

function LoadedToaster(props: ToasterProps) {
  // Client-only: SSR bails out to the Suspense fallback here. Server-rendered
  // markup would make hydration wait on the sonner chunk, putting it back on
  // the critical path.
  use(browser("Keeps the sonner chunk off the hydration path"));

  // loadSonner() returns the same cached promise every time, as use() needs.
  const { Toaster } = use(loadSonner());

  // Child effects run first, so this runs after Sonner's own subscribe
  // effect — toasts flushed from the queue won't be dropped.
  useEffect(markToasterReady, []);

  return <Toaster {...props} />;
}

export function Toaster(props: ToasterProps) {
  return (
    <Suspense fallback={null}>
      <LoadedToaster {...props} />
    </Suspense>
  );
}
