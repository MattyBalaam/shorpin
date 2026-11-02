import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  dismissAllNotifications,
  dismissNotification,
  getNotifications,
  holdNotifications,
  toast,
} from "./toast";

const messages = () => getNotifications().map(({ message }) => message);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  holdNotifications(false);
  dismissAllNotifications();
  vi.useRealTimers();
});

describe("toast", () => {
  test("puts the newest first", () => {
    toast.info("first");
    toast.error("second");
    expect(messages()).toEqual(["second", "first"]);
  });

  test("moves a repeat to the front instead of duplicating it", () => {
    toast.info("again");
    toast.info("other");
    toast.info("again");
    expect(messages()).toEqual(["again", "other"]);
  });

  test("dismisses one or all", () => {
    toast.info("first");
    toast.info("second");
    dismissNotification("info:second");
    expect(messages()).toEqual(["first"]);
    dismissAllNotifications();
    expect(messages()).toEqual([]);
  });

  test("clears successes after a delay, but keeps everything else", () => {
    toast.success("done");
    toast.error("failed");
    toast.success("reload?", { action: { label: "Reload", onClick: () => {} } });
    vi.advanceTimersByTime(5000);
    expect(messages()).toEqual(["reload?", "failed"]);
  });

  test("holds a success while the panel is held, then gives it a fresh delay", () => {
    toast.success("done");
    holdNotifications(true);
    vi.advanceTimersByTime(6000);
    expect(messages()).toEqual(["done"]);
    holdNotifications(false);
    vi.advanceTimersByTime(4000);
    expect(messages()).toEqual(["done"]);
    vi.advanceTimersByTime(1000);
    expect(messages()).toEqual([]);
  });
});
