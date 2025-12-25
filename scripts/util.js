import readline from 'readline';

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

export function askPassword(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    function onData(char) {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    }

    stdin.on('data', onData);
  });
}

export function getAccountId(token) {
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
    const decodedPayload = atob(paddedPayload);
    const payloadObj = JSON.parse(decodedPayload);

    return payloadObj.sub;
  } catch (error) {
    console.error('Error decoding JWT token:', error.message);
    return null;
  }
}
