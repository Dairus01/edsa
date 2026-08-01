import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const smoothstep = (value: number) => {
  const normalized = clamp(value, 0, 1);

  return normalized * normalized * (3 - 2 * normalized);
};

const lerp = (start: number, end: number, progress: number) =>
  start + (end - start) * progress;

export function installPreachingDepth(root: HTMLElement) {
  root.dataset.enhancementRuntime = "edsa-preaching-depth-runtime-v1";
  const layers = Array.from(
    root.querySelectorAll<HTMLElement>("[data-preaching-layer]"),
  );
  const beats = Array.from(
    root.querySelectorAll<HTMLElement>("[data-preaching-beat]"),
  );
  const xOffsets = [0, 54, -42, 38];
  const yOffsets = [0, 18, -10, 10];
  const rotations = [0, 1.8, -1.4, 1.1];
  let refreshFrame: number | null = null;

  const resetLayers = () => {
    layers.forEach((layer) => {
      layer.style.removeProperty("transform");
      layer.style.removeProperty("opacity");
      layer.style.removeProperty("z-index");
    });
    beats.forEach((beat) => {
      beat.style.removeProperty("opacity");
      beat.style.removeProperty("transform");
    });
  };

  const renderProgress = (progress: number) => {
    const focus = progress * Math.max(1, layers.length - 1);

    layers.forEach((layer, index) => {
      let z = -104;
      let scale = 0.93;
      let opacity = Math.max(
        0.025,
        0.17 - Math.abs(index - focus) * 0.045,
      );

      if (focus >= index - 1 && focus < index) {
        const t = smoothstep(focus - (index - 1));

        z = lerp(-104, 36, t);
        scale = lerp(0.93, 1.01, t);
        opacity = lerp(opacity, 1, t);
      } else if (focus >= index && focus <= index + 1) {
        const t = smoothstep(focus - index);

        z = lerp(36, -92, t);
        scale = lerp(1.01, 0.945, t);
        opacity = lerp(1, 0.18, t);
      } else if (focus > index + 1) {
        z = -92;
        scale = 0.945;
        opacity = 0.08;
      }

      layer.style.transform = `translate3d(${xOffsets[index] ?? 0}px, ${
        yOffsets[index] ?? 0
      }px, ${z.toFixed(2)}px) rotate(${(
        rotations[index] ?? 0
      ).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      layer.style.opacity = opacity.toFixed(4);
      layer.style.zIndex = String(
        20 - Math.round(Math.abs(index - focus) * 4),
      );
    });

    beats.forEach((beat, index) => {
      const distance = Math.abs(index - focus);
      const opacity = smoothstep(clamp(1 - distance, 0, 1));
      const y = clamp((index - focus) * 144, -160, 160);

      beat.style.opacity = opacity.toFixed(4);
      beat.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });

    root.dataset.progress = progress.toFixed(4);
    root.dataset.activeBeat = String(Math.round(focus));
  };

  const renderFromGeometry = () => {
    const travel = Math.max(1, root.offsetHeight - window.innerHeight);
    const progress = clamp(
      -root.getBoundingClientRect().top / travel,
      0,
      1,
    );

    renderProgress(progress);
  };

  gsap.registerPlugin(ScrollTrigger);
  root.dataset.depthEnabled = "true";
  const context = gsap.context(() => {
    renderProgress(0);
    ScrollTrigger.create({
      start: 0,
      end: "max",
      invalidateOnRefresh: true,
      onUpdate: renderFromGeometry,
      onRefresh: renderFromGeometry,
    });
  }, root);
  refreshFrame = window.requestAnimationFrame(() => {
    refreshFrame = null;
    ScrollTrigger.refresh();
  });

  return () => {
    context.revert();
    if (refreshFrame !== null) {
      window.cancelAnimationFrame(refreshFrame);
    }
    resetLayers();
    root.dataset.depthEnabled = "false";
    root.dataset.progress = "static";
    delete root.dataset.enhancementRuntime;
  };
}
