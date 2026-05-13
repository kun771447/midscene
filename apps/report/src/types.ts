import type { ReportActionDump } from '@midscene/core';

export interface NetworkRequest {
  /** Matches ExecutionTask.taskId for precise binding; falls back to timestamp range */
  taskId?: string;
  /** Unix timestamp in ms when the request was sent */
  timestamp: number;
  url: string;
  method?: string;
  statusCode?: number;
  /** Duration of the request in ms */
  duration?: number;
  requestBody?: unknown;
  responseBody?: unknown;
}

// Core visualization types
export interface PlaywrightTaskAttributes {
  playwright_test_description: string;
  playwright_test_id: string;
  playwright_test_title: string;
  playwright_test_status:
    | 'passed'
    | 'failed'
    | 'timedOut'
    | 'skipped'
    | 'interrupted';
  playwright_test_duration: number;
  is_merged?: boolean;
}

export interface PlaywrightTasks {
  get: () => ReportActionDump;
  attributes: PlaywrightTaskAttributes;
}

export interface VisualizerProps {
  logoAction?: () => void;
  dumps?: PlaywrightTasks[];
}
