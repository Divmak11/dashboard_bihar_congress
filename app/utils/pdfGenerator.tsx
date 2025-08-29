import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import { ReportData, ZoneData, AssemblyData, ACPerformance, ExecutiveSummary, DetailedActivity } from '../../models/reportTypes';

// Register fonts that support Hindi/Devanagari script
// NOTE: react-pdf requires TTF/OTF sources (WOFF/WOFF2 are not supported)
// Place the following files under public/fonts/:
// - public/fonts/NotoSansDevanagari-Regular.ttf
// - public/fonts/NotoSansDevanagari-Bold.ttf
Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 'bold' },
  ],
});

// AC Performance Color Scheme
const performanceColors = {
  high: '#A8E6CF',      // Pastel Green
  moderate: '#FFD3B6',   // Pastel Orange
  poor: '#FFAAA5'       // Pastel Red
};

const getPerformanceColor = (level: 'high' | 'moderate' | 'poor'): string => {
  switch (level) {
    case 'high': return '#90D5B3';  // Slightly darker pastel Green
    case 'moderate': return '#FFB894';  // Slightly darker pastel Orange
    case 'poor': return '#FF8A80';  // Slightly darker pastel Red
    default: return '#BDBDBD';  // Slightly darker Light Gray
  }
};

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontSize: 8,
    fontFamily: 'NotoSansDevanagari',
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
    marginBottom: 20,  // Increased spacing between assemblies
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
  },
  assemblyHeader: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  assemblyTitle: {
    fontSize: 11,
    marginBottom: 3,
    color: '#333',
  },
  assemblyLabel: {
    fontWeight: '400' as '400',
  },
  assemblyName: {
    fontWeight: '600' as '600',
  },
  assemblyMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  assemblyMetric: {
    fontSize: 8,
    color: '#666',
    marginRight: 8,
  },
  acRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    marginBottom: 1,
    borderRadius: 2,
  },
  acName: {
    flex: 2,
    fontSize: 9,
    color: '#000',  // Black text
    fontWeight: '500' as '500',
  },
  acMetric: {
    flex: 1,
    fontSize: 9,
    color: '#000',  // Black text
    textAlign: 'center' as 'center',
  },
  noAcMessage: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAcText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center' as 'center',
  },
});

interface PDFReportProps {
  data: ReportData;
}

// Header Component
const ReportHeader: React.FC<{ data: ReportData }> = ({ data }) => (
  <View>
    <Text style={styles.title}>{data.header.title}</Text>
    <View style={styles.headerInfo}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerItem}>Generated: {new Date(data.header.generatedAt).toLocaleDateString()}</Text>
        <Text style={styles.headerItem}>Period: {data.header.dateRange.startDate} to {data.header.dateRange.endDate}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerItem}>Vertical: {data.header.vertical === 'shakti-abhiyaan' ? 'Shakti Abhiyaan' : 'WTM-SLP'}</Text>
        <Text style={styles.headerItem}>Generated By: {data.header.generatedBy}</Text>
      </View>
    </View>
  </View>
);

// Metrics Grid Component for AC
const ACMetricsGrid: React.FC<{ metrics: ACPerformance['metrics'] }> = ({ metrics }) => (
  <View style={styles.metricsGrid}>
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>Meetings</Text>
      <Text style={styles.metricValue}>{metrics.meetings}</Text>
    </View>
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>Members</Text>
      <Text style={styles.metricValue}>{metrics.members}</Text>
    </View>
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>Volunteers</Text>
      <Text style={styles.metricValue}>{metrics.volunteers}</Text>
    </View>
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>Leaders</Text>
      <Text style={styles.metricValue}>{metrics.leaders}</Text>
    </View>
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>Videos</Text>
      <Text style={styles.metricValue}>{metrics.videos}</Text>
    </View>
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>Clubs</Text>
      <Text style={styles.metricValue}>{metrics.clubs}</Text>
    </View>
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>Forms</Text>
      <Text style={styles.metricValue}>{metrics.forms}</Text>
    </View>
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>Chaupals</Text>
      <Text style={styles.metricValue}>{metrics.chaupals}</Text>
    </View>
  </View>
);

// Zone Metrics Component
const ZoneMetrics: React.FC<{ metrics: ZoneData['metrics'] }> = ({ metrics }) => (
  <View style={styles.metricsGrid}>
    {metrics.map((metric, idx) => (
      <View key={idx} style={styles.metricBox}>
        <Text style={styles.metricLabel}>{metric.name}</Text>
        <Text style={styles.metricValue}>{metric.value}</Text>
      </View>
    ))}
  </View>
);

// Detailed Activities Component (if included)
const DetailedActivities: React.FC<{ activities?: DetailedActivity[] }> = ({ activities }) => {
  if (!activities || activities.length === 0) return null;
  
  return (
    <View style={styles.indentLevel1}>
      <Text style={styles.subsectionTitle}>Recent Activities (Sample)</Text>
      {activities.slice(0, 5).map((activity, idx) => (
        <View key={idx} style={styles.activityItem}>
          <Text style={styles.boldText}>{activity.type} - {activity.coordinatorName}</Text>
          <Text>Assembly: {activity.assembly}</Text>
          <Text>Date: {activity.date}</Text>
          {activity.description && <Text>{activity.description}</Text>}
        </View>
      ))}
    </View>
  );
};


// Compact AC Section Component
const ACSection: React.FC<{ ac: ACPerformance }> = ({ ac }) => {
  const performanceColor = getPerformanceColor(ac.performanceLevel);
  
  return (
    <View style={[styles.acRow, { backgroundColor: performanceColor }]}>
      <Text style={styles.acName}>{ac.name}</Text>
      <Text style={styles.acMetric}>M: {ac.metrics.meetings}</Text>
      <Text style={styles.acMetric}>O: {ac.metrics.volunteers}</Text>
      <Text style={styles.acMetric}>SLP: {ac.metrics.slps}</Text>
      <Text style={styles.acMetric}>Vid: {ac.metrics.videos}</Text>
      <Text style={styles.acMetric}>C-WA: {ac.metrics.centralWaGroups}</Text>
      <Text style={styles.acMetric}>Forms: {ac.metrics.forms}</Text>
      <Text style={styles.acMetric}>WA: {ac.metrics.assemblyWaGroups}</Text>
    </View>
  );
};

// Compact Assembly Section Component
const AssemblySection: React.FC<{ assembly: AssemblyData }> = ({ assembly }) => {
  // Remove bracketed text from assembly name  
  const cleanAssemblyName = assembly.name.split('(')[0].trim();
  
  return (
  <View style={styles.assemblySection}>
    <View style={styles.assemblyHeader}>
      <Text style={styles.assemblyTitle}>
        <Text style={styles.assemblyLabel}>Assembly: </Text>
        <Text style={styles.assemblyName}>{cleanAssemblyName}</Text>
      </Text>
      <View style={styles.assemblyMetrics}>
        <Text style={styles.assemblyMetric}>Meetings: {assembly.metrics.meetings}</Text>
        <Text style={styles.assemblyMetric}>Volunteers: {assembly.metrics.volunteers}</Text>
        <Text style={styles.assemblyMetric}>Leaders: {assembly.metrics.leaders}</Text>
        <Text style={styles.assemblyMetric}>Videos: {assembly.metrics.videos}</Text>
        <Text style={styles.assemblyMetric}>WA Groups: {assembly.metrics.assemblyWaGroups}</Text>
      </View>
    </View>
    
    {assembly.acs.length === 0 || (assembly.acs.length === 1 && assembly.acs[0].id === 'no-ac-assigned') ? (
      <View style={styles.noAcMessage}>
        <Text style={styles.noAcText}>No AC assigned for this assembly</Text>
      </View>
    ) : (
      assembly.acs
        .filter(ac => ac.id !== 'no-ac-assigned') // Filter out placeholder entries
        .sort((a, b) => {
          // Sort by performance: high (green) -> moderate (orange) -> poor (red)
          const performanceOrder = { high: 0, moderate: 1, poor: 2 };
          return performanceOrder[a.performanceLevel] - performanceOrder[b.performanceLevel];
        })
        .map((ac, idx) => (
          <ACSection key={`ac-${idx}`} ac={ac} />
        ))
    )}
  </View>
  );
};

// Zone Section Component (only show if zone is selected)
const ZoneSection: React.FC<{ zone: ZoneData; isNewPage?: boolean }> = ({ zone, isNewPage }) => (
  <View style={isNewPage ? styles.pageBreak : {}}>
    <Text style={styles.subtitle}>Zone: {zone.name}</Text>
    <Text style={styles.boldText}>Incharge: {zone.inchargeName || 'Not Assigned'} | Assemblies: {zone.totalAssemblies} | ACs: {zone.totalACs} | Active ACs: {zone.activeACs}</Text>
    <ZoneMetrics metrics={zone.metrics} />
    
    {zone.assemblies
      .sort((a, b) => {
        // Sort assemblies by their best AC performance
        const getBestPerformance = (assembly: AssemblyData) => {
          const performances = assembly.acs.map(ac => ac.performanceLevel);
          if (performances.includes('high')) return 0;
          if (performances.includes('moderate')) return 1;
          return 2;
        };
        return getBestPerformance(a) - getBestPerformance(b);
      })
      .map((assembly, assemblyIdx) => (
        <AssemblySection key={`assembly-${assemblyIdx}`} assembly={assembly} />
      ))}
  </View>
);

// Executive Summary Component
const ExecutiveSummarySection: React.FC<{ summary: ExecutiveSummary }> = ({ summary }) => (
  <View>
    <Text style={styles.subtitle}>Executive Summary</Text>
    <View style={styles.row}>
      <View style={styles.column}>
        <Text style={styles.boldText}>Total Zones: {summary.totalZones}</Text>
        <Text style={styles.boldText}>Total Assemblies: {summary.totalAssemblies}</Text>
      </View>
      <View style={styles.column}>
        <Text style={styles.boldText}>Total ACs: {summary.totalACs}</Text>
        <Text style={styles.boldText}>Total SLPs: {summary.totalSLPs}</Text>
      </View>
    </View>
    <View style={styles.row}>
      <View style={styles.column}>
        <Text style={styles.text}>Active ACs: {summary.activeACs}</Text>
        <Text style={styles.text}>Active SLPs: {summary.activeSLPs}</Text>
      </View>
      <View style={styles.column}>
        <Text style={styles.text}>High Performance: {summary.performanceSummary.high} ACs</Text>
        <Text style={styles.text}>Moderate: {summary.performanceSummary.moderate} ACs</Text>
        <Text style={styles.text}>Needs Attention: {summary.performanceSummary.poor} ACs</Text>
      </View>
    </View>
    <View style={styles.metricsGrid}>
      {summary.keyMetrics.map((metric, idx) => (
        <View key={idx} style={styles.metricBox}>
          <Text style={styles.metricLabel}>{metric.name}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
        </View>
      ))}
    </View>
  </View>
);

// Main PDF Document Component
const PDFReport: React.FC<PDFReportProps> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <ReportHeader data={data} />
      <ExecutiveSummarySection summary={data.summary} />
      
      {/* Zones Detail - only show if zones exist */}
      {data.zones && data.zones.length > 0 ? (
        data.zones.map((zone, idx) => (
          <ZoneSection key={`zone-${idx}`} zone={zone} isNewPage={idx > 0} />
        ))
      ) : (
        // Show assemblies directly if no zones
        data.summary && (
          <View>
            <Text style={styles.subtitle}>Assembly Details</Text>
            {/* This would need assembly data from summary */}
          </View>
        )
      )}
      
      {/* Detailed Activities if included */}
      {data.detailedActivities && data.detailedActivities.meetings && data.detailedActivities.meetings.length > 0 && (
        <View style={styles.pageBreak}>
          <Text style={styles.subtitle}>Sample Activities</Text>
          <DetailedActivities activities={data.detailedActivities.meetings} />
        </View>
      )}
      
      <Text style={styles.footer}>
        Bihar Congress Dashboard - {data.header.title} | Generated: {new Date(data.header.generatedAt).toLocaleDateString()}
      </Text>
    </Page>
  </Document>
);

/**
 * Generate PDF blob from report data
 */
export async function generatePDFBlob(data: ReportData): Promise<Blob> {
  console.log('[generatePDFBlob] Starting PDF generation for:', data.header.title);
  
  try {
    const blob = await pdf(<PDFReport data={data} />).toBlob();
    console.log('[generatePDFBlob] PDF generated successfully, size:', blob.size);
    return blob;
  } catch (error) {
    console.error('[generatePDFBlob] Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate and download PDF report
 */
export async function generateAndDownloadPDF(data: ReportData): Promise<void> {
  console.log('[generateAndDownloadPDF] Starting PDF generation and download');
  
  try {
    const blob = await generatePDFBlob(data);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const vertical = data.header.vertical === 'shakti-abhiyaan' ? 'ShaktiAbhiyaan' : 'WTMSLP';
    const dateRange = `${data.header.dateRange.startDate}_to_${data.header.dateRange.endDate}`.replace(/\//g, '-');
    link.download = `${vertical}_Report_${dateRange}_${timestamp}.pdf`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[generateAndDownloadPDF] PDF download initiated successfully');
  } catch (error) {
    console.error('[generateAndDownloadPDF] Error during PDF generation/download:', error);
    throw error;
  }
}
