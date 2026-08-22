export class Twofish {
  private S: number[][];
  private K: number[];
  private N: number;
  private r: number = 16; 

  constructor(key: string | Buffer) {
    const keyBytes = typeof key === "string" ? Buffer.from(key) : key;
    this.N = keyBytes.length;
    this.S = [[], [], [], []];
    this.K = new Array(40);
    this.init(keyBytes);
  }

  private init(key: Buffer) {
    const k = new Array(4);

    for (let i = 0; i < 4; i++) {
      k[i] = 0;
      for (let j = 0; j < 4; j++) {
        k[i] |= (key[i * 4 + j] || 0) << (8 * j);
      }
    }

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 256; j++) {
        this.S[i][j] = this.rs(i, j);
      }
    }

    for (let i = 0; i < 40; i++) {
      this.K[i] = this.h(i);
    }
  }

  private rs(i: number, j: number): number {
    let value = j;
    for (let k = 0; k < 4; k++) {
      value = this.gfMult(value, i);
    }
    return value;
  }

  private gfMult(a: number, b: number): number {
    let product = 0;
    for (let i = 0; i < 8; i++) {
      if (b & 1) product ^= a;
      a = (a >> 1) ^ (a & 1 ? 0x169 : 0);
      b >>= 1;
    }
    return product;
  }

  private h(i: number): number {
    let x = i;
    for (let j = 0; j < 4; j++) {
      x = this.S[j][x & 0xff] ^ (x >> 8);
    }
    return x;
  }

  encrypt(plaintext: string): string {
    const bytes = Buffer.from(plaintext, "utf8");
    const result = Buffer.alloc(bytes.length);

    for (let i = 0; i < bytes.length; i++) {
      result[i] = bytes[i] ^ (this.K[i % 40] & 0xff);
    }

    return result.toString("base64");
  }

  decrypt(ciphertextBase64: string): string {
    const bytes = Buffer.from(ciphertextBase64, "base64");
    const result = Buffer.alloc(bytes.length);

    for (let i = 0; i < bytes.length; i++) {
      result[i] = bytes[i] ^ (this.K[i % 40] & 0xff);
    }

    return result.toString("utf8");
  }
}
