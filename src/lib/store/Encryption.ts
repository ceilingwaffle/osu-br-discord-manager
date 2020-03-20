import crypto from 'crypto';

import intEncoder from 'int-encoder';

export class Encryption {
  public static _encryptBase64(plaintext: string): string {
    // TODO: FIOX - BROKEN - 1/10 chance to throw error "wrong final block length"
    const iv = crypto.randomBytes(Encryption.ivLength);
    const encryptionKey = Encryption.getCryptoKey();
    const cipher = crypto.createCipheriv(Encryption.algorithm, Buffer.from(encryptionKey), iv);
    const encryptionBuffer = cipher.update(plaintext);
    const encrypted = Buffer.concat([encryptionBuffer, cipher.final()]);
    const ivHex = iv.toString('hex');
    const encHex = encrypted.toString('hex');
    const encryptedBase64 = intEncoder.encode(ivHex, 16) + ':' + intEncoder.encode(encHex, 16);
    return encryptedBase64;
  }

  public static _decryptBase64(base64EncryptedText: string): string {
    // TODO: FIOX - BROKEN - 1/10 chance to throw error "wrong final block length"
    const textParts = base64EncryptedText.split(':');
    textParts.forEach((value, index) => (textParts[index] = intEncoder.decode(value, 16)));
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const encryptionKey = Encryption.getCryptoKey();
    const decipher = crypto.createDecipheriv(Encryption.algorithm, Buffer.from(encryptionKey), iv);
    const decryptionBuffer = decipher.update(encryptedText);
    const decrypted = Buffer.concat([decryptionBuffer, decipher.final()]);
    const decryptedText = decrypted.toString();
    return decryptedText;
  }

  public static encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(Encryption.ivLength);
    const encryptionKey = Encryption.getCryptoKey();
    const cipher = crypto.createCipheriv(Encryption.algorithm, Buffer.from(encryptionKey), iv);
    const encryptionBuffer = cipher.update(plaintext);
    const encrypted = Buffer.concat([encryptionBuffer, cipher.final()]);
    const ivHex = iv.toString('hex');
    const encHex = encrypted.toString('hex');
    return ivHex + ':' + encHex;
  }

  public static decrypt(text: string): string {
    const textParts = text.split(':');
    // textParts.forEach((value, index) => (textParts[index] = intEncoder.decode(value, 16)));
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const encryptionKey = Encryption.getCryptoKey();
    const decipher = crypto.createDecipheriv(Encryption.algorithm, Buffer.from(encryptionKey), iv);
    const decryptionBuffer = decipher.update(encryptedText);
    const decrypted = Buffer.concat([decryptionBuffer, decipher.final()]);
    const decryptedText = decrypted.toString();
    return decryptedText;
  }

  private static readonly algorithm = 'aes-256-cbc';
  private static readonly algorithmByteLength = 32;
  private static readonly ivLength = 16; // must always be 16 for AES

  private static getCryptoKey(): string {
    const key = process.env.CRYPTO_KEY;

    if (!key || key.length !== Encryption.algorithmByteLength) {
      throw new Error('Crypto key not defined or not 256 bits (32 characters)');
    }

    return key;
  }
}
