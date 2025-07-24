// components/hierarchical/HierarchicalNavigation.tsx
// Left panel dropdown navigation – initial scaffold
import React from 'react';

export interface NavigationProps {
  zones: Zone[];
  assemblies: string[];
  acs: AC[];
  slps: SLP[];
  selectedZoneId: string | null;
  selectedAssembly: string | null;
  selectedAcId: string | null;
  selectedSlpId: string | null;
  onZoneChange: (zoneId: string) => void;
  onAssemblyChange: (assembly: string) => void;
  onAcChange: (acId: string) => void;
  onSlpChange: (slpId: string) => void;
}

import { Zone, AC, SLP } from '../../models/hierarchicalTypes';

const HierarchicalNavigation: React.FC<NavigationProps> = ({
  zones,
  assemblies,
  acs,
  slps,
  selectedZoneId,
  selectedAssembly,
  selectedAcId,
  selectedSlpId,
  onZoneChange,
  onAssemblyChange,
  onAcChange,
  onSlpChange,
}) => {
  return (
    <aside className="w-full md:w-1/4 p-4 border-r border-gray-200 space-y-4">
      {/* Zone Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Zone</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedZoneId || ''}
          onChange={(e) => onZoneChange(e.target.value)}
        >
          <option value="">Select Zone</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>

      {/* Assembly Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Assembly</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedAssembly || ''}
          onChange={(e) => onAssemblyChange(e.target.value)}
          disabled={!selectedZoneId}
        >
          <option value="">Select Assembly</option>
          {assemblies.map((asm) => (
            <option key={asm} value={asm}>
              {asm}
            </option>
          ))}
        </select>
      </div>

      {/* Assembly Coordinator Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Assembly Coordinator</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedAcId || ''}
          onChange={(e) => onAcChange(e.target.value)}
          disabled={!selectedAssembly}
        >
          <option value="">Select AC</option>
          {acs.map((ac) => (
            <option key={ac.uid} value={ac.uid}>
              {ac.name}
            </option>
          ))}
        </select>
      </div>

      {/* SLP Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">SLP</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedSlpId || ''}
          onChange={(e) => onSlpChange(e.target.value)}
          disabled={!selectedAcId}
        >
          <option value="">Select SLP</option>
          {slps.map((slp) => (
            <option key={slp.uid} value={slp.uid}>
              {slp.name} ({slp.role}){slp.independent ? ' - Independent' : ''}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
};

export default HierarchicalNavigation;
