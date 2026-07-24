import { describe, expect, it } from 'vitest';
import type { OcrResultItem } from '@paddleocr/paddleocr-js';
import { chooseCompanyNameCandidate, findCompanyNameRoi, paddleItemsToLines } from './paddleOcrEngine';

describe('paddleItemsToLines', () => {
  it('将 PaddleOCR 多边形、分数和文字转换为统一行结构', () => {
    const items: OcrResultItem[] = [
      {
        text: ' 统一社会信用代码  ',
        score: 0.96,
        poly: [[10, 20], [110, 18], [112, 42], [9, 44]],
      },
      {
        text: '   ',
        score: 0.4,
        poly: [[0, 0], [1, 0], [1, 1], [0, 1]],
      },
    ];

    expect(paddleItemsToLines(items)).toEqual([
      {
        text: '统一社会信用代码',
        confidence: 96,
        bbox: { x0: 9, y0: 18, x1: 112, y1: 44 },
      },
    ]);
  });

  it('约束异常置信度到 0 至 100', () => {
    const items: OcrResultItem[] = [
      { text: 'A', score: 1.2, poly: [[0, 0], [1, 0], [1, 1], [0, 1]] },
      { text: 'B', score: -0.2, poly: [[2, 2], [3, 2], [3, 3], [2, 3]] },
    ];

    expect(paddleItemsToLines(items).map((line) => line.confidence)).toEqual([100, 0]);
  });

  it('根据名称标签生成右侧放大识别区域', () => {
    const roi = findCompanyNameRoi([
      { text: '名称：', confidence: 92, bbox: { x0: 30, y0: 200, x1: 100, y1: 220 } },
    ], { width: 1000, height: 800 });

    expect(roi).not.toBeNull();
    expect(roi?.x).toBe(103);
    expect(roi?.y).toBe(186);
    expect(roi?.scale).toBe(3.6);
  });

  it('名称标签被拆散时合并名、称两个框定位值区域', () => {
    const roi = findCompanyNameRoi([
      { text: '统一社会信用代码：91110108MA00ABC123', confidence: 99, bbox: { x0: 260, y0: 310, x1: 590, y1: 330 } },
      { text: '名', confidence: 90, bbox: { x0: 260, y0: 342, x1: 280, y1: 362 } },
      { text: '称', confidence: 90, bbox: { x0: 320, y0: 342, x1: 340, y1: 362 } },
    ], { width: 1024, height: 1024 });

    expect(roi?.x).toBe(343);
    expect(roi?.y).toBe(328);
    expect(roi?.height).toBe(50);
  });

  it('没有完整或分离名称标签时使用信用代码行推算名称区域', () => {
    const roi = findCompanyNameRoi([
      { text: '统一社会信用代码：91110108MA00ABC123', confidence: 99, bbox: { x0: 260, y0: 310, x1: 590, y1: 330 } },
    ], { width: 1024, height: 1024 });

    expect(roi?.x).toBe(250);
    expect(roi?.y).toBe(334);
  });

  it('名称区域多版本结果优先选择带企业后缀的候选', () => {
    const candidate = chooseCompanyNameCandidate([
      [{ text: '悦动科技有限公可', confidence: 94, bbox: { x0: 0, y0: 0, x1: 100, y1: 20 } }],
      [{ text: '悦动科技有限公司', confidence: 90, bbox: { x0: 0, y0: 0, x1: 100, y1: 20 } }],
    ]);

    expect(candidate?.value).toBe('悦动科技有限公司');
  });
});
