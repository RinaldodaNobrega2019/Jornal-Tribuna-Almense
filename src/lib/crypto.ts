import crypto from 'crypto';

const TOKEN_SECRET =
  process.env.AUTH_SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(`tribuna-almense:${process.env.SQL_DB_NAME || 'local'}:${process.env.SQL_HOST || 'host'}`)
    .digest('hex');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

export interface SessionPayload {
  uid: string;
  email: string;
  role: string;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, 'exp'>, ttlHours = 24): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encoded)
    .digest('base64url');
  return `ta.${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token.startsWith('ta.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, encoded, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(encoded)
      .digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function generateWavToneBuffer(kind: 'podcast' | 'music'): Buffer {
  const sampleRate = 22050;
  const durationSeconds = kind === 'podcast' ? 12 : 16;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const chordFreqs =
    kind === 'podcast'
      ? [220, 277.18, 329.63, 440]
      : [196, 246.94, 293.66, 392, 493.88];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env =
      Math.min(1, t / 0.4) *
      Math.min(1, (durationSeconds - t) / 0.8) *
      (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.25 * t));
    let sample = 0;
    for (let j = 0; j < chordFreqs.length; j++) {
      const f = chordFreqs[j] * (kind === 'music' && t > 8 ? 1.12246 : 1);
      sample += Math.sin(2 * Math.PI * f * t) / chordFreqs.length;
    }
    const pcm = Math.max(-32767, Math.min(32767, Math.round(sample * env * 9000)));
    buffer.writeInt16LE(pcm, 44 + i * 2);
  }
  return buffer;
}
