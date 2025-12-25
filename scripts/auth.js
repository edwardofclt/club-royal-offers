async function requestAccessToken(username, password) {
    const url = 'https://www.royalcaribbean.com/auth/oauth2/access_token';
    const payload = new URLSearchParams({
        grant_type: 'password',
        username: username,
        password: password,
        scope: 'openid profile email vdsid'
    }).toString();

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded', 
            'Authorization': 'Basic ZzlTMDIzdDc0NDczWlVrOTA5Rk42OEYwYjRONjdQU09oOTJvMDR2TDBCUjY1MzdwSTJ5Mmg5NE02QmJVN0Q2SjpXNjY4NDZrUFF2MTc1MDk3NW9vZEg1TTh6QzZUYTdtMzBrSDJRNzhsMldtVTUwRkNncXBQMTN3NzczNzdrN0lC'
        },
        body: payload,
    });

    if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText} ${await response.text()}`);
    }

    const data = await response.json();
    return data;
}

export default requestAccessToken;