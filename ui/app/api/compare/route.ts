import { NextRequest, NextResponse } from 'next/server';
import { compareOffersWithBounceBack, formatComparisonResultsAsCSV, Filters } from '@/lib/comparison';

export async function POST(request: NextRequest) {
  try {
    const { apiOffers, filters, csvContent, format = 'json' } = await request.json();

    if (!apiOffers || !Array.isArray(apiOffers)) {
      return NextResponse.json(
        { error: 'API offers array is required' },
        { status: 400 }
      );
    }

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { error: 'CSV content is required' },
        { status: 400 }
      );
    }

    const comparisonResults = compareOffersWithBounceBack(
      apiOffers,
      filters as Filters || {},
      csvContent
    );

    if (format === 'csv') {
      const csv = formatComparisonResultsAsCSV(comparisonResults);
      return NextResponse.json({ csv, results: comparisonResults });
    }

    return NextResponse.json(comparisonResults);
  } catch (error: any) {
    console.error('Comparison error:', error);
    return NextResponse.json(
      { error: error.message || 'Comparison failed' },
      { status: 500 }
    );
  }
}


