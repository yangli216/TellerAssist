export type ImageQualityIssue = 'LOW_RESOLUTION' | 'BLURRY' | 'LOW_CONTRAST';

export interface ImageQualityReport {
  width: number;
  height: number;
  contrast: number;
  sharpness: number;
  issues: ImageQualityIssue[];
}

export interface DocumentPreprocessResult {
  imageSource: string;
  quality: ImageQualityReport;
  corrected: boolean;
  correctionSummary: string[];
}

interface Point { x: number; y: number }
interface DocumentQuad { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }

const loadImage = async (source: string) => {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
};

const createAnalysisCanvas = (image: HTMLImageElement, maxSide = 720) => {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('无法创建图像质量分析画布');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, context, scale };
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const assessQuality = (image: HTMLImageElement): ImageQualityReport => {
  const { canvas, context } = createAnalysisCanvas(image, 480);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const gray = new Float32Array(canvas.width * canvas.height);
  let sum = 0;
  let sumSquared = 0;
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    const value = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
    gray[index] = value;
    sum += value;
    sumSquared += value * value;
  }
  const mean = sum / Math.max(1, gray.length);
  const contrast = Math.sqrt(Math.max(0, sumSquared / Math.max(1, gray.length) - mean * mean));
  let laplacianSum = 0;
  let laplacianSquaredSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < canvas.width - 1; x += 1) {
      const index = y * canvas.width + x;
      const laplacian = gray[index - 1] + gray[index + 1]
        + gray[index - canvas.width] + gray[index + canvas.width] - gray[index] * 4;
      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian * laplacian;
      laplacianCount += 1;
    }
  }
  const laplacianMean = laplacianSum / Math.max(1, laplacianCount);
  const sharpness = Math.max(0, laplacianSquaredSum / Math.max(1, laplacianCount) - laplacianMean ** 2);
  const issues: ImageQualityIssue[] = [];
  if (Math.max(image.naturalWidth, image.naturalHeight) < 1000) issues.push('LOW_RESOLUTION');
  if (sharpness < 70) issues.push('BLURRY');
  if (contrast < 28) issues.push('LOW_CONTRAST');
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    contrast: Math.round(contrast * 10) / 10,
    sharpness: Math.round(sharpness),
    issues,
  };
};

const detectDocumentQuad = (image: HTMLImageElement): DocumentQuad | null => {
  const { canvas, context, scale } = createAnalysisCanvas(image);
  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);
  const borderSamples: Array<[number, number, number]> = [];
  const stride = Math.max(1, Math.floor(Math.min(width, height) / 80));
  for (let x = 0; x < width; x += stride) {
    for (const y of [0, Math.max(0, height - 1)]) {
      const offset = (y * width + x) * 4;
      borderSamples.push([data[offset], data[offset + 1], data[offset + 2]]);
    }
  }
  for (let y = 0; y < height; y += stride) {
    for (const x of [0, Math.max(0, width - 1)]) {
      const offset = (y * width + x) * 4;
      borderSamples.push([data[offset], data[offset + 1], data[offset + 2]]);
    }
  }
  const background = [0, 1, 2].map((channel) => median(borderSamples.map((sample) => sample[channel])));
  const rowSpans: Array<{ y: number; left: number; right: number; count: number }> = [];
  for (let y = 0; y < height; y += 1) {
    let left = width;
    let right = -1;
    let count = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const colorDistance = Math.sqrt(
        (data[offset] - background[0]) ** 2
        + (data[offset + 1] - background[1]) ** 2
        + (data[offset + 2] - background[2]) ** 2,
      );
      if (colorDistance > 42) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        count += 1;
      }
    }
    if (right > left && right - left > width * 0.28 && count > width * 0.16) {
      rowSpans.push({ y, left, right, count });
    }
  }
  if (rowSpans.length < height * 0.3) return null;

  const top = rowSpans[Math.floor(rowSpans.length * 0.03)].y;
  const bottom = rowSpans[Math.floor(rowSpans.length * 0.97)].y;
  if (bottom - top < height * 0.35) return null;
  const sampleAt = (targetY: number) => {
    const tolerance = Math.max(3, Math.round(height * 0.025));
    const nearby = rowSpans.filter((row) => Math.abs(row.y - targetY) <= tolerance);
    return { left: median(nearby.map((row) => row.left)), right: median(nearby.map((row) => row.right)) };
  };
  const topSpan = sampleAt(top + (bottom - top) * 0.04);
  const bottomSpan = sampleAt(bottom - (bottom - top) * 0.04);
  const polygonAreaRatio = ((topSpan.right - topSpan.left + bottomSpan.right - bottomSpan.left) / 2)
    * (bottom - top) / (width * height);
  if (polygonAreaRatio < 0.24) return null;

  const inverseScale = 1 / scale;
  const quad: DocumentQuad = {
    topLeft: { x: topSpan.left * inverseScale, y: top * inverseScale },
    topRight: { x: topSpan.right * inverseScale, y: top * inverseScale },
    bottomRight: { x: bottomSpan.right * inverseScale, y: bottom * inverseScale },
    bottomLeft: { x: bottomSpan.left * inverseScale, y: bottom * inverseScale },
  };
  const horizontalSkew = Math.abs(quad.topLeft.x - quad.bottomLeft.x)
    + Math.abs(quad.topRight.x - quad.bottomRight.x);
  const croppedArea = 1 - polygonAreaRatio;
  return croppedArea > 0.08 || horizontalSkew > image.naturalWidth * 0.025 ? quad : null;
};

const drawTriangle = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: [Point, Point, Point],
  destination: [Point, Point, Point],
) => {
  const [s0, s1, s2] = source;
  const [d0, d1, d2] = destination;
  const denominator = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denominator) < 0.001) return;
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denominator;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denominator;
  const e = (d0.x * (s1.x * s2.y - s2.x * s1.y)
    + d1.x * (s2.x * s0.y - s0.x * s2.y)
    + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denominator;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denominator;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denominator;
  const f = (d0.y * (s1.x * s2.y - s2.x * s1.y)
    + d1.y * (s2.x * s0.y - s0.x * s2.y)
    + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denominator;
  context.save();
  context.beginPath();
  context.moveTo(d0.x, d0.y);
  context.lineTo(d1.x, d1.y);
  context.lineTo(d2.x, d2.y);
  context.closePath();
  context.clip();
  context.setTransform(a, b, c, d, e, f);
  context.drawImage(image, 0, 0);
  context.restore();
};

const rectifyDocument = (image: HTMLImageElement, quad: DocumentQuad) => {
  const topWidth = Math.hypot(quad.topRight.x - quad.topLeft.x, quad.topRight.y - quad.topLeft.y);
  const bottomWidth = Math.hypot(quad.bottomRight.x - quad.bottomLeft.x, quad.bottomRight.y - quad.bottomLeft.y);
  const leftHeight = Math.hypot(quad.bottomLeft.x - quad.topLeft.x, quad.bottomLeft.y - quad.topLeft.y);
  const rightHeight = Math.hypot(quad.bottomRight.x - quad.topRight.x, quad.bottomRight.y - quad.topRight.y);
  const width = Math.max(1, Math.round((topWidth + bottomWidth) / 2));
  const height = Math.max(1, Math.round((leftHeight + rightHeight) / 2));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建证照透视矫正画布');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  const destination = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: width, y: 0 },
    bottomRight: { x: width, y: height },
    bottomLeft: { x: 0, y: height },
  };
  drawTriangle(context, image,
    [quad.topLeft, quad.topRight, quad.bottomRight],
    [destination.topLeft, destination.topRight, destination.bottomRight]);
  drawTriangle(context, image,
    [quad.topLeft, quad.bottomRight, quad.bottomLeft],
    [destination.topLeft, destination.bottomRight, destination.bottomLeft]);
  return canvas.toDataURL('image/png');
};

export const rotateImageSource = async (source: string, rotation: 0 | 90 | 180 | 270) => {
  if (rotation === 0) return source;
  const image = await loadImage(source);
  const swapsSides = rotation === 90 || rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swapsSides ? image.naturalHeight : image.naturalWidth;
  canvas.height = swapsSides ? image.naturalWidth : image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建方向纠正画布');
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(rotation * Math.PI / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas.toDataURL('image/png');
};

export const preprocessDocumentImage = async (source: string): Promise<DocumentPreprocessResult> => {
  const original = await loadImage(source);
  const correctionSummary: string[] = [];
  let imageSource = source;
  const quad = detectDocumentQuad(original);
  if (quad) {
    imageSource = rectifyDocument(original, quad);
    correctionSummary.push('已自动裁边并校正拍摄透视');
  }
  const processed = imageSource === source ? original : await loadImage(imageSource);
  const quality = assessQuality(processed);
  return { imageSource, quality, corrected: correctionSummary.length > 0, correctionSummary };
};
