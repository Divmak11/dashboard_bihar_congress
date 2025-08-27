import React, { useState } from 'react';
import { AdminUser } from '../models/types';
import { aggregateReportData, createDateFilter, DateFilter } from '../app/utils/reportDataAggregation';
import { generateAndDownloadPDF } from '../app/utils/pdfGenerator';

interface ReportGeneratorProps {
  adminUser: AdminUser | null;
  currentDateFilter: {
    startDate: string;
    endDate: string;
    dateOption: string;
  };
  selectedVertical: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  adminUser,
  currentDateFilter,
  selectedVertical
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Only show for admin users (not zonal-incharge or dept-head)
  const canGenerateReports = adminUser?.role === 'admin';

  if (!canGenerateReports) {
    return null;
  }

  const handleGenerateReport = async () => {
    setShowModal(true);
    setIsGenerating(true);
    setProgress(0);
    setProgressMessage('Initializing report generation...');

    try {
      // Step 1: Prepare date filter
      setProgress(10);
      setProgressMessage('Preparing date filters...');
      
      let dateFilter: DateFilter;
      if (currentDateFilter.startDate && currentDateFilter.endDate) {
        dateFilter = {
          startDate: currentDateFilter.startDate,
          endDate: currentDateFilter.endDate,
          label: currentDateFilter.dateOption
        };
      } else {
        // Default to "All Time" if no date filter is set
        dateFilter = createDateFilter('all-time');
      }

      // Step 2: Aggregate data
      setProgress(20);
      setProgressMessage('Aggregating data across all levels...');
      
      const vertical = selectedVertical === 'shakti-abhiyaan' ? 'shakti-abhiyaan' : 'wtm-slp';
      const reportData = await aggregateReportData(dateFilter, vertical);

      // Step 3: Update progress during data aggregation
      setProgress(60);
      setProgressMessage('Collected data for all zones and assemblies...');

      // Step 4: Generate PDF
      setProgress(80);
      setProgressMessage('Generating PDF document...');
      
      await generateAndDownloadPDF(reportData as any);

      // Step 5: Complete
      setProgress(100);
      setProgressMessage('Report generated successfully!');

      setTimeout(() => {
        setShowModal(false);
        setIsGenerating(false);
      }, 1500);

    } catch (error) {
      console.error('[ReportGenerator] Error generating report:', error);
      setProgressMessage('Error generating report. Please try again.');
      
      setTimeout(() => {
        setShowModal(false);
        setIsGenerating(false);
      }, 3000);
    }
  };

  return (
    <>
      {/* Generate Report Button */}
      <button
        onClick={handleGenerateReport}
        disabled={isGenerating}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
        title="Generate PDF Report (Admin Only)"
      >
        {isGenerating ? 'Generating...' : 'Generate Report'}
      </button>

      {/* Progress Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Generating {selectedVertical === 'shakti-abhiyaan' ? 'Shakti Abhiyaan' : 'WTM-SLP'} Report
            </h3>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Progress Message */}
            <p className="text-sm text-gray-700 mb-4">{progressMessage}</p>

            {/* Date Filter Info */}
            <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Period:</span>
                <span>{currentDateFilter.dateOption || 'All Time'}</span>
              </div>
              <div className="flex justify-between">
                <span>Vertical:</span>
                <span>{selectedVertical === 'shakti-abhiyaan' ? 'Shakti Abhiyaan' : 'WTM-SLP'}</span>
              </div>
            </div>

            {/* Close button (only shown when complete or error) */}
            {(progress === 100 || progressMessage.includes('Error')) && (
              <button
                onClick={() => {
                  setShowModal(false);
                  setIsGenerating(false);
                }}
                className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReportGenerator;
