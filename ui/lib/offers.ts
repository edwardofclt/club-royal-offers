import { getAccountId } from './util';

export async function fetchAllOffers(params: {
  accessToken: string;
  cruiseLoyaltyId: string;
  consumerId: string;
}) {
  const accountID = getAccountId(params.accessToken);
  if (!accountID) {
    throw new Error('Failed to extract account ID from token');
  }

  const response = await fetch('https://www.royalcaribbean.com/api/casino/casino-offers/v1', {
    headers: {
      authorization: `Bearer ${params.accessToken}`,
      'content-type': 'application/json',
      'account-id': accountID
    },
    body: JSON.stringify({
      cruiseLoyaltyId: params.cruiseLoyaltyId,
      consumerId: params.consumerId,
      brand: 'R'
    }),
    method: 'POST'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch offers: ${response.status} ${response.statusText} ${errorText}`);
  }

  return await response.json();
}

export async function fetchOfferDetails(params: {
  accessToken: string;
  requestBody: {
    returnExcludedSailings: boolean;
    brand: string;
    cruiseLoyaltyId: string;
    offerCode: string;
    playerOfferId: string;
  };
}) {
  const accountId = getAccountId(params.accessToken);
  if (!accountId) {
    throw new Error('Failed to extract account ID from token');
  }

  const url = 'https://www.royalcaribbean.com/api/casino/casino-offers/v1';

  const headers = {
    accept: 'application/json',
    'account-id': accountId,
    authorization: `Bearer ${params.accessToken}`,
    'content-type': 'application/json',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    referrer: 'https://www.royalcaribbean.com/club-royale/offers/',
    body: JSON.stringify(params.requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch offers: ${response.status} ${response.statusText} ${errorText}`);
  }

  return await response.json();
}


