import { getAccountId } from './util';

export async function fetchUserAccount(accessToken: string) {
  const accountId = getAccountId(accessToken);
  if (!accountId) {
    throw new Error('Failed to extract account ID from token');
  }

  const url = `https://aws-prd.api.rccl.com/en/royal/web/v3/guestAccounts/${accountId}`;

  const headers = {
    'access-token': accessToken,
    'appkey': 'hyNNqIPHHzaLzVpcICPdAdbFV8yvTsAm',
    'content-type': 'application/json'
  };

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch user account: ${response.status} ${response.statusText} ${errorText}`);
  }

  return await response.json();
}


