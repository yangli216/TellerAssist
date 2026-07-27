import type { OcrProvider } from '../config/appConfig';
import type { FieldItem, SceneType } from '../types/business';
import { getFieldDefinitions } from './businessRules';
import { processLocalImageOcr } from './localOcrEngine';

export interface BenchmarkSample {
  id: string;
  fileName: string;
  imageSource: string;
  expected?: Record<string, string>;
}

export interface BenchmarkSampleResult {
  id: string;
  fileName: string;
  durationMs: number;
  fields: Record<string, FieldItem>;
  filledCount: number;
  fieldCount: number;
  conflictCount: number;
  exactMatches?: number;
  exactTotal?: number;
  qualityIssues: string[];
  corrections: string[];
  error?: string;
}

export interface BenchmarkFieldMetric {
  fieldId: string;
  label: string;
  extracted: number;
  total: number;
  exactMatches: number;
  annotated: number;
}

export interface BenchmarkReport {
  generatedAt: string;
  sceneId: SceneType;
  total: number;
  succeeded: number;
  fullyExtracted: number;
  conflictSamples: number;
  averageDurationMs: number;
  p95DurationMs: number;
  exactMatches: number;
  annotatedFields: number;
  fieldMetrics: BenchmarkFieldMetric[];
  samples: BenchmarkSampleResult[];
}

const normalizeExpectedValue = (value: string) => value.replace(/[\s　：:]/g, '').trim().toUpperCase();

export const runOcrBenchmark = async (
  samples: BenchmarkSample[],
  sceneId: SceneType,
  confidenceThreshold: number,
  provider: OcrProvider,
  onSampleComplete?: (completed: number, total: number, result: BenchmarkSampleResult) => void,
): Promise<BenchmarkReport> => {
  const definitions = getFieldDefinitions(sceneId);
  const fieldMetrics = new Map(definitions.map((definition) => [definition.id, {
    fieldId: definition.id,
    label: definition.label,
    extracted: 0,
    total: samples.length,
    exactMatches: 0,
    annotated: 0,
  } satisfies BenchmarkFieldMetric]));
  const results: BenchmarkSampleResult[] = [];
  for (const sample of samples) {
    const startedAt = performance.now();
    let sampleResult: BenchmarkSampleResult;
    try {
      const result = await processLocalImageOcr(
        sample.imageSource,
        sceneId,
        confidenceThreshold,
        undefined,
        provider,
      );
      const fields = result.fields;
      let exactMatches = 0;
      let exactTotal = 0;
      for (const definition of definitions) {
        const value = fields[definition.id]?.value ?? '';
        const metric = fieldMetrics.get(definition.id)!;
        if (value.trim()) metric.extracted += 1;
        const expected = sample.expected?.[definition.id];
        if (expected !== undefined) {
          metric.annotated += 1;
          exactTotal += 1;
          if (normalizeExpectedValue(value) === normalizeExpectedValue(expected)) {
            metric.exactMatches += 1;
            exactMatches += 1;
          }
        }
      }
      sampleResult = {
        id: sample.id,
        fileName: sample.fileName,
        durationMs: Math.round(performance.now() - startedAt),
        fields,
        filledCount: Object.values(fields).filter((field) => field.value.trim()).length,
        fieldCount: definitions.length,
        conflictCount: Object.values(fields).filter((field) => field.status === 'CONFLICT').length,
        exactMatches,
        exactTotal,
        qualityIssues: result.imageQuality?.issues ?? [],
        corrections: result.correctionSummary ?? [],
      };
    } catch (error) {
      sampleResult = {
        id: sample.id,
        fileName: sample.fileName,
        durationMs: Math.round(performance.now() - startedAt),
        fields: {},
        filledCount: 0,
        fieldCount: definitions.length,
        conflictCount: 0,
        qualityIssues: [],
        corrections: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
    results.push(sampleResult);
    onSampleComplete?.(results.length, samples.length, sampleResult);
  }
  const durations = results.filter((result) => !result.error).map((result) => result.durationMs).sort((a, b) => a - b);
  const annotatedFields = results.reduce((sum, result) => sum + (result.exactTotal ?? 0), 0);
  return {
    generatedAt: new Date().toISOString(),
    sceneId,
    total: samples.length,
    succeeded: results.filter((result) => !result.error).length,
    fullyExtracted: results.filter((result) => !result.error && result.filledCount === result.fieldCount).length,
    conflictSamples: results.filter((result) => result.conflictCount > 0).length,
    averageDurationMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
    p95DurationMs: durations.length ? durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)] : 0,
    exactMatches: results.reduce((sum, result) => sum + (result.exactMatches ?? 0), 0),
    annotatedFields,
    fieldMetrics: [...fieldMetrics.values()],
    samples: results,
  };
};

export const downloadBenchmarkReport = (report: BenchmarkReport) => {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ocr-benchmark-${report.sceneId}-${report.generatedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
