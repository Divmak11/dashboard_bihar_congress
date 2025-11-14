// WhatsApp Data Types and Interfaces

export type WhatsappFormType = 'shakti' | 'wtm' | 'public';

export interface WhatsappGroup {
  Assembly: string;
  'Group Name': string;
  'Group Link': string;
  'Group Members': string;
  Admin: string;
  form_type: WhatsappFormType;
}

export interface WhatsappAssemblyGroup {
  assembly: string;
  groups: WhatsappGroup[];
  totalGroups: number;
  totalMembers: number;
}

export interface WhatsappSummary {
  totalGroups: number;
  totalMembers: number;
  totalAssemblies: number;
  shaktiGroups: number;
  wtmGroups: number;
  publicGroups: number;
}

export interface WhatsappPageData {
  shaktiData: WhatsappAssemblyGroup[];
  wtmData: WhatsappAssemblyGroup[];
  publicData: WhatsappAssemblyGroup[];
  summary: WhatsappSummary;
}

export interface WhatsappTabCounts {
  shakti: number;
  wtm: number;
  public: number;
}

// Form type display configuration
export const FORM_TYPE_CONFIG: Record<WhatsappFormType, {
  label: string;
  color: string;
  description: string;
}> = {
  shakti: {
    label: 'Shakti Teams',
    color: 'bg-purple-500',
    description: 'WhatsApp groups for Shakti team coordination'
  },
  wtm: {
    label: 'WTM Groups',
    color: 'bg-blue-500', 
    description: 'Working Team Member WhatsApp groups'
  },
  public: {
    label: 'Public Groups',
    color: 'bg-green-500',
    description: 'Public community WhatsApp groups'
  }
};
