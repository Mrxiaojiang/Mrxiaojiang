import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { AuthService } from './auth.service';
import { User } from '../user/user.entity';
import { EmailService } from '../email/email.service';
import { REDIS_CLIENT } from '../../config/redis.config';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let emailService: jest.Mocked<EmailService>;
  let redis: jest.Mocked<Redis>;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    nickname: 'TestUser',
    password: '$2b$10$hashedpassword',
    role: 'user',
    is_active: true,
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '2h',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key] ?? defaultValue ?? null;
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendCode: jest.fn(),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
            ttl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    emailService = module.get(EmailService);
    redis = module.get(REDIS_CLIENT);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── sendCode ──────────────────────────────────────────
  describe('sendCode', () => {
    it('should send verification code successfully', async () => {
      redis.get.mockResolvedValue(null);

      await service.sendCode('test@example.com');

      expect(redis.set).toHaveBeenCalledWith(
        'email_code:test@example.com',
        expect.any(String),
        'EX',
        300,
      );
      expect(redis.set).toHaveBeenCalledWith(
        'email_code_limit:test@example.com',
        '1',
        'EX',
        60,
      );
      expect(emailService.sendCode).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });

    it('should throw if code was sent within 60s', async () => {
      redis.get.mockResolvedValue('1');

      await expect(service.sendCode('test@example.com')).rejects.toThrow(
        BadRequestException,
      );
      expect(emailService.sendCode).not.toHaveBeenCalled();
    });
  });

  // ─── register ──────────────────────────────────────────
  describe('register', () => {
    const dto = {
      email: 'test@example.com',
      code: '123456',
      nickname: 'TestUser',
      password: 'Password123',
    };

    it('should register a new user', async () => {
      redis.get.mockResolvedValue('123456');
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as User);
      userRepository.save.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$hashedpassword' as never);

      const result = await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        nickname: 'TestUser',
        password: '$2b$10$hashedpassword',
      });
      expect(redis.del).toHaveBeenCalledWith('email_code:test@example.com');
      expect(result).toHaveProperty('accessToken', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-token');
    });

    it('should throw if code is invalid', async () => {
      redis.get.mockResolvedValue('654321');

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if code is expired', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if email already exists', async () => {
      redis.get.mockResolvedValue('123456');
      userRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ─── loginWithPassword ─────────────────────────────────
  describe('loginWithPassword', () => {
    const dto = { email: 'test@example.com', password: 'Password123' };

    it('should login with valid password', async () => {
      redis.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.loginWithPassword(dto);

      expect(redis.del).toHaveBeenCalledWith('login_attempt:test@example.com');
      expect(redis.del).toHaveBeenCalledWith('login_block:test@example.com');
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        last_login_at: expect.any(Date),
      });
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw if account is blocked', async () => {
      redis.get.mockResolvedValue('1');
      redis.ttl.mockResolvedValue(600);

      await expect(service.loginWithPassword(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if user not found', async () => {
      redis.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.loginWithPassword(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redis.incr).toHaveBeenCalled();
    });

    it('should throw if user is inactive', async () => {
      redis.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        is_active: false,
      } as User);

      await expect(service.loginWithPassword(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if password is wrong', async () => {
      redis.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.loginWithPassword(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should block after max failed attempts', async () => {
      redis.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);
      redis.incr.mockResolvedValue(5);

      await expect(service.loginWithPassword(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redis.set).toHaveBeenCalledWith(
        'login_block:test@example.com',
        '1',
        'EX',
        1800,
      );
    });
  });

  // ─── loginWithCode ─────────────────────────────────────
  describe('loginWithCode', () => {
    const dto = { email: 'test@example.com', code: '123456' };

    it('should login with valid code', async () => {
      redis.get.mockResolvedValue('123456');
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.loginWithCode(dto);

      expect(redis.del).toHaveBeenCalledWith('email_code:test@example.com');
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw if code is invalid', async () => {
      redis.get.mockResolvedValue('654321');

      await expect(service.loginWithCode(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      redis.get.mockResolvedValue('123456');
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.loginWithCode(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user is inactive', async () => {
      redis.get.mockResolvedValue('123456');
      userRepository.findOne.mockResolvedValue({ ...mockUser, is_active: false } as User);

      await expect(service.loginWithCode(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refreshTokens ─────────────────────────────────────
  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      redis.get.mockResolvedValue(null);
      jwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw if refresh token is blacklisted', async () => {
      redis.get.mockResolvedValue('1');

      await expect(service.refreshTokens('blacklisted-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if user not found or inactive', async () => {
      redis.get.mockResolvedValue(null);
      jwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email });
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if token is expired', async () => {
      redis.get.mockResolvedValue(null);
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── logout ────────────────────────────────────────────
  describe('logout', () => {
    it('should blacklist both tokens', async () => {
      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await service.logout('access-token', 'refresh-token');

      expect(redis.set).toHaveBeenCalledWith(
        'token_blacklist:refresh-token',
        '1',
        'EX',
        7 * 24 * 3600,
      );
      expect(redis.set).toHaveBeenCalledWith(
        'token_blacklist:access-token',
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('should still blacklist refresh token even if access token verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('token expired');
      });

      await service.logout('expired-access', 'valid-refresh');

      expect(redis.set).toHaveBeenCalledWith(
        'token_blacklist:valid-refresh',
        '1',
        'EX',
        7 * 24 * 3600,
      );
    });
  });

  // ─── resetPassword ────────────────────────────────────
  describe('resetPassword', () => {
    it('should reset password with valid code', async () => {
      redis.get.mockResolvedValue('123456');
      userRepository.findOne.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$newhashed' as never);

      const result = await service.resetPassword(
        'test@example.com',
        '123456',
        'NewPass123',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123', 10);
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: '$2b$10$newhashed',
      });
      expect(redis.del).toHaveBeenCalledWith('email_code:test@example.com');
      expect(result).toEqual({ message: '密码重置成功' });
    });

    it('should throw if code is invalid', async () => {
      redis.get.mockResolvedValue('654321');

      await expect(
        service.resetPassword('test@example.com', '123456', 'NewPass123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if email not registered', async () => {
      redis.get.mockResolvedValue('123456');
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('test@example.com', '123456', 'NewPass123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── changePassword ────────────────────────────────────
  describe('changePassword', () => {
    it('should change password with valid old password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$newhashed' as never);

      const result = await service.changePassword(
        mockUser.id,
        'OldPass123',
        'NewPass123',
      );

      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: '$2b$10$newhashed',
      });
      expect(result).toEqual({ message: '密码修改成功' });
    });

    it('should throw if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword(mockUser.id, 'OldPass123', 'NewPass123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if old password is wrong', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword(mockUser.id, 'WrongPass', 'NewPass123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
