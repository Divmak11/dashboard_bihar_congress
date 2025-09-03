import { useState, useCallback } from 'react';
import { aggregateReportData, createDateFilter, DateFilter } from '../utils/reportDataAggregation';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';
import { ReportProgressService, ProgressState } from '../services/reportProgressService';
import { AdminUser } from '../../models/types';

export interface ReportGenerationOptions {
  dateFilter: {
    startDate: string;
    endDate: string;
    dateOption: string;
  };
  vertical: 'wtm-slp' | 'shakti-abhiyaan';
  adminUser?: AdminUser | null;
  isLastDayFilter?: boolean;
}

export interface UseReportGenerationReturn {
  generateReport: (options: ReportGenerationOptions) => Promise<void>;
  isGenerating: boolean;
  progress: ProgressState;
  error: string | null;
  clearError: () => void;
}

/**
 * Custom hook for managing report generation logic
 * Separates business logic from UI components
 */
export function useReportGeneration(): UseReportGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    percentage: 0,
    message: '',
    phase: 'idle'
  });
  const [error, setError] = useState<string | null>(null);

  const progressService = new ReportProgressService((state) => {
    setProgress(state);
  });

  const generateReport = useCallback(async (options: ReportGenerationOptions) => {
    setIsGenerating(true);
    setError(null);
    progressService.reset();

    try {
      // Phase 1: Initialize
      progressService.updateProgress('initializing', 0, 'Initializing report generation...');

      // Phase 2: Prepare date filter
      progressService.updateProgress('preparing', 10, 'Preparing date filters...');
      
      let dateFilter: DateFilter;
      if (options.dateFilter.startDate && options.dateFilter.endDate) {
        dateFilter = {
          startDate: options.dateFilter.startDate,
          endDate: options.dateFilter.endDate,
          label: options.dateFilter.dateOption
        };
      } else {
        dateFilter = createDateFilter('all-time');
      }

      // Phase 3: Aggregate data
      progressService.updateProgress('aggregating', 20, 'Aggregating data across all levels...');
      
      const reportData = await aggregateReportData(
        dateFilter,
        options.vertical === 'shakti-abhiyaan' ? 'shakti-abhiyaan' : 'wtm-slp',
        {
          adminUser: options.adminUser,
          isLastDayFilter: options.isLastDayFilter
        }
      );

      // Phase 4: Process collected data
      progressService.updateProgress('processing', 60, 'Collected data for all zones and assemblies...');

      // Phase 5: Generate PDF
      progressService.updateProgress('generating', 80, 'Generating PDF document...');
      
      await generateAndDownloadPDF(reportData as any);

      // Phase 6: Complete
      progressService.updateProgress('completed', 100, 'Report generated successfully!');
      
      // Auto-reset after success
      setTimeout(() => {
        setIsGenerating(false);
        progressService.reset();
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[useReportGeneration] Error generating report:', err);
      
      progressService.updateProgress('error', 0, `Error: ${errorMessage}`);
      setError(errorMessage);
      
      // Auto-reset after error
      setTimeout(() => {
        setIsGenerating(false);
        progressService.reset();
      }, 3000);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateReport,
    isGenerating,
    progress,
    error,
    clearError
  };
}
