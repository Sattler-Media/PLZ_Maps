
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();


const USERNAME = process.env.DHL_USERNAME;
const PASSWORD = process.env.DHL_PASSWORD;
const LOCALE = process.env.DHL_LOCALE;


let apiKey = null;
let apiKeyExpiresAt = 0;

async function fetchApiKey() {
  
console.log('Login body:', {
  username: USERNAME,
  password: PASSWORD,
  locale: LOCALE
});

  const response = await fetch('https://api-uat-vzen.dhl.com/post/advertising/print-mailing/user/v1/authentication/businesslogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD, locale: LOCALE })
  });

  
if (!response.ok) {
  const errorText = await response.text();
  console.error('Login error response:', errorText);
  throw new Error('Login fehlgeschlagen');
}

  const data = await response.json();
  apiKey = data.jwtToken;
  apiKeyExpiresAt = Date.now() + (14 * 60 * 1000);
}

export async function getValidApiKey() {
  if (!apiKey || Date.now() > apiKeyExpiresAt) {
    await fetchApiKey();
  }
  return apiKey;
}
