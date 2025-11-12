// BR-only districts and assemblies mapping for Manifesto filters
// Structure mirrors the usage in ManifestoReportDashboard.js

export const indianDistricts = {
  states: [
    {
      key: 'BR',
      name: 'Bihar',
      districts: [
        { key: 'Patna', name: 'Patna' },
        { key: 'Gaya', name: 'Gaya' },
        { key: 'Nalanda', name: 'Nalanda' },
        { key: 'Vaishali', name: 'Vaishali' },
        { key: 'Muzaffarpur', name: 'Muzaffarpur' },
        { key: 'Darbhanga', name: 'Darbhanga' },
        { key: 'Bhagalpur', name: 'Bhagalpur' },
        { key: 'Purnia', name: 'Purnia' },
        { key: 'Katihar', name: 'Katihar' },
        { key: 'Siwan', name: 'Siwan' },
        { key: 'Gopalganj', name: 'Gopalganj' },
        { key: 'Saran', name: 'Saran' },
        { key: 'Samastipur', name: 'Samastipur' },
        { key: 'Saharsa', name: 'Saharsa' },
        { key: 'Arrah', name: 'Arrah' },
        { key: 'Araria', name: 'Araria' },
        { key: 'Aurangabad', name: 'Aurangabad' }
      ]
    }
  ]
} as const;

export const AssemblySeatsDistrictWise = {
  state: [
    {
      stateKey: 'BR',
      districts: [
        {
          districtName: 'Patna',
          constituencies: [
            { id: 'Bakhtiyarpur', name: 'Bakhtiyarpur' },
            { id: 'Digha', name: 'Digha' },
            { id: 'Maner', name: 'Maner' },
            { id: 'Masaurhi (SC)', name: 'Masaurhi (SC)' },
            { id: 'Danapur', name: 'Danapur' },
            { id: 'Patna Sahib', name: 'Patna Sahib' },
          ]
        },
        { districtName: 'Gaya', constituencies: [ { id: 'Gaya Town', name: 'Gaya Town' }, { id: 'Bodh Gaya (SC)', name: 'Bodh Gaya (SC)' } ] },
        { districtName: 'Nalanda', constituencies: [ { id: 'Nalanda', name: 'Nalanda' }, { id: 'Hilsa', name: 'Hilsa' }, { id: 'Biharsharif', name: 'Biharsharif' }, { id: 'Rajgir (SC)', name: 'Rajgir (SC)' } ] },
        { districtName: 'Vaishali', constituencies: [ { id: 'Hajipur', name: 'Hajipur' }, { id: 'Vaishali', name: 'Vaishali' }, { id: 'Raja Pakar (SC)', name: 'Raja Pakar (SC)' } ] },
        { districtName: 'Muzaffarpur', constituencies: [ { id: 'Muzaffarpur', name: 'Muzaffarpur' }, { id: 'Kurhani', name: 'Kurhani' }, { id: 'Sakra (SC)', name: 'Sakra (SC)' } ] },
        { districtName: 'Darbhanga', constituencies: [ { id: 'Darbhanga', name: 'Darbhanga' }, { id: 'Keoti', name: 'Keoti' }, { id: 'Jale', name: 'Jale' } ] },
        { districtName: 'Bhagalpur', constituencies: [ { id: 'Bhagalpur', name: 'Bhagalpur' }, { id: 'Nathnagar', name: 'Nathnagar' }, { id: 'Kahalgaon', name: 'Kahalgaon' } ] },
        { districtName: 'Purnia', constituencies: [ { id: 'Purnia', name: 'Purnia' }, { id: 'Dhamdaha', name: 'Dhamdaha' } ] },
        { districtName: 'Katihar', constituencies: [ { id: 'Katihar', name: 'KATIHAR' }, { id: 'Kadwa', name: 'Kadwa' }, { id: 'Pranpur', name: 'Pranpur' }, { id: 'Barsoi', name: 'Barsoi' } ] },
        { districtName: 'Siwan', constituencies: [ { id: 'Siwan', name: 'Siwan' }, { id: 'Raghunathpur', name: 'Raghunathpur' } ] },
        { districtName: 'Gopalganj', constituencies: [ { id: 'Gopalganj', name: 'Gopalganj' }, { id: 'Baikunthpur', name: 'Baikunthpur' } ] },
        { districtName: 'Saran', constituencies: [ { id: 'Chapra', name: 'Chapra' }, { id: 'Sonepur', name: 'Sonepur' }, { id: 'Marhaura', name: 'Marhaura' } ] },
        { districtName: 'Samastipur', constituencies: [ { id: 'Samastipur', name: 'Samastipur' }, { id: 'Ujiarpur', name: 'Ujiarpur' }, { id: 'Rosera (SC)', name: 'Rosera (SC)' } ] },
        { districtName: 'Saharsa', constituencies: [ { id: 'Saharsa', name: 'Saharsa' }, { id: 'Simri Bakhtiarpur', name: 'Simri Bakhtiarpur' } ] },
        { districtName: 'Arrah', constituencies: [ { id: 'Arrah', name: 'Arrah' } ] },
        { districtName: 'Araria', constituencies: [ { id: 'Araria', name: 'Araria' }, { id: 'Raniganj (SC)', name: 'Raniganj (SC)' } ] },
        { districtName: 'Aurangabad', constituencies: [ { id: 'Aurangabad', name: 'Aurangabad' }, { id: 'Rafiganj', name: 'Rafiganj' } ] }
      ]
    }
  ]
} as const;

export const availableCommunity = [
  { key: 'GEN', label: 'सामान्य (GEN)' },
  { key: 'OBC', label: 'अन्य पिछड़ा वर्ग (OBC)' },
  { key: 'EBC', label: 'अति पिछड़ा वर्ग (EBC)' },
  { key: 'SC', label: 'अनुसूचित जाति (SC)' },
  { key: 'ST', label: 'अनुसूचित जनजाति (ST)' },
  { key: 'Muslim', label: 'मुस्लिम' },
  { key: 'Yadav', label: 'यादव' },
  { key: 'Kurmi', label: 'कुर्मी' },
  { key: 'Koeri', label: 'कोइरी' },
  { key: 'Brahmin', label: 'ब्राह्मण' },
  { key: 'Bhumihar', label: 'भूमिहार' },
  { key: 'Rajput', label: 'राजपूत' },
  { key: 'Mallaha', label: 'मल्लाह' },
  { key: 'Mochi', label: 'मोची' },
  { key: 'अन्य', label: 'अन्य' }
] as const;
