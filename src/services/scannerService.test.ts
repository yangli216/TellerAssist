import { afterEach, describe, expect, it } from 'vitest';
import { sampleScenes } from '../mock/sampleData';
import { captureDocument, registerScannerAdapter, ScannerAdapter } from './scannerService';

const sampleAdapter: ScannerAdapter = {
  id: 'test-device',
  displayName: '测试采集设备',
  mode: 'DEVICE',
  isReady: async () => true,
  capture: async () => ({ imageSource: 'data:image/png;base64,test', deviceId: 'test-device', capturedAt: '2026-01-01T00:00:00.000Z' }),
};

afterEach(() => registerScannerAdapter(sampleAdapter));

describe('采集设备适配层', () => {
  it('将场景传递给当前设备适配器', async () => {
    registerScannerAdapter(sampleAdapter);
    const result = await captureDocument(sampleScenes.ACCOUNT_CANCEL);
    expect(result.deviceId).toBe('test-device');
    expect(result.imageSource).toContain('data:image/png');
  });

  it('设备未就绪时不进入 OCR', async () => {
    registerScannerAdapter({ ...sampleAdapter, isReady: async () => false });
    await expect(captureDocument(sampleScenes.ACCOUNT_CANCEL)).rejects.toThrow('未就绪');
  });
});
