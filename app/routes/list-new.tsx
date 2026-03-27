import { AnimatePresence, Reorder } from "motion/react";
import { useState } from "react";
import { Actions } from "~/components/actions/actions";
import { ReorderableItem } from "~/components/reorderable-item";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import * as styles from "./list-new.css";

export type ListItem = {
  id: string;
  value: string;
  edited?: boolean;
};

const MOCK_ITEMS: ListItem[] = [
  { id: "1", value: "Milk" },
  { id: "2", value: "Bread" },
  { id: "3", value: "Eggs" },
  { id: "4", value: "Butter" },
  { id: "5", value: "Cheese" },
  { id: "6", value: "Bananas" },
  { id: "7", value: "Apples" },
  { id: "8", value: "Yogurt" },
  {
    id: "9",
    value:
      "Orange juice Orange juice Orange juice Orange juice Orange juice Orange juice Orange juice Orange juice Orange juice Orange juice ",
  },
  { id: "10", value: "Coffee" },
];

export default function ListNew() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [newItemText, setNewItemText] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleReorder(newOrder: string[]) {
    console.log("handleReorder", newOrder);

    setItems((current) =>
      newOrder
        .map((id) => current.find((item) => item.id === id))
        .filter((item): item is ListItem => item !== undefined),
    );
  }

  function handleDragStart(value: string) {
    setDraggingId(value);
  }

  function handleDragEnd(id: string, info: any) {
    setDraggingId(null);

    if (info.velocity.x < -300) {
      handleDelete(id);
    }

    console.log(
      info.velocity,
      "handleDragEnd",
      items.map((item) => item.id),
    );
  }

  function handleDelete(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function handleEdit(id: string, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              value,
              edited: value !== MOCK_ITEMS.find((m) => m.id === id)?.value,
            }
          : item,
      ),
    );
  }

  function handleAdd() {
    if (!newItemText.trim()) return;

    const newItem: ListItem = {
      id: crypto.randomUUID(),
      value: newItemText.trim(),
    };
    setItems((current) => [...current, newItem]);
    setNewItemText("");
  }

  return (
    <>
      <ScrollArea>
        <Reorder.Group
          as="ul"
          axis="y"
          values={items.map((item) => item.id)}
          onReorder={handleReorder}
          className={styles.list}
        >
          <AnimatePresence>
            {items.map((item) => (
              <ReorderableItem
                key={item.id}
                item={item}
                isDragging={draggingId === item.id}
                onDelete={() => handleDelete(item.id)}
                onDragEnd={(_e, info) => handleDragEnd(item.id, info)}
                onDragStart={() => handleDragStart(item.id)}
                onEdit={(value) => handleEdit(item.id, value)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </ScrollArea>

      <Actions>
        <div className={styles.actions}>
          <VisuallyHidden>
            <label htmlFor="new-item">New item</label>
          </VisuallyHidden>
          <input
            id="new-item"
            className={styles.addInput}
            placeholder="Add new item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <button type="button" className={styles.addButton} onClick={handleAdd}>
            Add
          </button>
        </div>
      </Actions>
    </>
  );
}
