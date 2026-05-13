// ============================================================
// DATABASE TYPES — Sprint 3 Production Schema
// Aligned 1:1 with Supabase real tables (2026-05-11)
// ============================================================

export interface Video {
  youtube_video_id: string;
  channel_id: string;
  channel_name?: string;
  title: string;
  description: string;
  url: string;
  published_at: string;
  transcript?: string;
  transcript_status?: 'pending' | 'success' | 'failed';
  processed_at?: string;
}

export interface PainPoint {
  id: string;
  title: string;
  description: string;
  category: string;
  market_segment: string;
  severity_score: number;
  frequency_score: number;
  recency_score: number;
  final_score: number;
  version: string;
  video_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PainPointSource {
  id: string;
  pain_point_id: string;
  source_type: string;
  source_name: string;
  source_url?: string;
  country?: string;
  evidence: string;
  credibility_score: number;
  created_at: string;
}

export interface ExtractionLog {
  id: string;
  video_id?: string;
  pain_point_id?: string;
  model_used?: string;
  tokens_used?: number;
  cost_estimated?: number;
  status?: string;
  error_message?: string;
  created_at: string;
}

export interface ScrapingLog {
  log_id: string;
  run_type: string;
  videos_found: number;
  new_videos: number;
  errors_count: number;
  status: 'success' | 'failure';
  error_details?: Record<string, unknown>;
  executed_at: string;
  scraper_version?: string;
  skipped_existing?: number;
  transcripts_created: number;
  fallback_used?: number;
  snapshots_created?: number;
  execution_time_seconds?: number;
  api_calls_estimated?: number;
  source?: string;
}

export interface DashboardStats {
  totalVideos: number;
  totalTranscripts: number;
  totalPainPoints: number;
  totalSources: number;
  successRate: number;
  avgSeverity: number;
  lastExecution: string | null;
}
