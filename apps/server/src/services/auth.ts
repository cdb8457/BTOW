import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
    this.accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(payload: TokenPayload): string {
    const opts: SignOptions = {
      expiresIn: this.accessTokenExpiry as SignOptions['expiresIn'],
      issuer: 'btow',
      audience: 'btow-client',
    };
    return jwt.sign(payload, this.accessTokenSecret, opts);
  }

  generateRefreshToken(payload: Omit<TokenPayload, 'email' | 'username'>): string {
    const opts: SignOptions = {
      expiresIn: this.refreshTokenExpiry as SignOptions['expiresIn'],
      issuer: 'btow',
      audience: 'btow-client',
    };
    return jwt.sign(payload, this.refreshTokenSecret, opts);
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'btow',
        audience: 'btow-client',
      }) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  verifyRefreshToken(token: string): Omit<TokenPayload, 'email' | 'username'> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'btow',
        audience: 'btow-client',
      }) as Omit<TokenPayload, 'email' | 'username'>;
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  generateTokenPair(user: { id: string; email: string; username: string }) {
    const accessTokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const refreshTokenPayload = {
      userId: user.id,
    };

    const accessToken = this.generateAccessToken(accessTokenPayload);
    const refreshToken = this.generateRefreshToken(refreshTokenPayload);

    return { accessToken, refreshToken };
  }
}