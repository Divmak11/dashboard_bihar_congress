import React, { useState, useEffect } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import { useReportGeneration } from '../app/hooks/useReportGeneration';
import { auth } from '../app/utils/firebase';
import { User } from 'firebase/auth';
import { ClipLoader } from 'react-spinners';
import { getCurrentAdminUser } from '../app/utils/fetchFirebaseData';
import { AdminUser } from '../models/types';

interface ReportGeneratorProps {
  currentDateFilter: {
    startDate: string;
    endDate: string;
    dateOption: string;
  };
  selectedVertical: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  currentDateFilter,
  selectedVertical
}) => {
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { generateReport, isGenerating, progress, error } = useReportGeneration();

  // Auto-close modal when report generation is complete or fails
  useEffect(() => {
    if (progress.phase === 'completed') {
      setTimeout(() => {
        setShowModal(false);
      }, 1500);
    } else if (progress.phase === 'error') {
      setTimeout(() => {
        setShowModal(false);
      }, 3000);
    }
  }, [progress.phase]);

  // Fetch user role from Firestore
  useEffect(() => {
    const fetchUserRole = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const adminUser = await getCurrentAdminUser(currentUser.uid);
          setUserRole(adminUser?.role || null);
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    };

    fetchUserRole();
  }, []);

  // Only show for admin users (not zonal-incharge or dept-head)
  const canGenerateReports = userRole === 'admin';

  if (loading) {
    return null; // Don't render anything while loading
  }

  if (!canGenerateReports) {
    return null;
  }

  const handleGenerateReport = async () => {
    setShowModal(true);
    
    await generateReport({
      dateFilter: {
        startDate: currentDateFilter.startDate,
        endDate: currentDateFilter.endDate,
        dateOption: currentDateFilter.dateOption
      },
      vertical: selectedVertical === 'shakti-abhiyaan' ? 'shakti-abhiyaan' : 'wtm-slp'
    });
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
              <div className="bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    progress.phase === 'error' ? 'bg-red-600' : 
                    progress.phase === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-2">{progress.percentage}%</div>
            </div>
            
            {/* Progress Message */}
            <div className="flex items-center mb-4">
              {progress.phase !== 'completed' && progress.phase !== 'error' && (
                <ClipLoader size={20} color="#2563eb" className="mr-2" />
              )}
              <p className={`text-sm ${
                progress.phase === 'error' ? 'text-red-700' : 
                progress.phase === 'completed' ? 'text-green-700' : 'text-gray-700'
              }`}>
                {progress.message}
              </p>
            </div>
            
            {/* Error Details */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end">
              {progress.phase === 'completed' ? (
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Done
                </button>
              ) : progress.phase === 'error' ? (
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Close
                </button>
              ) : (
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Please wait...' : 'Close'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportGenerator;
