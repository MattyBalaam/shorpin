import { createLink, type LinkComponent, useRouterState } from "@tanstack/solid-router";
import type { JSX } from "@solidjs/web";
import { omit, Show } from "solid-js";
import { Spinner } from "~/components/spinner/spinner";
import * as clickableStyles from "~/components/shared/clickable-element.css";

interface StyledAnchorProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: keyof typeof clickableStyles.variant;
}

function StyledAnchor(props: StyledAnchorProps) {
  const rest = omit(props, "variant", "class", "children");
  // Spinner while a navigation to this link's target is loading.
  const isLoading = useRouterState({
    select: (state) =>
      state.status === "pending" &&
      state.location.pathname ===
        new URL(typeof props.href === "string" ? props.href : "", "http://x").pathname,
  });

  return (
    <a class={[props.class, clickableStyles.variant[props.variant ?? "link"]]} {...rest}>
      {props.children}
      <Show when={isLoading()}>
        <Spinner />
      </Show>
    </a>
  );
}

// createLink wires our anchor into the router: type-checked `to`/`params`,
// client navigation, preloading and active state.
const RouterLink = createLink(StyledAnchor);

export const Link: LinkComponent<typeof StyledAnchor> = (props) => <RouterLink {...props} />;
