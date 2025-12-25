import { NextRequest, NextResponse } from 'next/server';
import { compareUserOffers } from '@/lib/comparison';

export async function POST(request: NextRequest) {
  try {
    const { user1Offers, user2Offers } = await request.json();

    if (!user1Offers || !Array.isArray(user1Offers)) {
      return NextResponse.json(
        { error: 'User 1 offers array is required' },
        { status: 400 }
      );
    }

    if (!user2Offers || !Array.isArray(user2Offers)) {
      return NextResponse.json(
        { error: 'User 2 offers array is required' },
        { status: 400 }
      );
    }

    const comparisonResults = compareUserOffers(user1Offers, user2Offers);

    return NextResponse.json(comparisonResults);
  } catch (error: any) {
    console.error('User comparison error:', error);
    return NextResponse.json(
      { error: error.message || 'User comparison failed' },
      { status: 500 }
    );
  }
}


