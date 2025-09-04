import { StyleSheet } from '@react-pdf/renderer';

/**
 * PDF Report Configuration
 * Centralized configuration for PDF styling and theming
 */

// Performance level thresholds
export const PERFORMANCE_THRESHOLDS = {
  HIGH: 7,
  MODERATE: 5
} as const;

// Performance color scheme
export const PERFORMANCE_COLORS = {
  high: '#A8E6CF',      // Pastel Green
  moderate: '#FFD3B6',   // Pastel Orange
  poor: '#FFAAA5',      // Pastel Red
  
  // Darker variants for better contrast
  highDark: '#90D5B3',
  moderateDark: '#FFB894',
  poorDark: '#FF8A80',
  defaultDark: '#BDBDBD'
} as const;

/**
 * Get performance level based on meetings count
 */
export function getPerformanceLevel(meetings: number): 'high' | 'moderate' | 'poor' {
  if (meetings >= PERFORMANCE_THRESHOLDS.HIGH) return 'high';
  if (meetings >= PERFORMANCE_THRESHOLDS.MODERATE) return 'moderate';
  return 'poor';
}

/**
 * Get performance color based on level
 */
export function getPerformanceColor(level: 'high' | 'moderate' | 'poor', variant: 'light' | 'dark' = 'dark'): string {
  if (variant === 'dark') {
    switch (level) {
      case 'high': return PERFORMANCE_COLORS.highDark;
      case 'moderate': return PERFORMANCE_COLORS.moderateDark;
      case 'poor': return PERFORMANCE_COLORS.poorDark;
      default: return PERFORMANCE_COLORS.defaultDark;
    }
  } else {
    switch (level) {
      case 'high': return PERFORMANCE_COLORS.high;
      case 'moderate': return PERFORMANCE_COLORS.moderate;
      case 'poor': return PERFORMANCE_COLORS.poor;
      default: return PERFORMANCE_COLORS.defaultDark;
    }
  }
}

/**
 * PDF Document Styles
 */
export const PDF_STYLES = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontSize: 8,
    fontFamily: 'NotoSansDevanagari',
    color: '#1f2937'
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3,
  },
  sectionTitle: {
    fontSize: 10,
    marginTop: 8,
    marginBottom: 5,
    fontWeight: 'bold',
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
    padding: 3,
  },
  subsectionTitle: {
    fontSize: 12,
    marginTop: 15,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  acCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    padding: 6,
    borderRadius: 3,
    fontSize: 7,
  },
  acNameText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  acMetricsText: {
    fontSize: 6,
    color: '#ffffff',
    opacity: 0.9,
  },
  performanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  performanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  performanceText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  text: {
    marginBottom: 5,
    lineHeight: 1.4,
  },
  boldText: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  column: {
    flex: 1,
    paddingRight: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    padding: 6,
    borderRadius: 3,
  },
  metricBox: {
    width: '20%',
    marginBottom: 4,
    paddingRight: 6,
  },
  metricLabel: {
    fontSize: 6,
    color: '#6b7280',
    marginBottom: 1,
  },
  metricValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  indentLevel1: {
    marginLeft: 15,
  },
  indentLevel2: {
    marginLeft: 30,
  },
  indentLevel3: {
    marginLeft: 45,
  },
  activityItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
  },
  pageBreak: {
    marginTop: 20,
    pageBreakBefore: 'always',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    fontSize: 7,
  },
  headerItem: {
    fontSize: 7,
    color: '#374151',
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
  },
  // Assembly and AC styles
  assemblySection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
  },
  assemblyHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
    padding: 4,
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  acSection: {
    marginLeft: 10,
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e7eb',
    paddingLeft: 8,
  },
  acHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  // Summary and metrics styles
  summaryBox: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
  },
  summaryContent: {
    fontSize: 8,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  // Table styles
  table: {
    marginTop: 8,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    padding: 4,
    fontSize: 7,
    fontWeight: 'bold',
  },
  tableHeaderRow: {
    flexDirection: 'row' as const,
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #e2e8f0',
    minHeight: 28,
  },
  tableHeaderCell: {
    flex: 1,
    padding: '5px 6px',
    fontSize: 9,
    fontWeight: 'bold' as const,
    color: '#ffffff',
    textAlign: 'center' as const,
    borderRight: '1px solid #475569',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    padding: 3,
    fontSize: 7,
  },
  tableCell: {
    flex: 1,
    padding: '4px 5px',
    fontSize: 8,
    textAlign: 'center' as const,
    borderRight: '1px solid #e2e8f0',
  },
  tableCellHighlight: {
    flex: 1,
    padding: '4px 5px',
    fontSize: 8,
    fontWeight: 'bold' as const,
    color: '#1e293b',
    textAlign: 'center' as const,
    borderRight: '1px solid #e2e8f0',
  },
  tableCellDim: {
    flex: 1,
    padding: '4px 5px',
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center' as const,
    borderRight: '1px solid #e2e8f0',
  },
  tableRowHigh: {
    flexDirection: 'row' as const,
    borderBottom: '1px solid #e2e8f0',
    minHeight: 22,
    backgroundColor: PERFORMANCE_COLORS.high,
    borderLeft: '3px solid #22c55e',
  },
  tableRowModerate: {
    flexDirection: 'row' as const,
    borderBottom: '1px solid #e2e8f0',
    minHeight: 22,
    backgroundColor: PERFORMANCE_COLORS.moderate,
    borderLeft: '3px solid #fb923c',
  },
  tableRowPoor: {
    flexDirection: 'row' as const,
    borderBottom: '1px solid #e2e8f0',
    minHeight: 22,
    backgroundColor: PERFORMANCE_COLORS.poor,
    borderLeft: '3px solid #ef4444',
  },
  
  // New AC-wise performance section styles
  performanceSectionContainer: {
    marginTop: 20,
    marginBottom: 10
  },
  
  performanceSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    padding: 8,
    color: '#ffffff',
    textAlign: 'center' as const
  },
  
  greenSectionTitle: {
    backgroundColor: '#059669'
  },
  
  orangeSectionTitle: {
    backgroundColor: '#d97706'
  },
  
  redSectionTitle: {
    backgroundColor: '#dc2626'
  },
  
  unavailableSectionTitle: {
    backgroundColor: '#6b7280'
  },
  
  acHeaderContainer: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  
  acHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151'
  },
  
  acSubHeaderText: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2
  },
  
  acAssemblyTableContainer: {
    marginTop: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  
  acAssemblyRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    minHeight: 20,
    fontSize: 7
  },
  
  acAssemblyRowHigh: {
    backgroundColor: PERFORMANCE_COLORS.high
  },
  
  acAssemblyRowModerate: {
    backgroundColor: PERFORMANCE_COLORS.moderate
  },
  
  acAssemblyRowPoor: {
    backgroundColor: PERFORMANCE_COLORS.poor
  },
  
  acAssemblyRowWhite: {
    backgroundColor: '#ffffff'
  },
  tableSummary: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    marginTop: 8,
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 3,
  },
  summaryText: {
    fontSize: 8,
    color: '#475569',
    fontWeight: 'bold' as const,
  },
  section: {
    marginBottom: 20,
  },
  summaryTable: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  summaryHeader: {
    flexDirection: 'row' as const,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
  },
  summaryHeaderText: {
    fontSize: 8.5,
    fontWeight: 'bold' as const,
    color: '#475569',
    flex: 1,
    textAlign: 'center' as const,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryCell: {
    fontSize: 8,
    color: '#1e293b',
    flex: 1,
    textAlign: 'center' as const,
  },
  // Legend styles
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendText: {
    fontSize: 7,
    color: '#6b7280',
  }
});

/**
 * Font configuration
 */
export const FONT_CONFIG = {
  family: 'NotoSansDevanagari',
  sources: {
    regular: '/fonts/NotoSansDevanagari-Regular.ttf',
    bold: '/fonts/NotoSansDevanagari-Bold.ttf'
  }
} as const;

/**
 * PDF filename generation config
 */
export const FILE_NAME_CONFIG = {
  getFileName: (vertical: 'wtm-slp' | 'shakti-abhiyaan', startDate: string, endDate: string): string => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const verticalName = vertical === 'shakti-abhiyaan' ? 'ShaktiAbhiyaan' : 'WTMSLP';
    const dateRange = `${startDate}_to_${endDate}`.replace(/\//g, '-');
    return `${verticalName}_Report_${dateRange}_${timestamp}.pdf`;
  }
} as const;
