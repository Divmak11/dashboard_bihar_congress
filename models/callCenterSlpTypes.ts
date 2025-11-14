// Types for Call Center SLP Identification vertical
// Data from OLD APPLICANT, SLP APPLICANT, and SLP MISSED CALL sheets

export interface SlpIdentificationRecord {
  // Core identification fields
  'Mobile Number'?: string;
  'Name'?: string;
  'Email Address'?: string;
  'Calling Status'?: string;
  
  // Location fields
  assembly: string; // Required field added during extraction
  'Choose District (जिला चुनें)'?: string;
  ' जिला:'?: string; // From SLP APPLICANT sheet
  '5. जिला:'?: string; // From SLP MISSED CALL sheet
  'राज्य:'?: string;
  '4. राज्य:'?: string;
  '⁠पंचायत/वार्ड का नाम'?: string;
  'पंचायत या वार्ड का नाम: '?: string;
  '7. पंचायत या वार्ड का नाम:'?: string;
  
  // Demographics
  'Gender'?: string;
  'GENDER'?: string;
  'उम्र:'?: string;
  '2. उम्र:'?: string;
  'जाति (स्वैच्छिक):'?: string;
  '3. जाति (स्वैच्छिक):'?: string;
  'वर्तमान कार्य/पेशा: '?: string;
  '8. वर्तमान कार्य/पेशा:'?: string;
  
  // Organization & Political Activity
  'क्या आप वर्तमान में किसी सामाजिक या राजनैतिक संगठन से जुड़े हैं?\n'?: string;
  '1. क्या आप वर्तमान में किसी सामाजिक या राजनैतिक संगठन से जुड़े हैं?'?: string;
  '9. क्या आप राजनीति या सामाजिक कार्य में सक्रिय हैं?\n'?: string;
  '10. क्या आप किसी संगठन से जुड़े हैं ?\n'?: string;
  'संगठन का नाम (यदि हाँ)'?: string;
  'संगठन का नाम (यदि हाँ): \n'?: string;
  'भूमिका (1-2 शब्द)'?: string;
  'भूमिका (1-2 शब्द):'?: string;
  
  // Social Work & Movement Experience
  '⁠क्या आपने किसी जन आंदोलन या अभियान में भाग लिया है?\n'?: string;
  '2. क्या आपने किसी जन आंदोलन या अभियान में भाग लिया है?'?: string;
  '11. आपने अब तक अपने क्षेत्र में कोई सामाजिक या जन सरोकार का कार्य किया है ?'?: string;
  'नाम (यदि हाँ)'?: string;
  'नाम (यदि हाँ):'?: string;
  'यदि हाँ, तो एक उदाहरण दें:'?: string;
  'भूमिका (संक्षेप में)'?: string;
  'भूमिका (संक्षेप में): '?: string;
  
  // Representative Engagement
  '⁠क्या आपने अपने क्षेत्र के किसी जनप्रतिनिधि से जनता के मुद्दों पर संवाद किया है?'?: string;
  '3. क्या आपने कभी किसी जनप्रतिनिधि से जनता के मुद्दों को लेकर बात की है?'?: string;
  '12. क्या आपने कभी किसी जनप्रतिनिधि से जनता के मुद्दों को लेकर बात की है?'?: string;
  'मुद्दा (संक्षेप में)'?: string;
  'यदि हाँ, तो  मुद्दा (संक्षेप में):   : '?: string;
  'यदि हाँ, तो मुद्दा:'?: string;
  'प्रतिनिधि का नाम (यदि ज्ञात हो)'?: string;
  'प्रतिनिधि का नाम (यदि ज्ञात हो): '?: string;
  
  // Local Issues & Challenges
  '⁠आपके क्षेत्र की प्रमुख समस्या क्या है? (1 समस्या)'?: string;
  '4. आपके क्षेत्र की प्रमुख समस्या क्या है?'?: string;
  'क्या आप इस पर पहले से काम कर रहे हैं? '?: string;
  'सामाजिक या राजनैतिक कार्य में आपको सबसे बड़ी चुनौती क्या लगती है? (1-2 शब्द में)'?: string;
  '5. सामाजिक या राजनैतिक कार्य में आपको सबसे बड़ी चुनौती क्या लगती है? (1-2 शब्द में)'?: string;
  'क्या इन चुनौतियों के बावजूद आप सक्रिय रहते हैं?'?: string;
  'क्या इन चुनौतियों के बावजूद आप सक्रिय रहते हैं? '?: string;
  
  // Program Engagement & Constitution Understanding
  'अगर आपको 50-100 लोगों को इस प्रोग्राम से जोड़ना हो, तो आप कैसे जोड़ेंगे? (संक्षिप्त उत्तर – 1 वाक्य)'?: string;
  '6. अगर आपको 50-100 लोगों को इस प्रोग्राम से जोड़ना हो, तो आप कैसे जोड़ेंगे? (संक्षिप्त उत्तर – 1 वाक्य): '?: string;
  '16. क्या आप 50-100 लोगों को इस आंदोलन से जोड़ने की क्षमता और इच्छा रखते हैं ?'?: string;
  'क्या आप संविधान लीडरशिप प्रोग्राम के व्हाट्सएप ग्रुप से जुड़ना चाहते हैं'?: string;
  ' 7. क्या आप संविधान लीडरशिप प्रोग्राम के व्हाट्सएप ग्रुप से जुड़ना चाहते हैं ?'?: string;
  '17. क्या आप व्हाइट टी-शर्ट आंदोलन के साथ काम करना चाहेंगे?'?: string;
  '18. क्या आप व्हाट्सएप ग्रुप से जुड़ना चाहेंगे ?'?: string;
  '⁠क्या आप इस प्रोग्राम में नेतृत्व की भूमिका निभाने को तैयार हैं?'?: string;
  '8. क्या आप इस प्रोग्राम में नेतृत्व की भूमिका निभाने को तैयार हैं?'?: string;
  'संविधान, सामाजिक न्याय और समानता को लेकर आपकी समझ कैसी है?'?: string;
  '12. संविधान, सामाजिक न्याय और समानता को लेकर आपकी समझ कैसी है?'?: string;
  '13. सामाजिक न्याय और समानता आपके लिए कितनी महत्वपूर्ण है?'?: string;
  '14. क्या आप मानते हैं कि संविधान ही देश को जोड़ने वाला मूल आधार है ?'?: string;
  '15. क्या आप चाहते हैं कि संविधान की बातें – न्याय, स्वतंत्रता, समानता, बंधुत्व – ज़मीनी स्तर तक पहुंचें ?'?: string;
  
  // Conversion tracking fields
  'Conversion Status'?: string;
  'Remarks'?: string;
  'Timestamp'?: string;
  
  // Metadata fields added during extraction
  form_type: 'slp_identification'; // Required, always 'slp_identification'
  sheet_source: 'old_applicant' | 'slp_applicant' | 'slp_missed_call'; // Source sheet identifier
  
  // Firestore metadata (added during upload)
  id?: string; // Document ID
  created_at?: any; // Firestore Timestamp
  updated_at?: any; // Firestore Timestamp
  
  // Dynamic fields (Column_1, Column_2, etc.)
  [key: string]: any;
}

export interface SlpIdentificationSummary {
  totalRecords: number;
  oldApplicant: number;
  slpApplicant: number;
  slpMissedCall: number;
  uniqueAssemblies: number;
  topAssemblies: { assembly: string; count: number }[];
}

export interface SlpIdentificationMetrics {
  total: number;
  bySource: {
    old_applicant: number;
    slp_applicant: number;
    slp_missed_call: number;
  };
  byAssembly: Record<string, number>;
}
