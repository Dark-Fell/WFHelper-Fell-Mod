import { describe, expect, it, vi } from "vitest";
import { installWheelControls } from "../../../src/lib/wheelControls.js";

function createFakeHost() {
  let listener: ((event: WheelEvent) => void) | null = null;
  let capturedOptions: { passive?: boolean } | undefined;

  const host = {
    addEventListener: vi.fn(
      (_type: "wheel", fn: (event: WheelEvent) => void, options?: { passive?: boolean }) => {
        listener = fn;
        capturedOptions = options;
      },
    ),
    removeEventListener: vi.fn((_type: "wheel", fn: (event: WheelEvent) => void) => {
      if (listener === fn) listener = null;
    }),
  };

  function fireWheel(
    target: unknown,
    deltaY: number,
    extra: Partial<{ defaultPrevented: boolean; ctrlKey: boolean; metaKey: boolean }> = {},
  ) {
    const preventDefault = vi.fn();
    listener?.({
      target,
      deltaY,
      defaultPrevented: extra.defaultPrevented ?? false,
      ctrlKey: extra.ctrlKey ?? false,
      metaKey: extra.metaKey ?? false,
      preventDefault,
    } as unknown as WheelEvent);
    return { preventDefault };
  }

  return { host, fireWheel, getOptions: () => capturedOptions };
}

function createFakeSelect(options: {
  values: Array<{ value: string; disabled?: boolean }>;
  selectedIndex?: number;
  disabled?: boolean;
  multiple?: boolean;
  size?: number;
}) {
  const dispatched: string[] = [];
  const el = {
    tagName: "SELECT",
    disabled: options.disabled ?? false,
    multiple: options.multiple ?? false,
    size: options.size ?? 0,
    selectedIndex: options.selectedIndex ?? 0,
    options: options.values.map((entry) => ({
      value: entry.value,
      disabled: entry.disabled ?? false,
    })),
    closest(selector: string) {
      return selector.includes("select") ? el : null;
    },
    dispatchEvent(event: Event) {
      dispatched.push(event.type);
      return true;
    },
  };
  return { el, dispatched };
}

function createFakeInput(options: {
  type?: string;
  value?: string;
  min?: string;
  max?: string;
  step?: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const dispatched: string[] = [];
  const el = {
    tagName: "INPUT",
    type: options.type ?? "number",
    value: options.value ?? "",
    min: options.min ?? "",
    max: options.max ?? "",
    step: options.step ?? "",
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    closest(selector: string) {
      return selector.includes(`input[type='${el.type}']`) ? el : null;
    },
    dispatchEvent(event: Event) {
      dispatched.push(event.type);
      return true;
    },
  };
  return { el, dispatched };
}

describe("installWheelControls", () => {
  it("registers a non-passive wheel listener and cleans it up on uninstall", () => {
    const { host, getOptions } = createFakeHost();
    const uninstall = installWheelControls(host);

    expect(host.addEventListener).toHaveBeenCalledTimes(1);
    expect(getOptions()).toEqual({ passive: false });

    uninstall();
    expect(host.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it("cycles select options down/up with the wheel and skips disabled options", () => {
    const { host, fireWheel } = createFakeHost();
    installWheelControls(host);

    const { el, dispatched } = createFakeSelect({
      values: [
        { value: "", disabled: true },
        { value: "0" },
        { value: "1", disabled: true },
        { value: "2" },
      ],
      selectedIndex: 1,
    });

    const down = fireWheel(el, 100);
    expect(down.preventDefault).toHaveBeenCalledTimes(1);
    expect(el.selectedIndex).toBe(3);
    expect(dispatched).toEqual(["input", "change"]);

    dispatched.length = 0;
    const atBottom = fireWheel(el, 100);
    expect(atBottom.preventDefault).toHaveBeenCalledTimes(1);
    expect(el.selectedIndex).toBe(3);
    expect(dispatched).toEqual([]);

    const up = fireWheel(el, -100);
    expect(up.preventDefault).toHaveBeenCalledTimes(1);
    expect(el.selectedIndex).toBe(1);
    expect(dispatched).toEqual(["input", "change"]);

    dispatched.length = 0;
    fireWheel(el, -100);
    expect(el.selectedIndex).toBe(1);
    expect(dispatched).toEqual([]);
  });

  it("increments and decrements number inputs respecting min, max and step", () => {
    const { host, fireWheel } = createFakeHost();
    installWheelControls(host);

    const { el, dispatched } = createFakeInput({
      type: "number",
      value: "10",
      min: "1",
      max: "12",
      step: "1",
    });

    const up = fireWheel(el, -100);
    expect(up.preventDefault).toHaveBeenCalledTimes(1);
    expect(el.value).toBe("11");
    expect(dispatched).toEqual(["input", "change"]);

    fireWheel(el, -100);
    expect(el.value).toBe("12");

    dispatched.length = 0;
    fireWheel(el, -100);
    expect(el.value).toBe("12");
    expect(dispatched).toEqual([]);

    fireWheel(el, 100);
    expect(el.value).toBe("11");
  });

  it("handles empty number inputs and fractional range steps without float drift", () => {
    const { host, fireWheel } = createFakeHost();
    installWheelControls(host);

    const emptyPrice = createFakeInput({ type: "number", value: "", min: "1", max: "99999" });
    fireWheel(emptyPrice.el, -100);
    expect(emptyPrice.el.value).toBe("1");

    const emptyFilter = createFakeInput({ type: "number", value: "", min: "0" });
    fireWheel(emptyFilter.el, -100);
    expect(emptyFilter.el.value).toBe("1");

    const slider = createFakeInput({
      type: "range",
      value: "0.1",
      min: "0.1",
      max: "1.5",
      step: "0.2",
    });
    fireWheel(slider.el, -100);
    expect(slider.el.value).toBe("0.3");
  });

  it("ignores disabled, readonly, multi-select, text inputs and modified wheel events", () => {
    const { host, fireWheel } = createFakeHost();
    installWheelControls(host);

    const disabledSelect = createFakeSelect({
      values: [{ value: "a" }, { value: "b" }],
      disabled: true,
    });
    const multiSelect = createFakeSelect({
      values: [{ value: "a" }, { value: "b" }],
      multiple: true,
    });
    const readOnlyNumber = createFakeInput({ type: "number", value: "5", readOnly: true });
    const textInput = createFakeInput({ type: "text", value: "123" });
    const activeNumber = createFakeInput({ type: "number", value: "5" });

    expect(fireWheel(disabledSelect.el, 100).preventDefault).not.toHaveBeenCalled();
    expect(fireWheel(multiSelect.el, 100).preventDefault).not.toHaveBeenCalled();
    expect(fireWheel(readOnlyNumber.el, -100).preventDefault).not.toHaveBeenCalled();
    expect(fireWheel(textInput.el, -100).preventDefault).not.toHaveBeenCalled();
    expect(
      fireWheel(activeNumber.el, -100, { ctrlKey: true }).preventDefault,
    ).not.toHaveBeenCalled();
    expect(fireWheel(activeNumber.el, 0).preventDefault).not.toHaveBeenCalled();
    expect(activeNumber.el.value).toBe("5");
  });
});
