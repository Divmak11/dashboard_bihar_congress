// Types for Call Center Purposes vertical
// Data from WTM, PRND, DONOR, AGGREGATOR, and DIGITAL MEMBERSHIP 1 sheets

export type CallCenterPurposeFormType = 
  | 'wtm'
  | 'prnd'
  | 'donor'
  | 'aggregator'
  | 'digital membership 1';

export interface CallCenterPurposeRecord {
  Name: string;
  'Mobile Number': string;
  assembly: string;
  form_type: CallCenterPurposeFormType;
  
  // Firestore metadata
  id?: string;
  created_at?: any;
  updated_at?: any;
}

export interface CallCenterPurposeSummary {
  totalRecords: number;
  wtm: number;
  prnd: number;
  donor: number;
  aggregator: number;
  digitalMembership1: number;
  uniqueAssemblies: number;
  topAssemblies: { assembly: string; count: number }[];
}

export interface CallCenterPurposeMetrics {
  total: number;
  byFormType: {
    wtm: number;
    prnd: number;
    donor: number;
    aggregator: number;
    'digital membership 1': number;
  };
  byAssembly: Record<string, number>;
}

// Display names for form types
export const FORM_TYPE_DISPLAY_NAMES: Record<CallCenterPurposeFormType, string> = {
  'wtm': 'WTM',
  'prnd': 'PRND',
  'donor': 'Donor',
  'aggregator': 'Aggregator',
  'digital membership 1': 'Digital Membership 1',
};

// Color themes for each form type
export const FORM_TYPE_COLORS: Record<CallCenterPurposeFormType, { bg: string; border: string; text: string; badge: string }> = {
  'wtm': {
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
  },
  'prnd': {
    bg: 'bg-green-100',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
  },
  'donor': {
    bg: 'bg-yellow-100',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  'aggregator': {
    bg: 'bg-pink-100',
    border: 'border-pink-200',
    text: 'text-pink-700',
    badge: 'bg-pink-100 text-pink-800',
  },
  'digital membership 1': {
    bg: 'bg-indigo-100',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-800',
  },
};
