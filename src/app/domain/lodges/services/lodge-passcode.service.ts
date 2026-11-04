import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import {
  PASSCODE_PATTERN,
  PASSCODE_TTL_MS,
} from '../constants/lodge.constants';
import { Lodge } from '../entities/lodge.entity';

// no I or O, so a passcode read out loud or off a screenshot is hard to misread
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

// Step 4 shows the corper's admission passcode before they submit. The preview is signed
// (user + lodge + expiry), so the server issues the code and the client cannot choose one.
@Injectable()
export class LodgePasscodeService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('JWT_SECRET', 'defaultSecret');
  }

  issue(
    userId: string,
    lodge: Pick<Lodge, 'id' | 'lgaName' | 'name'>,
  ): { passcode: string; token: string; expiresAt: Date } {
    const passcode = this.generate(lodge);
    const expiresAt = new Date(Date.now() + PASSCODE_TTL_MS);
    const payload = [passcode, userId, lodge.id, expiresAt.getTime()].join('|');
    const token = `${Buffer.from(payload).toString('base64url')}.${this.sign(payload)}`;
    return { passcode, token, expiresAt };
  }

  // returns the passcode inside a valid, unexpired token issued to this user for this lodge
  verify(token: string, userId: string, lodgeId: string): string {
    const invalid = new BadRequestException(
      'Passcode expired or invalid. Refresh the code and try again',
    );
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) throw invalid;

    const payload = Buffer.from(encoded, 'base64url').toString();
    const expected = Buffer.from(this.sign(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      throw invalid;
    }

    const [passcode, tokenUser, tokenLodge, expires] = payload.split('|');
    if (
      tokenUser !== userId ||
      tokenLodge !== lodgeId ||
      Number(expires) < Date.now() ||
      !PASSCODE_PATTERN.test(passcode)
    ) {
      throw invalid;
    }
    return passcode;
  }

  // CL-EDE-2026-8942B: area code, year, four digits and a letter
  generate(lodge: Pick<Lodge, 'lgaName' | 'name'>): string {
    const area = (lodge.lgaName ?? lodge.name)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .padEnd(3, 'X')
      .slice(0, 3);
    const digits = String(randomInt(0, 10000)).padStart(4, '0');
    const letter = LETTERS[randomInt(0, LETTERS.length)];
    return `CL-${area}-${new Date().getFullYear()}-${digits}${letter}`;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}
