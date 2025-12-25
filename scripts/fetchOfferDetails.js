import { access } from "fs";
import { getAccountId } from "./util.js";

/**
 * Fetches casino offer details from Royal Caribbean API
 * @param {Object} params - The request parameters
 * @param {string} params.accountId - The account ID (e.g., "G6060667")
 * @param {string} params.authorizationToken - The Bearer token for authentication
 * @param {Object} params.requestBody - The request body data
 * @param {string} params.requestBody.cruiseLoyaltyId - The cruise loyalty ID
 * @param {string} params.requestBody.offerCode - The offer code
 * @param {string} params.requestBody.playerOfferId - The player offer ID
 * @param {boolean} params.requestBody.returnExcludedSailings - Whether to return excluded sailings
 * @param {string} params.requestBody.brand - The brand code (e.g., "R")
 * @returns {Promise<Response>} - The fetch response
 */
async function fetchOfferDetails({ accessToken, requestBody }) {
    const accountId = getAccountId(accessToken)
    const url = "https://www.royalcaribbean.com/api/casino/casino-offers/v1";

    const headers = {
        "accept": "application/json",
        "account-id": accountId,
        "authorization": `Bearer ${accessToken}`,
        "content-type": "application/json",
    };

    const options = {
        method: "POST",
        headers,
        referrer: "https://www.royalcaribbean.com/club-royale/offers/",
        body: JSON.stringify(requestBody),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Failed to fetch offers: ${response.status} ${response.statusText} ${await response.text()}`);
    }

    return await response.json();
}

export default fetchOfferDetails