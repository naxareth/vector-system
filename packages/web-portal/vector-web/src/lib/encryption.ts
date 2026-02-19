import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';


const SECRET_KEY = process.env.ENCRYPTION_KEY!; 

if (!SECRET_KEY) {
  // Prevent app from starting if key is missing (Fail Secure)
  throw new Error("CRITICAL: ENCRYPTION_KEY is missing from environment variables.");
}

export const encryptData = (text: string): string => {
  if (!text) return '';
  return AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(encUtf8);
  } catch (error) {
    console.error("Decryption failed");
    return '';
  }
};