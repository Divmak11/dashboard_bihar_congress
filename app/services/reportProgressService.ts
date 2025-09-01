export type ProgressPhase = 
  | 'idle' 
  | 'initializing' 
  | 'preparing' 
  | 'aggregating' 
  | 'processing' 
  | 'generating' 
  | 'completed' 
  | 'error';

export interface ProgressState {
  percentage: number;
  message: string;
  phase: ProgressPhase;
}

/**
 * Service for managing report generation progress
 * Decoupled from React state management for reusability
 */
export class ReportProgressService {
  private currentState: ProgressState = {
    percentage: 0,
    message: '',
    phase: 'idle'
  };
  
  private onUpdate: (state: ProgressState) => void;

  constructor(onUpdate: (state: ProgressState) => void) {
    this.onUpdate = onUpdate;
  }

  /**
   * Update progress with phase, percentage and message
   */
  updateProgress(phase: ProgressPhase, percentage: number, message: string): void {
    this.currentState = { phase, percentage, message };
    this.onUpdate(this.currentState);
  }

  /**
   * Get current progress state
   */
  getCurrentState(): ProgressState {
    return { ...this.currentState };
  }

  /**
   * Reset progress to idle state
   */
  reset(): void {
    this.updateProgress('idle', 0, '');
  }

  /**
   * Check if operation is in progress
   */
  isInProgress(): boolean {
    return this.currentState.phase !== 'idle' && 
           this.currentState.phase !== 'completed' && 
           this.currentState.phase !== 'error';
  }

  /**
   * Check if operation completed successfully
   */
  isCompleted(): boolean {
    return this.currentState.phase === 'completed';
  }

  /**
   * Check if operation failed
   */
  hasError(): boolean {
    return this.currentState.phase === 'error';
  }
}
