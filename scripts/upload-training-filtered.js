const fs = require('fs');
const path = require('path');

function normalizeDateStr(input) {
  if (!input) return '';
  if (typeof input !== 'string') return String(input);
  const s = input.trim();
  if (!s) return '';
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  // DD/MM/YY -> assume 20YY
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m) {
    const [_, dd, mm, yy] = m;
    const yyyy = `20${yy}`;
    return `${yyyy}-${mm}-${dd}`;
  }
  // Fallback: return as-is
  return s;
}

function filterAndNormalize(records, formType) {
  return records
    .filter(r => {
      const status = (r.trainingStatus || '').toString().trim().toLowerCase();
      const dateOk = !!(r.dateOfTraining && String(r.dateOfTraining).trim());
      return status === 'completed' && dateOk;
    })
    .map(r => {
      const normalized = { ...r };
      normalized.form_type = formType; // ensure correct form type on upload
      normalized.dateOfTraining = normalizeDateStr(normalized.dateOfTraining);
      // numeric coercion safeguards
      normalized.attendees = Number.isFinite(Number(normalized.attendees)) ? Number(normalized.attendees) : 0;
      normalized.attendeesOtherThanClub = Number.isFinite(Number(normalized.attendeesOtherThanClub)) ? Number(normalized.attendeesOtherThanClub) : 0;
      return normalized;
    });
}

async function postBatch(baseUrl, batch) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/training/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trainingData: batch })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Upload failed ${res.status}: ${txt}`);
  }
  return res.json();
}

async function main() {
  const which = (process.argv[2] || 'both').toLowerCase();
  const baseCandidates = [
    process.env.API_BASE_URL,
    'http://localhost:3000',
    'http://localhost:3001'
  ].filter(Boolean);

  let baseUrl = null;
  // probe the API
  for (const base of baseCandidates) {
    try {
      await fetch(`${base.replace(/\/$/, '')}/api/training/upload`, { method: 'HEAD' });
      baseUrl = base;
      break;
    } catch (e) {
      // ignore
    }
  }
  if (!baseUrl) baseUrl = baseCandidates[0];

  const jobs = [];

  if (which === 'wtm' || which === 'both') {
    const wtmPath = path.join(__dirname, 'wtm-training-data.json');
    const wtmData = JSON.parse(fs.readFileSync(wtmPath, 'utf8'));
    const wtmFiltered = filterAndNormalize(wtmData, 'wtm');
    jobs.push({ label: 'WTM', data: wtmFiltered });
  }

  if (which === 'shakti' || which === 'both') {
    const shaktiPath = path.join(__dirname, 'shakti-training-data.json');
    const shaktiData = JSON.parse(fs.readFileSync(shaktiPath, 'utf8'));
    const shaktiFiltered = filterAndNormalize(shaktiData, 'shakti-data');
    jobs.push({ label: 'Shakti', data: shaktiFiltered });
  }

  for (const job of jobs) {
    if (!job.data.length) {
      console.log(`ℹ️  ${job.label}: nothing to upload after filtering`);
      continue;
    }
    console.log(`🚀 ${job.label}: uploading ${job.data.length} filtered records...`);
    // chunk uploads to avoid large payloads
    const chunkSize = 300;
    let uploaded = 0;
    for (let i = 0; i < job.data.length; i += chunkSize) {
      const batch = job.data.slice(i, i + chunkSize);
      await postBatch(baseUrl, batch);
      uploaded += batch.length;
      console.log(`   ↳ Uploaded ${uploaded}/${job.data.length}`);
    }
    console.log(`✅ ${job.label}: upload complete.`);
  }
}

main().catch(err => {
  console.error('💥 Error in filtered upload:', err.message);
  process.exit(1);
});
