import { BusinessScene } from '../types/business';

export interface CaptureResult {
  imageSource: string;
  deviceId: string;
  capturedAt: string;
}

export interface ScannerAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly mode: 'DEMO' | 'DEVICE';
  isReady(): Promise<boolean>;
  capture(scene: BusinessScene): Promise<CaptureResult>;
}

class SampleScannerAdapter implements ScannerAdapter {
  readonly id = 'sample-scanner';
  readonly displayName = '样张采集适配器';
  readonly mode = 'DEMO' as const;

  async isReady() {
    return true;
  }

  async capture(scene: BusinessScene): Promise<CaptureResult> {
    return {
      imageSource: scene.sampleImage,
      deviceId: this.id,
      capturedAt: new Date().toISOString(),
    };
  }
}

let activeAdapter: ScannerAdapter = new SampleScannerAdapter();

export const getScannerAdapter = () => activeAdapter;

/**
 * 试点接入厂商 SDK 时注入真实适配器，UI 和 OCR 管线无需改动。
 */
export const registerScannerAdapter = (adapter: ScannerAdapter) => {
  activeAdapter = adapter;
};

export const captureDocument = async (scene: BusinessScene): Promise<CaptureResult> => {
  if (!(await activeAdapter.isReady())) {
    throw new Error(`采集设备【${activeAdapter.displayName}】未就绪`);
  }
  return activeAdapter.capture(scene);
};
