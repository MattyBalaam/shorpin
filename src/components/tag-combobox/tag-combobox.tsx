import { createEffect, createSignal, createUniqueId, For, Show } from "solid-js";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import * as styles from "./tag-combobox.css";

// A hybrid combobox (WAI-ARIA APG "list autocomplete") for an item's tag.
// Opening it (focus, click, arrow keys) shows every tag, with the current one
// ticked, like a select. Typing switches to filtering, and a typed tag that
// doesn't exist yet is offered as "Add …".
//
// The listbox floats over the dialog as a manual popover anchored under the
// input (see the CSS). In the top layer, the dialog's scrolling body can't
// clip it, and opening or closing it never moves the dialog's contents.
//
// Enter picks the highlighted option. With nothing highlighted it's left to
// `onEnter` (the edit dialog saves, the add bar adds). Escape closes an open
// list without closing a dialog around it.
//
// Used in the edit dialog and the list's add bar. The add bar sits on the
// keyboard, so it opens the list `above` (see the CSS for why flipping isn't
// enough on iOS).
export function TagCombobox(props: {
  label: string;
  placement?: "below" | "above";
  hideLabel?: boolean;
  placeholder?: string;
  class?: string;
  inputClass?: string;
  tags: string[];
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  const id = createUniqueId();
  const listboxId = `${id}-listbox`;
  // Each instance anchors its own list; with a shared name the dialog's list
  // could attach to the add bar's input. Keep only characters valid in a CSS
  // name.
  const anchorName = `--tag-combobox-${id.replace(/[^\w-]/g, "")}`;
  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal(-1);
  // Only typing filters. Opening shows every tag, so an already chosen tag
  // doesn't narrow the list to itself.
  const [filtering, setFiltering] = createSignal(false);

  const current = () => props.value.trim().toLowerCase();
  const query = () => (filtering() ? props.value.trim() : "");
  const options = () => {
    const q = query().toLowerCase();
    const matches = props.tags.filter((tag) => tag.toLowerCase().includes(q));
    const isNew = q !== "" && !props.tags.some((tag) => tag.toLowerCase() === q);
    return [
      ...matches.map((tag) => ({ value: tag, label: tag })),
      ...(isNew ? [{ value: query(), label: `Add "${query()}"` }] : []),
    ];
  };
  const expanded = () => open() && options().length > 0;
  const activeOption = () => (expanded() ? options()[activeIndex()] : undefined);

  function openList() {
    if (open()) return;
    setOpen(true);
    setFiltering(false);
    setActiveIndex(-1);
  }

  let listbox!: HTMLUListElement;
  createEffect(expanded, (isExpanded) => {
    if (listbox.matches(":popover-open") === isExpanded) return;
    if (isExpanded) listbox.showPopover();
    else listbox.hidePopover();
  });

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function pick(tag: string) {
    props.onChange(tag);
    setOpen(false);
    setFiltering(false);
    setActiveIndex(-1);
  }

  function moveActive(step: 1 | -1) {
    if (!expanded()) {
      // Opening shows every tag, so index into the full list.
      setOpen(true);
      setFiltering(false);
      setActiveIndex(step === 1 ? 0 : props.tags.length - 1);
      return;
    }
    const count = options().length;
    setActiveIndex((index) => (index + step + count) % count);
  }

  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        moveActive(e.key === "ArrowDown" ? 1 : -1);
        break;
      case "Enter": {
        e.preventDefault();
        const option = activeOption();
        if (option) pick(option.value);
        else props.onEnter();
        break;
      }
      case "Escape":
        if (!expanded()) break;
        // Stops the keypress becoming the dialog's close request.
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
    }
  }

  const label = () => <label for={id}>{props.label}</label>;

  return (
    <div class={[styles.combobox, props.class]}>
      <Show when={props.hideLabel} fallback={label()}>
        <VisuallyHidden>{label()}</VisuallyHidden>
      </Show>
      <input
        id={id}
        // A caller's class replaces the default look rather than mixing with it.
        class={props.inputClass ?? styles.input}
        style={{ "anchor-name": anchorName }}
        placeholder={props.placeholder}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded() ? "true" : "false"}
        aria-controls={listboxId}
        aria-activedescendant={activeOption() ? `${id}-option-${activeIndex()}` : undefined}
        autocomplete="off"
        enterkeyhint="done"
        value={props.value}
        // Solid's events are the DOM's: `input` fires per keystroke, where
        // React's onChange did.
        onInput={(e) => {
          props.onChange(e.currentTarget.value);
          setOpen(true);
          setFiltering(true);
          setActiveIndex(-1);
        }}
        onFocus={openList}
        onBlur={close}
        onClick={openList}
        onKeyDown={handleKeyDown}
      />
      <ul
        ref={listbox}
        id={listboxId}
        role="listbox"
        aria-label="Suggestions"
        popover="manual"
        class={[styles.listbox, props.placement === "above" && styles.listboxAbove]}
        style={{ "position-anchor": anchorName }}
      >
        <For each={options()}>
          {(option, index) => (
            <li
              id={`${id}-option-${index()}`}
              role="option"
              aria-selected={index() === activeIndex() ? "true" : "false"}
              data-current={String(option.value.toLowerCase() === current())}
              class={styles.option}
              // Keeps focus in the input, so blur doesn't close the list first.
              // On mousedown, not pointerdown: iOS WebKit drops a tap's click
              // when its pointerdown is cancelled, so the option was never picked.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(option.value)}
            >
              {option.label}
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
