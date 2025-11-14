'use client';

import React, { useState } from 'react';
import { WhatsappAssemblyGroup, WhatsappFormType, FORM_TYPE_CONFIG } from '@/models/whatsappTypes';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { UsersIcon, LinkIcon, UserCircleIcon } from '@heroicons/react/24/solid';

interface WhatsappGroupsListProps {
  data: WhatsappAssemblyGroup[];
  formType: WhatsappFormType;
  loading?: boolean;
}

export default function WhatsappGroupsList({ 
  data, 
  formType, 
  loading = false 
}: WhatsappGroupsListProps) {
  const [expandedAssemblies, setExpandedAssemblies] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const config = FORM_TYPE_CONFIG[formType];

  const toggleAssembly = (assembly: string) => {
    const newExpanded = new Set(expandedAssemblies);
    if (newExpanded.has(assembly)) {
      newExpanded.delete(assembly);
    } else {
      newExpanded.add(assembly);
    }
    setExpandedAssemblies(newExpanded);
  };

  // Filter data based on search term
  const filteredData = data.filter(assemblyGroup =>
    assemblyGroup.assembly.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assemblyGroup.groups.some(group => 
      group['Group Name'].toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-12">
        <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No groups found</h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchTerm ? 'No groups match your search criteria.' : `No ${config.label.toLowerCase()} available.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search assemblies or groups..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Assembly Groups */}
      {filteredData.map((assemblyGroup) => {
        const isExpanded = expandedAssemblies.has(assemblyGroup.assembly);
        
        return (
          <div key={assemblyGroup.assembly} className="border rounded-lg overflow-hidden">
            {/* Assembly Header */}
            <button
              onClick={() => toggleAssembly(assemblyGroup.assembly)}
              className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                <div className="text-left">
                  <h3 className="text-lg font-medium text-gray-900">{assemblyGroup.assembly}</h3>
                  <p className="text-sm text-gray-500">
                    {assemblyGroup.totalGroups} groups • {assemblyGroup.totalMembers} members
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} bg-opacity-10 text-gray-800`}>
                  {assemblyGroup.totalGroups}
                </span>
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Groups List */}
            {isExpanded && (
              <div className="px-6 py-4 space-y-3">
                {assemblyGroup.groups.map((group, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          {group['Group Name']}
                        </h4>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <UsersIcon className="h-4 w-4 mr-1" />
                            {group['Group Members']} members
                          </div>
                          
                          <div className="flex items-center">
                            <UserCircleIcon className="h-4 w-4 mr-1" />
                            Admin: {group.Admin}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        {group['Group Link'] && (
                          <a
                            href={group['Group Link']}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <LinkIcon className="h-4 w-4 mr-1" />
                            Join Group
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
