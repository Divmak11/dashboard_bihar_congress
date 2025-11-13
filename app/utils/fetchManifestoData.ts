// Manifesto Survey API utilities
// Handles login, paginated reports fetching, and home-card summary caching

import { homePageCache, CACHE_KEYS } from './cacheUtils';
import { ManifestoFilters, ManifestoPagedResult, ManifestoReportsResponse, ManifestoStatistics } from '../../models/manifestoTypes';

const API_BASE = 'https://api.shaktiabhiyan.in/api/v1';
const LOGIN_URL = `${API_BASE}/auth/login`;
const REPORTS_URL = `${API_BASE}/manifestoSurvey/reports`;

// Credentials provided by user for this project usage
// NOTE: These are intentionally checked-in as per user instruction for this internal dashboard
const MANIFESTO_USERNAME = 'Ritin_6201';
const MANIFESTO_PASSWORD = 'Ritin@50647!';

// Local storage keys (namespaced)
export const LS_KEYS = {
  TOKEN: 'manifesto:token',
  USER: 'manifesto:user'
} as const;

export interface LoginResult {
  token: string;
  user: any;
}

export async function loginManifestoApi(
  username: string = MANIFESTO_USERNAME,
  password: string = MANIFESTO_PASSWORD
): Promise<LoginResult> {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!res.ok || !data?.success || !data?.token) {
    throw new Error(data?.message || `Login failed with status ${res.status}`);
  }

  try {
    localStorage.setItem(LS_KEYS.TOKEN, data.token);
    localStorage.setItem(LS_KEYS.USER, JSON.stringify(data.data?.user || {}));
  } catch {}

  return { token: data.token, user: data.data?.user };
}

function ensureLocalToken(): string {
  let token = '';
  try {
    token = localStorage.getItem(LS_KEYS.TOKEN) || '';
  } catch {}
  return token;
}

function buildQueryParams(filters: ManifestoFilters, page: number, limit: number): string {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}`.trim() !== '') {
      params.append(k, String(v));
    }
  });
  params.append('page', String(page));
  params.append('limit', String(limit));
  return params.toString();
}

export async function fetchManifestoReportsPaged(
  filters: ManifestoFilters,
  token?: string,
  limit: number = 500,
  maxPages: number = 50 // safety guard
): Promise<ManifestoPagedResult> {
  let authToken = token || ensureLocalToken();
  if (!authToken) {
    const login = await loginManifestoApi();
    authToken = login.token;
  }

  let allData: any[] = [];
  let currentPage = 1;
  let totalSurveys = 0;
  let statistics: ManifestoStatistics | undefined = undefined;

  while (true) {
    if (currentPage > maxPages) break;

    const qs = buildQueryParams(filters, currentPage, limit);
    const res = await fetch(`${REPORTS_URL}?${qs}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Clear invalid token and rethrow
        try {
          localStorage.removeItem(LS_KEYS.TOKEN);
          localStorage.removeItem(LS_KEYS.USER);
        } catch {}
        throw new Error('unauthorized');
      }
      throw new Error(`API error ${res.status}`);
    }

    const json: ManifestoReportsResponse & { statistics?: ManifestoStatistics } = await res.json();

    if (currentPage === 1) {
      totalSurveys = json?.statistics?.totalSurveys || 0;
      statistics = json?.statistics;
    }

    const pageData = Array.isArray(json?.data) ? json.data : [];
    allData = allData.concat(pageData);

    if (allData.length >= totalSurveys || pageData.length === 0) break;
    currentPage++;
  }

  return { data: allData, statistics, totalSurveys };
}

// Home-card summary, cached for 15 minutes
export async function fetchManifestoSummary(forceRefresh?: boolean): Promise<{ totalSurveys: number }>{
  if (forceRefresh) {
    homePageCache.delete(CACHE_KEYS.MANIFESTO_SUMMARY);
  }

  return homePageCache.getOrSet(CACHE_KEYS.MANIFESTO_SUMMARY, async () => {
    let token = ensureLocalToken();
    if (!token) {
      const login = await loginManifestoApi();
      token = login.token;
    }

    const filters: ManifestoFilters = { };
    const qs = buildQueryParams(filters, 1, 1); // minimal page to get statistics
    const res = await fetch(`${REPORTS_URL}?${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        try {
          localStorage.removeItem(LS_KEYS.TOKEN);
          localStorage.removeItem(LS_KEYS.USER);
        } catch {}
        return { totalSurveys: 0 };
      }
      return { totalSurveys: 0 };
    }

    const json: ManifestoReportsResponse & { statistics?: ManifestoStatistics } = await res.json();
    const total = json?.statistics?.totalSurveys || 0;
    return { totalSurveys: total };
  });
}
