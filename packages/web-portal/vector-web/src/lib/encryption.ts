import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';

// 🔐 THE SECRET KEY (In production, put this in .env)
const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'vector-capstone-secret-123';

// Function to Encrypt (Plaintext -> Gibberish)
export const encryptData = (text: string): string => {
  if (!text) return '';
  return AES.encrypt(text, SECRET_KEY).toString();
};

// Function to Decrypt (Gibberish -> Plaintext)
export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(encUtf8);
  } catch (error) {
    return 'Error: Could not decrypt';
  }
};