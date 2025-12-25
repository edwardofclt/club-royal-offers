import { getAccountId } from "./util.js";

async function fetchAllOffers({ accessToken, cruiseLoyaltyId, consumerId }) {
  const accountID = getAccountId(accessToken)
  const response = await fetch("https://www.royalcaribbean.com/api/casino/casino-offers/v1", {
    "headers": {
      "authorization": `Bearer ${accessToken}`,
      "content-type": "application/json",
      'account-id': accountID
    },
    "body": JSON.stringify({
      cruiseLoyaltyId,
      consumerId,
      "brand": "R"
    }),
    "method": "POST"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch offers: ${response.status} ${response.statusText} ${await response.text()}`);
  }

  return await response.json();
}

export default fetchAllOffers;