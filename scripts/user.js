import { getAccountId } from "./util.js";

async function fetchUserAccount(accessToken) {
    const accountId = getAccountId(accessToken)
    const url = `https://aws-prd.api.rccl.com/en/royal/web/v3/guestAccounts/${accountId}`;

    const headers = {
        "access-token": accessToken,
        "appkey": 'hyNNqIPHHzaLzVpcICPdAdbFV8yvTsAm',
        "content-type": "application/json"
    };

    const options = {
        method: "GET",
        headers,
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Failed to fetch user account: ${response.status} ${response.statusText} ${await response.text()}`);
    }

    return await response.json();

}

export default fetchUserAccount;

// Example usage:
// const userAccount = await fetchUserAccount({
//   accountId: "G6060667",
//   accessToken: "your_access_token_here",
//   appKey: "hyNNqIPHHzaLzVpcICPdAdbFV8yvTsAm"
// });