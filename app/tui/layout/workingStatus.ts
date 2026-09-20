import {
  BoxRenderable,
  type CliRenderer,
  parseColor,
  RGBA,
  TextAttributes,
  TextRenderable,
} from "@opentui/core";
import { DIM, WHITE } from "../constants";

export type WorkingStatus = {
  node: BoxRenderable;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

const LABEL = "Working...";

const SHIMMER_MS = 30;
const PHASE_STEP = 0.5;
const SIGMA = 1.6;
const SHADES = 16;
const WAVE_PAD = 3;
const CLOCK_MS = 500;
const REVEAL_MS = 110;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const colorOr = (value: string, fallback: RGBA): RGBA => {
  try {
    return parseColor(value);
  } catch {
    return fallback;
  }
};

const WAVE_SHADES: RGBA[] = (() => {
  const lo = colorOr(DIM, RGBA.fromValues(0.4, 0.4, 0.4, 1));
  const hi = colorOr(WHITE, RGBA.fromValues(1, 1, 1, 1));
  return Array.from({ length: SHADES }, (_, i) => {
    const t = i / (SHADES - 1);
    return RGBA.fromValues(lerp(lo.r, hi.r, t), lerp(lo.g, hi.g, t), lerp(lo.b, hi.b, t), 1);
  });
})();

const FAINT = RGBA.fromValues(0.3, 0.3, 0.3, 1);

const isReducedMotion = (): boolean => {
  const flag = process.env.NO_ANIMATE?.toLowerCase();
  return flag === "1" || flag === "true";
};

export const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

const unref = (timer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>): void => {
  (timer as unknown as { unref?: () => void }).unref?.();
};

const waveIntensity = (distance: number): number =>
  Math.exp(-(distance * distance) / (2 * SIGMA * SIGMA));

export const createWorkingStatus = (renderer: CliRenderer): WorkingStatus => {
  const node = new BoxRenderable(renderer, {
    width: "100%",
    height: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 1,
    marginRight: 1,
    marginTop: 0,
    paddingLeft: 1,
    paddingRight: 1,
    visible: false,
  });

  const staticText = (content: string, fg: string | RGBA): TextRenderable =>
    new TextRenderable(renderer, { content, fg, flexShrink: 0 });

  const letters: TextRenderable[] = LABEL.split("").map(
    (ch) =>
      new TextRenderable(renderer, {
        content: ch,
        fg: WAVE_SHADES[0] ?? DIM,
        attributes: TextAttributes.BOLD,
        flexShrink: 0,
      }),
  );
  for (const letter of letters) node.add(letter);

  const sep = staticText("·", FAINT);
  const clockText = staticText("", DIM);
  node.add(staticText(" ", DIM));
  node.add(sep);
  node.add(staticText(" ", DIM));
  node.add(clockText);

  let active = false;
  let startedAt = 0;
  let shimmer: ReturnType<typeof setInterval> | null = null;
  let clock: ReturnType<typeof setInterval> | null = null;
  let animTimer: ReturnType<typeof setTimeout> | null = null;
  let phase = -WAVE_PAD;

  const clearAnimTimer = (): void => {
    if (animTimer) {
      clearTimeout(animTimer);
      animTimer = null;
    }
  };

  const stopIntervals = (): void => {
    if (shimmer) {
      clearInterval(shimmer);
      shimmer = null;
    }
    if (clock) {
      clearInterval(clock);
      clock = null;
    }
  };

  const paintLetters = (): void => {
    for (let i = 0; i < letters.length; i++) {
      const shade = Math.min(
        SHADES - 1,
        Math.max(0, Math.round(waveIntensity(i - phase) * (SHADES - 1))),
      );
      const letter = letters[i];
      if (letter) letter.fg = WAVE_SHADES[shade] ?? DIM;
    }
  };

  const paintMeta = (): void => {
    clockText.content = formatElapsed(Date.now() - startedAt);
  };

  const after = (ms: number, fn: () => void): void => {
    clearAnimTimer();
    animTimer = setTimeout(fn, ms);
    unref(animTimer);
  };

  const reveal = (): void => {
    node.visible = true;
    node.height = 1;
    node.marginTop = 1;
    if (isReducedMotion()) {
      node.opacity = 1;
      node.translateY = 0;
      renderer.requestRender();
      return;
    }
    node.opacity = 0;
    node.translateY = 1;
    renderer.requestRender();
    after(REVEAL_MS, () => {
      if (!active) return;
      node.translateY = 0;
      node.opacity = 1;
      renderer.requestRender();
    });
  };

  const collapse = (): void => {
    if (isReducedMotion()) {
      node.height = 0;
      node.visible = false;
      node.marginTop = 0;
      renderer.requestRender();
      return;
    }
    node.translateY = 1;
    node.opacity = 0;
    renderer.requestRender();
    after(REVEAL_MS, () => {
      if (active) return;
      node.height = 0;
      node.visible = false;
      node.marginTop = 0;
      renderer.requestRender();
    });
  };

  const startClock = (): void => {
    if (clock) return;
    clock = setInterval(() => {
      if (!active) return;
      paintMeta();
      renderer.requestRender();
    }, CLOCK_MS);
    unref(clock);
  };

  const startShimmer = (): void => {
    if (isReducedMotion() || shimmer) return;
    shimmer = setInterval(() => {
      if (!active) return;
      phase += PHASE_STEP;
      if (phase > letters.length + WAVE_PAD) phase = -WAVE_PAD;
      paintLetters();
      renderer.requestRender();
    }, SHIMMER_MS);
    unref(shimmer);
  };

  const start = (): void => {
    if (active) return;
    active = true;
    startedAt = Date.now();
    phase = -WAVE_PAD;
    paintLetters();
    paintMeta();
    reveal();
    startClock();
    startShimmer();
  };

  const stop = (): void => {
    if (!active) return;
    active = false;
    stopIntervals();
    paintMeta();
    collapse();
  };

  const dispose = (): void => {
    active = false;
    stopIntervals();
    clearAnimTimer();
    node.height = 0;
    node.visible = false;
    node.marginTop = 0;
  };

  return { node, start, stop, dispose };
};
