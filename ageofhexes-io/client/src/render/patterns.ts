let stripePattern: CanvasPattern | null = null;

export function getStripePattern(ctx: CanvasRenderingContext2D) {
  if (stripePattern) return stripePattern;

  const size = 12;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const pctx = canvas.getContext("2d")!;
  pctx.strokeStyle = "rgba(0,0,0,0.35)";
  pctx.lineWidth = 3;

  pctx.beginPath();
  pctx.moveTo(0, size);
  pctx.lineTo(size, 0);
  pctx.stroke();

  stripePattern = ctx.createPattern(canvas, "repeat");
  return stripePattern;
}
