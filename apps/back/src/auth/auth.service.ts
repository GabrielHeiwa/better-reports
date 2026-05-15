import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async googleLogin(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    }).catch(() => {
      throw new UnauthorizedException('Invalid Google token');
    });

    const payload = ticket.getPayload();
    if (!payload?.sub) throw new UnauthorizedException('Invalid Google token payload');

    const user = await this.prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture ?? null,
      },
      create: {
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture ?? null,
      },
    });

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });

    return { user, token };
  }
}
