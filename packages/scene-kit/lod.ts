// Screen-space LOD also works for an orthographic painting camera: moving that
// camera farther away does not change apparent size, but zooming out does.
export type DetailLevel = 0 | 1 | 2;
export function projectedHeightPixels(options: {
  height: number; viewportHeight: number; zoom: number;
  orthographicSpan?: number; distance?: number; verticalFov?: number;
}) {
  const { height, viewportHeight, zoom } = options;
  if (options.orthographicSpan !== undefined)
    return height * viewportHeight * zoom / Math.max(.001, options.orthographicSpan);
  return height * viewportHeight * zoom /
    (2 * Math.max(.001, options.distance ?? 1) * Math.tan((options.verticalFov ?? 50) * Math.PI / 360));
}
export function chooseDetail(pixels: number, previous: DetailLevel = 1): DetailLevel {
  // Hysteresis avoids flicker when orbiting near a threshold.
  if (previous === 2 && pixels >= 18) return 2;
  if (previous === 0 && pixels <= 10) return 0;
  return pixels >= 22 ? 2 : pixels < 8 ? 0 : 1;
}
