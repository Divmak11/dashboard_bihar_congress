import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { AggregatedMetrics, ChartData, SLPWithMetadata, DateRange } from '../../models/gharGharYatraTypes';

// PDF Styles following project patterns
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: '#3b82f6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    width: '23%',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
  },
  metricLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#d1d5db',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  badge: {
    padding: 3,
    borderRadius: 3,
    fontSize: 8,
    textAlign: 'center',
  },
  badgeHigh: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  badgeLow: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
  },
});

interface PDFReportProps {
  dateRange: DateRange;
  metrics: AggregatedMetrics;
  charts: ChartData;
  detailedData?: SLPWithMetadata[];
  reportType: 'overview' | 'single-date';
}

const GharGharYatraReport: React.FC<PDFReportProps> = ({
  dateRange,
  metrics,
  charts,
  detailedData,
  reportType
}) => {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const now = new Date();
  const generatedAt = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ghar-Ghar Yatra Report</Text>
          <Text style={styles.subtitle}>
            Period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
          </Text>
          <Text style={styles.subtitle}>Generated: {generatedAt}</Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Punches</Text>
              <Text style={styles.metricValue}>{metrics.totalPunches.toLocaleString()}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Unique SLPs</Text>
              <Text style={styles.metricValue}>{metrics.totalUniqueSLPs}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg Punches/Day</Text>
              <Text style={styles.metricValue}>
                {(metrics.totalPunches / metrics.totalDatesWithData).toFixed(1)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Match Rate</Text>
              <Text style={styles.metricValue}>{metrics.matchRatePercentage.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>High Performers (&gt;10)</Text>
              <Text style={styles.metricValue}>{metrics.highPerformersCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Low Performers (≤10)</Text>
              <Text style={styles.metricValue}>{metrics.lowPerformersCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg Punches/SLP/Day</Text>
              <Text style={styles.metricValue}>{metrics.avgPunchesPerSlpPerDay.toFixed(1)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Days with Data</Text>
              <Text style={styles.metricValue}>{metrics.totalDatesWithData}</Text>
            </View>
          </View>
        </View>

        {/* Data Quality Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Quality Analysis</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { width: '25%' }]}>Category</Text>
              <Text style={[styles.tableCellHeader, { width: '25%' }]}>Count</Text>
              <Text style={[styles.tableCellHeader, { width: '25%' }]}>Percentage</Text>
              <Text style={[styles.tableCellHeader, { width: '25%' }]}>Status</Text>
            </View>
            {charts.dataQuality.map((item, index) => (
              <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: '25%' }]}>{item.name}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{item.value.toLocaleString()}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{item.percentage.toFixed(2)}%</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>
                  {item.name === 'Matched' ? '✓ Good' : item.name === 'No Match' ? '✗ Poor' : '~ Fair'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Performers Table */}
        {charts.topSLPs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 5 High Performers</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { width: '10%' }]}>Rank</Text>
                <Text style={[styles.tableCellHeader, { width: '35%' }]}>SLP Name</Text>
                <Text style={[styles.tableCellHeader, { width: '30%' }]}>Assembly</Text>
                <Text style={[styles.tableCellHeader, { width: '25%' }]}>Total Punches</Text>
              </View>
              {charts.topSLPs.slice(0, 5).map((slp, index) => (
                <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{index + 1}</Text>
                  <Text style={[styles.tableCell, { width: '35%' }]}>{slp.slpName}</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{slp.assembly}</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>{slp.totalPunches.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Bihar Pradesh Congress Committee - Ghar-Ghar Yatra Analytics</Text>
          <Text>Page 1 of {detailedData && detailedData.length > 0 ? 2 : 1}</Text>
        </View>
      </Page>

      {/* Detailed Data Page (if single date report) */}
      {detailedData && detailedData.length > 0 && (
        <Page size="A4" style={styles.page} orientation="landscape">
          <View style={styles.header}>
            <Text style={styles.title}>Detailed SLP Performance</Text>
            <Text style={styles.subtitle}>Date: {formatDate(dateRange.startDate)}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { width: '20%' }]}>SLP Name</Text>
                <Text style={[styles.tableCellHeader, { width: '12%' }]}>Mobile</Text>
                <Text style={[styles.tableCellHeader, { width: '18%' }]}>Assembly</Text>
                <Text style={[styles.tableCellHeader, { width: '10%' }]}>Punches</Text>
                <Text style={[styles.tableCellHeader, { width: '10%' }]}>Unique</Text>
                <Text style={[styles.tableCellHeader, { width: '10%' }]}>Double</Text>
                <Text style={[styles.tableCellHeader, { width: '10%' }]}>Triple</Text>
                <Text style={[styles.tableCellHeader, { width: '10%' }]}>Status</Text>
              </View>
              {detailedData.slice(0, 30).map((slp, index) => (
                <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: '20%', fontSize: 8 }]}>{slp.slpName}</Text>
                  <Text style={[styles.tableCell, { width: '12%', fontSize: 8 }]}>{slp.slpPhoneNumber}</Text>
                  <Text style={[styles.tableCell, { width: '18%', fontSize: 8 }]}>{slp.assembly}</Text>
                  <Text style={[styles.tableCell, { width: '10%', fontSize: 8 }]}>{slp.totalPunches}</Text>
                  <Text style={[styles.tableCell, { width: '10%', fontSize: 8 }]}>{slp.uniquePunches}</Text>
                  <Text style={[styles.tableCell, { width: '10%', fontSize: 8 }]}>{slp.doubleEntries}</Text>
                  <Text style={[styles.tableCell, { width: '10%', fontSize: 8 }]}>{slp.tripleEntries}</Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>
                    <Text style={slp.performanceBadge === 'High' ? styles.badgeHigh : styles.badgeLow}>
                      {slp.performanceBadge}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
            {detailedData.length > 30 && (
              <Text style={{ marginTop: 10, fontSize: 9, color: '#6b7280' }}>
                Showing first 30 of {detailedData.length} SLPs. Export full data via CSV for complete list.
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            <Text>Bihar Pradesh Congress Committee - Ghar-Ghar Yatra Analytics</Text>
            <Text>Page 2 of 2</Text>
          </View>
        </Page>
      )}
    </Document>
  );
};

/**
 * Generate and download PDF report
 */
export async function generateGharGharYatraPDF(
  dateRange: DateRange,
  metrics: AggregatedMetrics,
  charts: ChartData,
  detailedData?: SLPWithMetadata[]
): Promise<void> {
  try {
    console.log('[generateGharGharYatraPDF] Generating PDF report');

    const reportType = detailedData ? 'single-date' : 'overview';
    
    const doc = (
      <GharGharYatraReport
        dateRange={dateRange}
        metrics={metrics}
        charts={charts}
        detailedData={detailedData}
        reportType={reportType}
      />
    );

    const blob = await pdf(doc).toBlob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const filename = `ghar_ghar_yatra_report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
    link.setAttribute('download', filename);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log(`[generateGharGharYatraPDF] PDF generated: ${filename}`);
  } catch (error) {
    console.error('[generateGharGharYatraPDF] Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}
