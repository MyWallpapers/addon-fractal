import type { CanvasAddonMountContext } from "../generated/mywallpaper-runtime";
import "./style.css";
export function mount(context: CanvasAddonMountContext) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Fractale de Mandelbrot");
  context.layer.root.replaceChildren(canvas);
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas 2D indisponible");
  let values = context.layer.settings.get(),
    frame = 0,
    alive = true;
  const rgb = (value: string) =>
    [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  const render = () => {
    frame = 0;
    if (!alive) return;
    const bounds = context.layer.root.getBoundingClientRect(),
      ratio =
        (bounds.width || context.runtime.instance.width) /
        Math.max(1, bounds.height || context.runtime.instance.height);
    const width = 320,
      height = Math.max(
        1,
        Math.min(320, Math.round(width / Math.max(0.1, ratio))),
      );
    canvas.width = width;
    canvas.height = height;
    const pixels = g.createImageData(width, height),
      iterations = Number(values.iterations ?? 80),
      zoom = Number(values.zoom ?? 1),
      cx = Number(values.centerX ?? -0.65),
      cy = Number(values.centerY ?? 0);
    const background = rgb(String(values.background ?? "#0b151b")),
      accent = rgb(String(values.accent ?? "#b89b78"));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const real = cx + ((x / width - 0.5) * 3.5) / zoom,
          imag = cy + ((y / height - 0.5) * 3.5) / zoom / ratio;
        let zr = 0,
          zi = 0,
          n = 0;
        while (zr * zr + zi * zi <= 256 && n < iterations) {
          const next = zr * zr - zi * zi + real;
          zi = 2 * zr * zi + imag;
          zr = next;
          n++;
        }
        const smooth =
          n < iterations
            ? n +
              1 -
              Math.log2(Math.max(1, Math.log2(Math.sqrt(zr * zr + zi * zi))))
            : 0;
        const light =
            n === iterations
              ? 0
              : Math.pow(Math.max(0, Math.min(1, smooth / 28)), 0.85),
          offset = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++)
          pixels.data[offset + channel] = Math.round(
            background[channel]! +
              (accent[channel]! - background[channel]!) * light,
          );
        pixels.data[offset + 3] = 255;
      }
    g.putImageData(pixels, 0, 0);
  };
  const schedule = () => {
    if (alive && !frame) frame = requestAnimationFrame(render);
  };
  const stop = context.layer.settings.subscribe((next) => {
    values = next;
    schedule();
  });
  const observer = new ResizeObserver(schedule);
  observer.observe(context.layer.root);
  render();
  return () => {
    alive = false;
    stop();
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.remove();
  };
}
