import forge from 'node-forge';

/** Same RSA public key as society-assets-ui login (JSEncrypt / Java RSA/ECB/PKCS1Padding). */
const PUBLIC_KEY_BASE64 =
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCXMzMHXFnHV1fi7eWWU8o5/QH4lde5eGOKNc9szBa91uXazLAl9fRRxIE4c9KGQCjywNdb2uIiwQHVZys+H6sYcNDHLw21/VkzcTjncFfrs5iVq2MI1VEBWtHJr9aCvwO1NboDwrcp8VDzS4YGQXWda//qKmnQMHlc0pNt2JdXBQIDAQAB';

function toPem(base64Body: string): string {
  const lines = base64Body.match(/.{1,64}/g)?.join('\n') ?? base64Body;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

export function encryptPasswordForLogin(plainPassword: string): string {
  const pem = toPem(PUBLIC_KEY_BASE64);
  const publicKey = forge.pki.publicKeyFromPem(pem);
  const bytes = forge.util.encodeUtf8(plainPassword);
  const encrypted = publicKey.encrypt(bytes, 'RSAES-PKCS1-V1_5');
  return forge.util.encode64(encrypted);
}
