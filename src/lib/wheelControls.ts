// Global mouse-wheel adjustments for select dropdowns and numeric/range inputs.

interface WheelOptionLike {
  disabled: boolean;
}

interface WheelSelectControl {
  tagName: string;
  disabled: boolean;
  multiple: boolean;
  size: number;
  selectedIndex: number;
  options: ArrayLike<WheelOptionLike>;
  dispatchEvent(event: Event): boolean;
}

interface WheelInputControl {
  tagName: string;
  type: string;
  disabled: boolean;
  readOnly: boolean;
  value: string;
  min: string;
  max: string;
  step: string;
  dispatchEvent(event: Event): boolean;
}

type WheelControl =
  | { kind: "select"; el: WheelSelectControl }
  | { kind: "input"; el: WheelInputControl };

const CONTROL_SELECTOR = "select, input[type='number'], input[type='range']";

function parseBound(raw: string): number | null {
  if (!raw || raw.trim().length === 0) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStep(raw: string): number {
  if (!raw || raw.trim().toLowerCase() === "any") return 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function stepDecimals(step: number): number {
  const text = String(step).toLowerCase();
  if (text.includes("e-")) {
    const [base, exp] = text.split("e-");
    const frac = base.includes(".") ? base.split(".")[1].length : 0;
    return frac + Number(exp);
  }
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function stepNumericValue(options: {
  raw: string;
  min: string;
  max: string;
  step: string;
  direction: 1 | -1;
}): string | null {
  const step = parseStep(options.step);
  const min = parseBound(options.min);
  const max = parseBound(options.max);
  const trimmed = options.raw.trim();
  const parsedCurrent = trimmed.length > 0 ? Number(trimmed) : Number.NaN;

  let next: number;
  if (Number.isFinite(parsedCurrent)) {
    next = parsedCurrent + options.direction * step;
  } else if (options.direction > 0) {
    next = min != null && min > 0 ? min : (min ?? 0) + step;
  } else {
    next = min != null ? min : -step;
  }

  if (min != null && next < min) next = min;
  if (max != null && next > max) next = max;

  const decimals = stepDecimals(step);
  const rounded = decimals > 0 ? Number(next.toFixed(decimals)) : Math.round(next);
  const normalized = rounded === 0 ? 0 : rounded;
  const formatted = String(normalized);
  return formatted === trimmed ? null : formatted;
}

function nextEnabledOptionIndex(
  options: ArrayLike<WheelOptionLike>,
  currentIndex: number,
  direction: 1 | -1,
): number {
  const length = options.length;
  if (length === 0) return -1;

  if (currentIndex < 0 || currentIndex >= length) {
    const start = direction > 0 ? 0 : length - 1;
    for (let idx = start; idx >= 0 && idx < length; idx += direction) {
      if (!options[idx].disabled) return idx;
    }
    return -1;
  }

  for (let idx = currentIndex + direction; idx >= 0 && idx < length; idx += direction) {
    if (!options[idx].disabled) return idx;
  }
  return currentIndex;
}

function resolveElement(target: EventTarget | null): { closest(selector: string): unknown } | null {
  if (!target || typeof target !== "object") return null;
  if ("closest" in target && typeof (target as { closest?: unknown }).closest === "function") {
    return target as { closest(selector: string): unknown };
  }
  const parent = (target as { parentElement?: unknown }).parentElement;
  if (
    parent &&
    typeof parent === "object" &&
    "closest" in parent &&
    typeof (parent as { closest?: unknown }).closest === "function"
  ) {
    return parent as { closest(selector: string): unknown };
  }
  return null;
}

function findWheelControl(target: EventTarget | null): WheelControl | null {
  const host = resolveElement(target);
  if (!host) return null;
  const match = host.closest(CONTROL_SELECTOR);
  if (!match || typeof match !== "object" || !("tagName" in match)) return null;

  const tag = String((match as { tagName: unknown }).tagName).toUpperCase();
  if (tag === "SELECT") {
    const el = match as WheelSelectControl;
    if (el.disabled || el.multiple || el.size > 1) return null;
    return { kind: "select", el };
  }
  if (tag === "INPUT") {
    const el = match as WheelInputControl;
    const type = String(el.type || "").toLowerCase();
    if (el.disabled || el.readOnly || (type !== "number" && type !== "range")) return null;
    return { kind: "input", el };
  }
  return null;
}

function notifyControlChange(el: { dispatchEvent(event: Event): boolean }): void {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

interface WheelHost {
  addEventListener(
    type: "wheel",
    listener: (event: WheelEvent) => void,
    options?: { passive?: boolean },
  ): void;
  removeEventListener(type: "wheel", listener: (event: WheelEvent) => void): void;
}

/** Enables mouse-wheel stepping on select dropdowns and numeric/range inputs. */
export function installWheelControls(host: WheelHost = document): () => void {
  const onWheel = (event: WheelEvent): void => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.deltaY === 0) return;

    const control = findWheelControl(event.target);
    if (!control) return;

    event.preventDefault();

    if (control.kind === "select") {
      const direction: 1 | -1 = event.deltaY > 0 ? 1 : -1;
      const nextIndex = nextEnabledOptionIndex(
        control.el.options,
        control.el.selectedIndex,
        direction,
      );
      if (nextIndex >= 0 && nextIndex !== control.el.selectedIndex) {
        control.el.selectedIndex = nextIndex;
        notifyControlChange(control.el);
      }
      return;
    }

    const direction: 1 | -1 = event.deltaY < 0 ? 1 : -1;
    const nextValue = stepNumericValue({
      raw: control.el.value,
      min: control.el.min,
      max: control.el.max,
      step: control.el.step,
      direction,
    });
    if (nextValue !== null && nextValue !== control.el.value) {
      control.el.value = nextValue;
      notifyControlChange(control.el);
    }
  };

  host.addEventListener("wheel", onWheel, { passive: false });
  return () => host.removeEventListener("wheel", onWheel);
}
