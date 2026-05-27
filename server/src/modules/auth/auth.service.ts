import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { User } from '../user/user.entity';
import { EmailService } from '../email/email.service';
import { REDIS_CLIENT } from '../../config/redis.config';
import { RegisterDto } from './dto/register.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { LoginCodeDto } from './dto/login-code.dto';

const LOGIN_ATTEMPT_KEY = 'login_attempt:';
const LOGIN_BLOCK_KEY = 'login_block:';
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 30 * 60;
const TOKEN_BLACKLIST_PREFIX = 'token_blacklist:';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    @Inject(REDIS_CLIENT)
    private redis: Redis,
  ) {}

  // ─── 发送验证码 ───────────────────────────────────────
  async sendCode(email: string): Promise<void> {
    const limitKey = `email_code_limit:${email}`;
    const limited = await this.redis.get(limitKey);
    if (limited) {
      throw new BadRequestException('验证码已发送，请 60 秒后再试');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeKey = `email_code:${email}`;

    await this.redis.set(codeKey, code, 'EX', 300);
    await this.redis.set(limitKey, '1', 'EX', 60);

    await this.emailService.sendCode(email, code);
  }

  // ─── 注册 ─────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const codeKey = `email_code:${dto.email}`;
    const storedCode = await this.redis.get(codeKey);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException('验证码无效或已过期');
    }

    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('该邮箱已被注册');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      nickname: dto.nickname,
      password: hashedPassword,
    });
    await this.userRepository.save(user);

    await this.redis.del(codeKey);
    this.logger.log(`新用户注册: ${dto.email}`);

    return this.generateTokens(user);
  }

  // ─── 密码登录（含失败限流） ─────────────────────────
  async loginWithPassword(dto: LoginPasswordDto) {
    const blocked = await this.redis.get(`${LOGIN_BLOCK_KEY}${dto.email}`);
    if (blocked) {
      const ttl = await this.redis.ttl(`${LOGIN_BLOCK_KEY}${dto.email}`);
      throw new UnauthorizedException(
        `账号已锁定，请在 ${Math.ceil(ttl / 60)} 分钟后重试`,
      );
    }

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      await this.recordFailedAttempt(dto.email);
      throw new UnauthorizedException('邮箱或密码错误');
    }
    if (!user.is_active) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.recordFailedAttempt(dto.email);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    await this.redis.del(`${LOGIN_ATTEMPT_KEY}${dto.email}`);
    await this.redis.del(`${LOGIN_BLOCK_KEY}${dto.email}`);

    await this.updateLoginTime(user.id);
    return this.generateTokens(user);
  }

  private async recordFailedAttempt(email: string) {
    const key = `${LOGIN_ATTEMPT_KEY}${email}`;
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, BLOCK_DURATION);
    }
    if (attempts >= MAX_ATTEMPTS) {
      await this.redis.set(
        `${LOGIN_BLOCK_KEY}${email}`,
        '1',
        'EX',
        BLOCK_DURATION,
      );
      this.logger.warn(`账号已锁定: ${email}，连续失败 ${attempts} 次`);
      throw new UnauthorizedException(
        `登录失败次数过多，账号已锁定 ${BLOCK_DURATION / 60} 分钟`,
      );
    }
  }

  // ─── 验证码登录 ───────────────────────────────────────
  async loginWithCode(dto: LoginCodeDto) {
    const codeKey = `email_code:${dto.email}`;
    const storedCode = await this.redis.get(codeKey);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException('验证码无效或已过期');
    }

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('该邮箱未注册，请先注册');
    }
    if (!user.is_active) {
      throw new UnauthorizedException('账号已被禁用');
    }

    await this.redis.del(codeKey);
    await this.redis.del(`${LOGIN_ATTEMPT_KEY}${dto.email}`);
    await this.redis.del(`${LOGIN_BLOCK_KEY}${dto.email}`);

    await this.updateLoginTime(user.id);
    return this.generateTokens(user);
  }

  // ─── Token 生成 ───────────────────────────────────────
  private generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '2h'),
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
    };
  }

  // ─── 刷新 Token（含黑名单检查） ─────────────────────
  async refreshTokens(refreshToken: string) {
    const blacklisted = await this.redis.get(
      `${TOKEN_BLACKLIST_PREFIX}${refreshToken}`,
    );
    if (blacklisted) {
      throw new UnauthorizedException('Token 已失效，请重新登录');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.userRepository.findOne({
        where: { id: payload.sub, is_active: true },
      });
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }
      return this.generateTokens(user);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }
  }

  // ─── 登出（Token 加入黑名单） ────────────────────────
  async logout(accessToken: string, refreshToken: string) {
    await this.redis.set(
      `${TOKEN_BLACKLIST_PREFIX}${refreshToken}`,
      '1',
      'EX',
      7 * 24 * 3600,
    );
    try {
      const payload = this.jwtService.verify(accessToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await this.redis.set(
          `${TOKEN_BLACKLIST_PREFIX}${accessToken}`,
          '1',
          'EX',
          expiresIn,
        );
      }
    } catch {
      // accessToken 可能已过期，忽略
    }
  }

  // ─── 重置密码（邮箱验证码） ──────────────────────────
  async resetPassword(email: string, code: string, newPassword: string) {
    const codeKey = `email_code:${email}`;
    const storedCode = await this.redis.get(codeKey);

    if (!storedCode || storedCode !== code) {
      throw new BadRequestException('验证码无效或已过期');
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('该邮箱未注册');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(user.id, { password: hashedPassword });
    await this.redis.del(codeKey);

    this.logger.log(`密码已重置: ${email}`);
    return { message: '密码重置成功' };
  }

  // ─── 修改密码（需旧密码验证） ────────────────────────
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');

    const isOldValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldValid) throw new BadRequestException('旧密码错误');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, { password: hashedPassword });

    this.logger.log(`密码已修改: ${user.email}`);
    return { message: '密码修改成功' };
  }

  // ─── 更新登录时间 ─────────────────────────────────────
  private async updateLoginTime(userId: string) {
    await this.userRepository.update(userId, {
      last_login_at: new Date(),
    });
  }
}
