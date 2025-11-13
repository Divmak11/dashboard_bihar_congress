import { NextRequest, NextResponse } from 'next/server';
import { fetchManifestoComplaintsFromFirebase } from '@/app/utils/fetchManifestoComplaintsData';
import { ManifestoComplaintsFetchOptions, ManifestoFormType } from '@/models/manifestoComplaintsTypes';

/**
 * Fetch manifesto complaints data from Firebase
 * GET /api/manifesto-complaints/fetch?page=1&limit=25&search=&acName=
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const options: ManifestoComplaintsFetchOptions = {
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '25', 10),
      search: searchParams.get('search') || '',
      acName: searchParams.get('acName') || '',
      panchayatName: searchParams.get('panchayatName') || '',
    };

    const formTypeParam = (searchParams.get('formType') || '').trim();
    if (formTypeParam === 'ac-manifesto' || formTypeParam === 'panchayat-manifesto') {
      options.formType = formTypeParam as ManifestoFormType;
    }

    // Validate pagination parameters
    if (options.page! < 1) options.page = 1;
    if (options.limit! < 1 || options.limit! > 100) options.limit = 25;

    const result = await fetchManifestoComplaintsFromFirebase(options);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[manifesto-complaints/fetch] Error:', error);
    return NextResponse.json(
      {
        success: false,
        total: 0,
        entries: [],
        hasMore: false,
        error: error?.message || 'Failed to fetch manifesto complaints',
      },
      { status: 500 }
    );
  }
}
