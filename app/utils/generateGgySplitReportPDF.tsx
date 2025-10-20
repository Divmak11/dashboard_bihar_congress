import React from 'react';
import { Document, Page, Text, View, Font, StyleSheet, pdf } from '@react-pdf/renderer';
import { PDF_STYLES, FONT_CONFIG, FILE_NAME_CONFIG } from '../config/pdfConfig';
import { GGYReportData, GGYSegmentData } from '../../models/ggyReportTypes';

// Register fonts for Devanagari support
Font.register({
  family: FONT_CONFIG.family,
  fonts: [
    { src: FONT_CONFIG.sources.regular, fontWeight: 'normal' },
    { src: FONT_CONFIG.sources.bold, fontWeight: 'bold' },
  ],
});

const styles = PDF_STYLES;

// Summary table using reportSummary mapping
const SummaryTable: React.FC<{ seg: GGYSegmentData }> = ({ seg }) => {
  const s = seg.reportSummary;
  const dup = s.duplicate_calls;
  const hasBlankTotal = typeof s.blank_param2_total_punches === 'number';
  const blankValue: number = hasBlankTotal ? (s.blank_param2_total_punches as number) : (s.blank_param2_unique_count ?? 0);
  const rows: { label: string; value: string }[] = [
    { label: 'Total Samvidhan Saathi', value: s.total_param2_values.toLocaleString() },
    { label: 'Matched Numbers', value: `${s.matched_count.toLocaleString()} (${s.matched_percentage.toFixed(1)}%)` },
    { label: 'No Match Found', value: s.no_match_count.toLocaleString() },
    { label: 'Less Than 3 Digit Punches', value: s.less_than_equal_3_digits_count.toLocaleString() },
    { label: 'Incorrect Format', value: s.incorrect_count.toLocaleString() },
    { label: 'Blank Entries', value: blankValue.toLocaleString() },
    { label: 'Unique Calling Numbers', value: s.total_unique_entries.toLocaleString() },
    { label: 'Duplicate Calling Numbers', value: dup.toLocaleString() },
    { label: 'Total Calls', value: `${s.total_unique_entries.toLocaleString()} + ${dup.toLocaleString()} = ${(s.total_calls_from_parts).toLocaleString()}` },
  ];

  return (
    <View style={styles.summaryTable}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryHeaderText}>Metric</Text>
        <Text style={styles.summaryHeaderText}>Value</Text>
      </View>
      {rows.map((r, idx) => (
        <View key={idx} style={styles.summaryRow}>
          <Text style={styles.summaryCell}>{r.label}</Text>
          <Text style={styles.summaryCell}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
};

// Assembly-wise matched members section with chunking to prevent page crumbling
const AssemblyGroupsSection: React.FC<{ seg: GGYSegmentData }> = ({ seg }) => {
  const CHUNK_SIZE = 22; // rows per chunk to fit with header on A4
  const chunk = <T,>(arr: T[], size: number) => arr.reduce<T[][]>((acc, _, i) => {
    if (i % size === 0) acc.push(arr.slice(i, i + size));
    return acc;
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Assembly-wise Matched Members</Text>
      {seg.assemblyGroups.length === 0 ? (
        <Text style={styles.text}>No members found in this period.</Text>
      ) : (
        seg.assemblyGroups.map((g) => {
          const chunks = chunk(g.members, CHUNK_SIZE);
          // Calculate cumulative punches for this assembly
          const assemblyTotal = g.members.reduce((sum, m) => sum + m.totalPunches, 0);
          return (
            <View key={g.assembly} style={styles.assemblySection}>
              <Text style={styles.assemblyHeader}>{g.assembly} ({g.members.length} members)</Text>
              <Text style={[styles.text, { marginTop: 2, fontSize: 9, color: '#4b5563' }]}>Cumulative Punches: {assemblyTotal.toLocaleString()}</Text>
              {chunks.map((rows, cidx) => (
                <View key={`${g.assembly}-chunk-${cidx}`} style={styles.table} wrap={false}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, { flex: 1.8, fontWeight: 'bold' }]}>Name</Text>
                    <Text style={[styles.tableCell, { flex: 1.2, fontWeight: 'bold' }]}>Phone</Text>
                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: 'bold' }]}>Total</Text>
                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: 'bold' }]}>Unique</Text>
                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: 'bold' }]}>Double</Text>
                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: 'bold' }]}>Triple+</Text>
                  </View>
                  {rows.map((m, idx) => (
                    <View key={`${g.assembly}-${m.slpId}-${cidx}-${idx}`} style={styles.tableRow} wrap={false}>
                      <Text style={[styles.tableCell, { flex: 1.8 }]}>{m.slpName}</Text>
                      <Text style={[styles.tableCell, { flex: 1.2 }]}>{m.phoneNumber}</Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{m.totalPunches}</Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{m.uniquePunches}</Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{m.doubleEntries}</Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{m.tripleEntries}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        })
      )}
    </View>
  );
};

// Invalid format section showing Blank punches
const InvalidSection: React.FC<{ seg: GGYSegmentData }> = ({ seg }) => {
  const s = seg.reportSummary;
  const hasBlankTotal = typeof s.blank_param2_total_punches === 'number';
  const blankPunchesValue: number = hasBlankTotal
    ? (s.blank_param2_total_punches as number)
    : (s.blank_param2_unique_count ?? 0);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Invalid Format Entries</Text>
      <Text style={styles.text}>Incorrect Format (count): <Text style={styles.boldText}>{s.incorrect_count.toLocaleString()}</Text></Text>
      <Text style={styles.text}>Blank punches: <Text style={styles.boldText}>{blankPunchesValue.toLocaleString()}</Text></Text>
      {!hasBlankTotal && (
        <Text style={[styles.text, { color: '#6b7280' }]}>Note: Showing unique blank count because blank_param2_total_punches is not persisted.</Text>
      )}
    </View>
  );
};

const ReportHeader: React.FC<{ report: GGYReportData }>=({ report })=>{
  return (
    <View>
      <Text style={styles.title}>{report.header.title}</Text>
      <View style={styles.headerInfo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerItem}>Generated: {report.header.generatedAt}</Text>
          <Text style={styles.headerItem}>Period: {report.header.dateRange.startDate} to {report.header.dateRange.endDate}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerItem}>Split Type: {report.header.split === 'cumulative' ? 'Cumulative' : report.header.split === 'day' ? 'Day-wise' : 'Month-wise'}</Text>
        </View>
      </View>
    </View>
  );
};

const GgySplitReportDoc: React.FC<{ report: GGYReportData }>=({ report })=>{
  const overall = report.overall;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader report={report} />

        {/* Summary first */}
        <Text style={styles.subtitle}>Summary</Text>
        <SummaryTable seg={overall} />

        {/* For cumulative reports, include overall assembly & invalid */}
        {(!report.segments || report.segments.length === 0) && (
          <>
            <AssemblyGroupsSection seg={overall} />
            <InvalidSection seg={overall} />
          </>
        )}
      </Page>

      {/* For split reports, render each segment */}
      {report.segments && report.segments.map((seg, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <Text style={styles.subtitle}>{seg.segmentLabel}</Text>
          <SummaryTable seg={seg} />
          <AssemblyGroupsSection seg={seg} />
          <InvalidSection seg={seg} />
        </Page>
      ))}
    </Document>
  );
};

export async function generateGgySplitReportPDF(report: GGYReportData): Promise<void> {
  const doc = <GgySplitReportDoc report={report} />;
  const blob = await pdf(doc).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const base = FILE_NAME_CONFIG.getFileName('wtm-slp', report.header.dateRange.startDate, report.header.dateRange.endDate);
  const suffix = report.header.split === 'cumulative' ? 'Cumulative' : report.header.split === 'day' ? 'Split-Daily' : 'Split-Monthly';
  const filename = base.replace('.pdf', `_${suffix}.pdf`);
  link.setAttribute('download', filename);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
