'use client';

import React from 'react';
import { WhatsappFormType, WhatsappTabCounts, FORM_TYPE_CONFIG } from '@/models/whatsappTypes';

interface WhatsappTabsProps {
  activeTab: WhatsappFormType;
  onTabChange: (tab: WhatsappFormType) => void;
  tabCounts: WhatsappTabCounts;
  loading?: boolean;
}

export default function WhatsappTabs({ 
  activeTab, 
  onTabChange, 
  tabCounts, 
  loading = false 
}: WhatsappTabsProps) {
  const tabs: { key: WhatsappFormType; label: string; count: number }[] = [
    { key: 'shakti', label: FORM_TYPE_CONFIG.shakti.label, count: tabCounts.shakti },
    { key: 'wtm', label: FORM_TYPE_CONFIG.wtm.label, count: tabCounts.wtm },
    { key: 'public', label: FORM_TYPE_CONFIG.public.label, count: tabCounts.public }
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const config = FORM_TYPE_CONFIG[tab.key];
          
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              disabled={loading}
              className={[
                'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${config.color}`}></span>
                {tab.label}
                {!loading && (
                  <span className={[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  ].join(' ')}>
                    {tab.count}
                  </span>
                )}
                {loading && (
                  <div className="inline-flex items-center px-2 py-0.5">
                    <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  </div>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
