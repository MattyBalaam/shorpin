import { href, redirect, useOutletContext } from "react-router";
import { Button } from "~/components/button/button";
import { Modal } from "~/components/modal/modal";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import { parseItemTag } from "~/lib/item-tag";
import { isNetworkOrServerError } from "~/lib/network-error";
import { toast } from "~/lib/toast";
import type { Route } from "./+types/bin";

import * as styles from "./bin.css";

export { loader } from "./bin.server";

/** What the list page lends the bin through its <Outlet context>. */
export type BinOutletContext = {
  /** Re-adds a value as a new item through the list form. */
  readd: (value: string) => void;
};

// The list may be showing from the offline cache, but the bin has none: stay
// on the list rather than replace it with an error.
export async function clientLoader({ params: { list }, serverLoader }: Route.ClientLoaderArgs) {
  try {
    return await serverLoader();
  } catch (error) {
    if (!isNetworkOrServerError(error)) throw error;
    toast.error("You're offline - connect to see deleted items");
    throw redirect(href("/lists/:list", { list }));
  }
}

export default function Bin({ loaderData: { items }, params: { list } }: Route.ComponentProps) {
  // Undelete goes through the list page's own form rather than a request of
  // its own: mutate_list takes the whole list, so it has to carry the page's
  // current items. The save is a navigation to the list, which closes this
  // dialog.
  const { readd } = useOutletContext<BinOutletContext>();

  return (
    <Modal urlOnClose={href("/lists/:list", { list })} labelledBy="bin-heading">
      <h2 id="bin-heading">Bin</h2>

      <Modal.Body>
        {items.length === 0 ? (
          <p>Nothing in the bin. Deleted items show here.</p>
        ) : (
          <ul className={styles.items}>
            {items.map(({ id, value }) => {
              const { text, tag } = parseItemTag(value);
              return (
                <li key={id} className={styles.item}>
                  <span className={styles.value}>
                    {text}
                    {tag ? <span className={styles.tag}>{tag}</span> : null}
                  </span>
                  <Button variant="outline" type="button" onClick={() => readd(value)}>
                    Undelete<VisuallyHidden> {text}</VisuallyHidden>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal.Body>

      <Modal.Actions>
        <Modal.Close>Close</Modal.Close>
      </Modal.Actions>
    </Modal>
  );
}
