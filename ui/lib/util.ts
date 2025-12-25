export function getAccountId(token: string): string | null {
  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    // Decode the payload (middle part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Use Buffer in Node.js environment, atob in browser
    let decodedPayload: string;
    if (typeof Buffer !== 'undefined') {
      decodedPayload = Buffer.from(paddedPayload, 'base64').toString('utf-8');
    } else {
      decodedPayload = atob(paddedPayload);
    }
    
    const payloadObj = JSON.parse(decodedPayload);

    return payloadObj.sub;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

