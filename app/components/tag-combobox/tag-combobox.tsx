import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
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
// Used in the edit dialog and the list's add bar.
export function TagCombobox({
  label,
  hideLabel,
  placeholder,
  className,
  inputClassName,
  tags,
  value,
  onChange,
  onEnter,
}: {
  label: string;
  hideLabel?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  tags: string[];
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  // Each instance anchors its own list; with a shared name the dialog's list
  // could attach to the add bar's input. useId's characters aren't all valid
  // in a CSS name, so keep the safe ones.
  const anchorName = `--tag-combobox-${id.replace(/[^\w-]/g, "")}`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Only typing filters. Opening shows every tag, so an already chosen tag
  // doesn't narrow the list to itself.
  const [filtering, setFiltering] = useState(false);

  const current = value.trim().toLowerCase();
  const query = filtering ? value.trim() : "";
  const matches = tags.filter((tag) => tag.toLowerCase().includes(query.toLowerCase()));
  const isNew = query !== "" && !tags.some((tag) => tag.toLowerCase() === query.toLowerCase());
  const options = [
    ...matches.map((tag) => ({ value: tag, label: tag })),
    ...(isNew ? [{ value: query, label: `Add "${query}"` }] : []),
  ];
  const expanded = open && options.length > 0;

  function openList() {
    if (open) return;
    setOpen(true);
    setFiltering(false);
    setActiveIndex(-1);
  }
  const activeOption = expanded ? options[activeIndex] : undefined;

  const listboxRef = useRef<HTMLUListElement>(null);
  useEffect(
    function syncPopover() {
      const listbox = listboxRef.current;
      if (!listbox || listbox.matches(":popover-open") === expanded) return;
      if (expanded) listbox.showPopover();
      else listbox.hidePopover();
    },
    [expanded],
  );

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function pick(tag: string) {
    onChange(tag);
    setOpen(false);
    setFiltering(false);
    setActiveIndex(-1);
  }

  function moveActive(step: 1 | -1) {
    if (!expanded) {
      // Opening shows every tag, so index into the full list.
      setOpen(true);
      setFiltering(false);
      setActiveIndex(step === 1 ? 0 : tags.length - 1);
      return;
    }
    setActiveIndex((index) => (index + step + options.length) % options.length);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        moveActive(e.key === "ArrowDown" ? 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (activeOption) pick(activeOption.value);
        else onEnter();
        break;
      case "Escape":
        if (!expanded) break;
        // Stops the keypress becoming the dialog's close request.
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
    }
  }

  return (
    <div className={[styles.combobox, className].filter(Boolean).join(" ")}>
      {hideLabel ? (
        <VisuallyHidden>
          <label htmlFor={id}>{label}</label>
        </VisuallyHidden>
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
      <input
        id={id}
        // A caller's class replaces the default look rather than mixing with it.
        className={inputClassName ?? styles.input}
        style={{ anchorName }}
        placeholder={placeholder}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={activeOption ? `${id}-option-${activeIndex}` : undefined}
        autoComplete="off"
        enterKeyHint="done"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
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
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        aria-label="Suggestions"
        popover="manual"
        className={styles.listbox}
        style={{ positionAnchor: anchorName }}
      >
        {options.map((option, index) => (
          <li
            key={option.label}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            data-current={option.value.toLowerCase() === current}
            className={styles.option}
            // Keeps focus in the input, so blur doesn't close the list first.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => pick(option.value)}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
