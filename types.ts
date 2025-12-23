
export enum GenerationMode {
  TEXT_TO_VIDEO = 'TEXT_TO_VIDEO',
  IMAGE_TO_VIDEO = 'IMAGE_TO_VIDEO',
  VIDEO_EXTEND = 'VIDEO_EXTEND',
  REFERENCE_IMAGE = 'REFERENCE_IMAGE'
}

export interface VideoJob {
  id: string;
  prompt: string;
  status: 'idle' | 'pending' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  progressMessage?: string;
  createdAt: number;
  mode: GenerationMode;
  error?: string;
}

export interface ReferenceImage {
  id: string;
  data: string; // base64
  mimeType: string;
}
