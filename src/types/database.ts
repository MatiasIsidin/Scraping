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
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

export interface PainPointSource {
  id: string;
  pain_point_id: string;
  youtube_video_id?: string;
  transcript_segment?: string;
  extraction_confidence?: number;
  extraction_model?: string;
  extraction_version?: string;
  source_type?: string;
  source_name?: string;
  source_url?: string;
  country?: string;
  evidence?: string;
  credibility_score?: number;
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
  scraper_version: string;
  transcripts_created: number;
  execution_time_seconds?: number;
  api_calls_estimated?: number;
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
