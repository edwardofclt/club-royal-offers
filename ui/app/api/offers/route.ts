import { NextRequest, NextResponse } from 'next/server';
import { fetchUserAccount } from '@/lib/user';
import { fetchAllOffers, fetchOfferDetails } from '@/lib/offers';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Fetch user account to get consumer ID and loyalty ID
    const user = await fetchUserAccount(accessToken);

    // Fetch all offers
    const offers = await fetchAllOffers({
      accessToken,
      consumerId: user.payload.consumerId,
      cruiseLoyaltyId: user.payload.loyaltyInformation.crownAndAnchorId
    });

    // Fetch details for each offer
    const offersWithDetails = await Promise.all(
      offers.offers.map(async (offer: any) => {
        try {
          const details = await fetchOfferDetails({
            accessToken,
            requestBody: {
              returnExcludedSailings: true,
              brand: 'R',
              cruiseLoyaltyId: user.payload.loyaltyInformation.crownAndAnchorId,
              offerCode: offer.campaignOffer.offerCode,
              playerOfferId: offer.playerOfferId
            }
          });

          return {
            offer,
            details
          };
        } catch (error: any) {
          console.error('Error fetching offer details:', error);
          return {
            offer,
            details: null,
            error: error.message
          };
        }
      })
    );

    return NextResponse.json({
      user,
      offers: offersWithDetails
    });
  } catch (error: any) {
    console.error('Offers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}


