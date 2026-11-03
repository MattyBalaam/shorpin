import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  dismissAllNotifications,
  dismissNotification,
  getNotifications,
  getTimeLeft,
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

  test("pauses a success's countdown while held, then resumes it", () => {
    toast.success("done");
    vi.advanceTimersByTime(2000);
    holdNotifications(true);
    vi.advanceTimersByTime(10_000);
    expect(messages()).toEqual(["done"]);
    expect(getTimeLeft("success:done")).toBe(3000);
    holdNotifications(false);
    vi.advanceTimersByTime(2999);
    expect(messages()).toEqual(["done"]);
    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });

  test("restarts the countdown when a success is shown again", () => {
    toast.success("done");
    vi.advanceTimersByTime(4000);
    toast.success("done");
    expect(getTimeLeft("success:done")).toBe(5000);
  });
});
