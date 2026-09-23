/**
 * GROUNDTRUTH (2026-09-23 strip): the browser ML worker (ONNX transformers for
 * summarization, embeddings, sentiment, NER) was removed with the AI-brief
 * removal.
 *
 * This module is a no-op compatibility shim. `mlWorker.isAvailable` is always
 * false, so every caller falls back to its deterministic path (regex entities,
 * worker-based clustering, heuristic sentiment). No models are downloaded.
 */
import type { MLCapabilities } from './ml-capabilities';

export interface NEREntity {
  text: string;
  type: string;
  confidence: number;
  start: number;
  end: number;
}

export interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface VectorSearchResult {
  text: string;
  pubDate: number;
  source: string;
  score: number;
}

class DisabledMLWorker {
  get isAvailable(): boolean {
    return false;
  }

  get mlCapabilities(): MLCapabilities | null {
    return null;
  }

  get loadedModelIds(): string[] {
    return [];
  }

  isModelLoaded(_modelId: string): boolean {
    return false;
  }

  async init(): Promise<boolean> {
    return false;
  }

  async whenReady(_reason?: string): Promise<boolean> {
    return false;
  }

  async loadModel(_modelId: string): Promise<boolean> {
    return false;
  }

  async unloadModel(_modelId: string): Promise<boolean> {
    return false;
  }

  async unloadOptionalModels(): Promise<void> {}

  async embedTexts(texts: string[]): Promise<number[][]> {
    return texts.map(() => []);
  }

  async summarize(texts: string[], _modelId?: string): Promise<string[]> {
    return texts.map(() => '');
  }

  async classifySentiment(_texts: string[]): Promise<SentimentResult[]> {
    return [];
  }

  async extractEntities(texts: string[]): Promise<NEREntity[][]> {
    return texts.map(() => []);
  }

  async semanticCluster(_embeddings: number[][], _threshold?: number): Promise<number[][]> {
    return [];
  }

  async clusterBySemanticSimilarity(
    _items: Array<{ id: string; text: string }>,
    _threshold?: number,
  ): Promise<string[][]> {
    return [];
  }

  async vectorStoreIngest(
    _items: Array<{ text: string; pubDate: number; source: string; url: string; tags?: string[] }>,
  ): Promise<number> {
    return 0;
  }

  async vectorStoreSearch(_queries: string[], _topK?: number, _minScore?: number): Promise<VectorSearchResult[]> {
    return [];
  }

  async vectorStoreCount(): Promise<number> {
    return 0;
  }

  async vectorStoreReset(): Promise<boolean> {
    return false;
  }

  async getStatus(): Promise<string[]> {
    return [];
  }

  reset(): void {}

  terminate(): void {}
}

export const mlWorker = new DisabledMLWorker();
