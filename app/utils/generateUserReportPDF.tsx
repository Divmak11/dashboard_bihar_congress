import React from 'react';
import { Document, Page, Text, View, Font, pdf } from '@react-pdf/renderer';
import type { CumulativeMetrics } from '../../models/hierarchicalTypes';
import type { DisplayUser } from './fetchUsersData';
import { fetchUserCumulativeMetrics } from './fetchUsersData';
import { PDF_STYLES, FONT_CONFIG } from '../config/pdfConfig';
import type { AdminUser } from '../../models/types';

export type UserSplitType = 'cumulative' | 'day' | 'month';

Font.register({
  family: FONT_CONFIG.family,
  fonts: [
    { src: FONT_CONFIG.sources.regular, fontWeight: 'normal' },
    { src: FONT_CONFIG.sources.bold, fontWeight: 'bold' },
  ],
});

const styles = PDF_STYLES;

interface UserReportOptions {
  users: DisplayUser[];
  dateRange: { startDate: string; endDate: string };
  split: UserSplitType;
  vertical: 'wtm' | 'shakti-abhiyaan';
  adminUser?: AdminUser | null;
  isLastDayFilter?: boolean;
}

interface Segment { startDate: string; endDate: string; label: string; }

function buildSegments(options: UserReportOptions): Segment[] {
  const { dateRange, split } = options;
  const segments: Segment[] = [];
  const s = new Date(dateRange.startDate);
  const e = new Date(dateRange.endDate);
  const sn = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const en = new Date(e.getFullYear(), e.getMonth(), e.getDate());

  if (split === 'cumulative') {
    segments.push({ startDate: dateRange.startDate, endDate: dateRange.endDate, label: 'Cumulative' });
    return segments;
  }

  if (split === 'day') {
    for (let d = new Date(sn); d <= en; d.setDate(d.getDate() + 1)) {
      const day = new Date(d);
      const ds = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      segments.push({ startDate: ds, endDate: ds, label: ds });
    }
    return segments;
  }

  // month-wise
  let cur = new Date(sn.getFullYear(), sn.getMonth(), 1);
  const endMonth = new Date(en.getFullYear(), en.getMonth(), 1);
  while (cur <= endMonth) {
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const segStart = new Date(Math.max(start.getTime(), sn.getTime()));
    const segEnd = new Date(Math.min(end.getTime(), en.getTime()));

    const sStr = `${segStart.getFullYear()}-${String(segStart.getMonth() + 1).padStart(2, '0')}-${String(segStart.getDate()).padStart(2, '0')}`;
    const eStr = `${segEnd.getFullYear()}-${String(segEnd.getMonth() + 1).padStart(2, '0')}-${String(segEnd.getDate()).padStart(2, '0')}`;
    const label = `${String(month + 1).padStart(2, '0')}-${year}`;

    segments.push({ startDate: sStr, endDate: eStr, label });

    cur = new Date(year, month + 1, 1);
  }

  return segments;
}

const UserRow: React.FC<{ user: DisplayUser; metrics: CumulativeMetrics }> = ({ user, metrics }) => (
  <View style={{ marginBottom: 8 }}>
    <Text style={{ fontSize: 10, fontFamily: FONT_CONFIG.family, fontWeight: 'bold' }}>{user.name} ({user.role})</Text>
    <Text style={{ fontSize: 9 }}>Phone: {user.phone || '-'} | Email: {user.email || '-'}</Text>
    <Text style={{ fontSize: 9 }}>Assembly: {user.assembly || '-'} | Assemblies: {(user.assemblies || []).join(', ') || '-'}</Text>
    <View style={{ marginTop: 4, display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
      {Object.entries(metrics).map(([key, value]) => (
        <View key={key} style={{ width: '25%', padding: 4 }}>
          <Text style={{ fontSize: 8, color: '#6b7280' }}>{key}</Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{Number(value) || 0}</Text>
        </View>
      ))}
    </View>
  </View>
);

const UsersReportDoc: React.FC<{ options: UserReportOptions; segments: Segment[]; segmentData: Record<string, { user: DisplayUser; metrics: CumulativeMetrics }[]> }> = ({ options, segments, segmentData }) => (
  <Document>
    {segments.map((seg, idx) => (
      <Page key={idx} size="A4" style={styles.page}>
        <View>
          <Text style={styles.title}>Users Report</Text>
          <Text style={styles.headerItem}>Period: {seg.startDate} to {seg.endDate} ({seg.label})</Text>
          <Text style={styles.headerItem}>Vertical: {options.vertical === 'shakti-abhiyaan' ? 'Shakti Abhiyaan' : 'WTM-SLP'}</Text>
        </View>
        <View style={styles.section}>
          {segmentData[seg.label]?.map((row, i) => (
            <UserRow key={`${row.user.uid}-${i}`} user={row.user} metrics={row.metrics} />
          ))}
        </View>
        <Text style={[styles.footer, { fontSize: 7 }]}>Bihar Congress Dashboard - Users Report | Segment: {seg.label}</Text>
      </Page>
    ))}
  </Document>
);

export async function generateUserReportPDF(options: UserReportOptions): Promise<Blob> {
  const segments = buildSegments(options);

  // Build per-segment metrics
  const segmentData: Record<string, { user: DisplayUser; metrics: CumulativeMetrics }[]> = {};

  for (const seg of segments) {
    const rows: { user: DisplayUser; metrics: CumulativeMetrics }[] = [];
    for (const user of options.users) {
      // Only supported roles included upstream
      const metrics = await fetchUserCumulativeMetrics(
        user,
        { startDate: seg.startDate, endDate: seg.endDate },
        options.vertical,
        options.adminUser ?? null,
        !!options.isLastDayFilter
      );
      rows.push({ user, metrics });
    }
    segmentData[seg.label] = rows;
  }

  const blob = await pdf(<UsersReportDoc options={options} segments={segments} segmentData={segmentData} />).toBlob();
  return blob;
}
