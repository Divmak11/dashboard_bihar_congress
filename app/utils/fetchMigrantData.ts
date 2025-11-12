// Migrant Survey API utilities
// Handles login, paginated reports fetching, and home-card summary caching

import { homePageCache, CACHE_KEYS } from './cacheUtils';
import { City, MigrantFilters, MigrantPagedResult, MigrantReportsResponse, MigrantStatistics } from '../../models/migrantTypes';

const API_BASE = 'https://api.shaktiabhiyan.in/api/v1';
const LOGIN_URL = `${API_BASE}/auth/login`;
const REPORTS_URLS: Record<City, string> = {
  delhi: `${API_BASE}/migrantSurvey/reports`,
  jaipur: `${API_BASE}/migrantSurveyJaipur/reports`,
};

// Credentials provided by user for this project usage (shared with Manifesto by instruction)
// NOTE: These are intentionally checked-in as per user instruction for this internal dashboard
const API_USERNAME = 'Ritin_6201';
const API_PASSWORD = 'Ritin@50647!';

// Local storage keys (namespaced)
export const LS_KEYS_MIGRANT = {
  TOKEN: 'migrant:token',
  USER: 'migrant:user',
} as const;

export interface LoginResult {
  token: string;
  user: any;
}

export async function loginMigrantApi(
  username: string = API_USERNAME,
  password: string = API_PASSWORD
): Promise<LoginResult> {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok || !data?.success || !data?.token) {
    throw new Error(data?.message || `Login failed with status ${res.status}`);
  }

  try {
    localStorage.setItem(LS_KEYS_MIGRANT.TOKEN, data.token);
    localStorage.setItem(LS_KEYS_MIGRANT.USER, JSON.stringify(data.data?.user || {}));
  } catch {}

  return { token: data.token, user: data.data?.user };
}

function ensureLocalToken(): string {
  let token = '';
  try {
    token = localStorage.getItem(LS_KEYS_MIGRANT.TOKEN) || '';
  } catch {}
  return token;
}

function buildQueryParams(city: City, filters: MigrantFilters, page: number, limit: number): string {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}`.trim() !== '') {
      if (city === 'delhi' && k === 'jaipurDistrict') return; // omit other-city field
      if (city === 'jaipur' && k === 'delhiDistrict') return; // omit other-city field
      params.append(k, String(v));
    }
  });
  params.append('page', String(page));
  params.append('limit', String(limit));
  return params.toString();
}

export async function fetchMigrantReportsPaged(
  city: City,
  filters: MigrantFilters,
  token?: string,
  limit: number = 500,
  maxPages: number = 50 // safety guard
): Promise<MigrantPagedResult> {
  let authToken = token || ensureLocalToken();
  if (!authToken) {
    const login = await loginMigrantApi();
    authToken = login.token;
  }

  let allData: any[] = [];
  let currentPage = 1;
  let totalSurveys = 0;
  let statistics: MigrantStatistics | undefined = undefined;

  while (true) {
    if (currentPage > maxPages) break;

    const qs = buildQueryParams(city, filters, currentPage, limit);
    const res = await fetch(`${REPORTS_URLS[city]}?${qs}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        try {
          localStorage.removeItem(LS_KEYS_MIGRANT.TOKEN);
          localStorage.removeItem(LS_KEYS_MIGRANT.USER);
        } catch {}
        throw new Error('unauthorized');
      }
      throw new Error(`API error ${res.status}`);
    }

    const json: MigrantReportsResponse & { statistics?: MigrantStatistics } = await res.json();

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
export async function fetchMigrantSummary(forceRefresh?: boolean): Promise<{ totalSurveysDelhi: number; totalSurveysJaipur: number; totalSurveys: number }>{
  if (forceRefresh) {
    homePageCache.delete(CACHE_KEYS.MIGRANT_SUMMARY);
  }

  return homePageCache.getOrSet(CACHE_KEYS.MIGRANT_SUMMARY, async () => {
    let token = ensureLocalToken();
    if (!token) {
      const login = await loginMigrantApi();
      token = login.token;
    }

    async function fetchCityTotal(city: City): Promise<number> {
      const qs = buildQueryParams(city, {}, 1, 1);
      const res = await fetch(`${REPORTS_URLS[city]}?${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          try {
            localStorage.removeItem(LS_KEYS_MIGRANT.TOKEN);
            localStorage.removeItem(LS_KEYS_MIGRANT.USER);
          } catch {}
          return 0;
        }
        return 0;
      }
      const json: MigrantReportsResponse & { statistics?: MigrantStatistics } = await res.json();
      return json?.statistics?.totalSurveys || 0;
    }

    const [d, j] = await Promise.all([fetchCityTotal('delhi'), fetchCityTotal('jaipur')]);
    return { totalSurveysDelhi: d, totalSurveysJaipur: j, totalSurveys: d + j };
  });
}
