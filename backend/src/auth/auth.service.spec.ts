import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';

const mockUser: Partial<User> = {
  id: 1,
  username: 'testuser',
  passwordHash: '',
  status: 1,
  isAdmin: false,
  email: 'test@test.com',
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      const hash = await bcrypt.hash('correctpass', 12);
      userRepo.findOne.mockResolvedValue({ ...mockUser, passwordHash: hash } as User);

      const result = await service.validateUser('testuser', 'correctpass');

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.username).toBe('testuser');
    });

    it('should return null when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.validateUser('unknown', 'pass');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const hash = await bcrypt.hash('correctpass', 12);
      userRepo.findOne.mockResolvedValue({ ...mockUser, passwordHash: hash } as User);

      const result = await service.validateUser('testuser', 'wrongpass');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return accessToken', async () => {
      const result = await service.login({ id: 1, username: 'testuser' });

      expect(result).toEqual({ accessToken: 'mock-token' });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 1, username: 'testuser' });
    });
  });
});
