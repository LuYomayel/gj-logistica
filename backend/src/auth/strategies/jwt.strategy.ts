import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserGroupMembership } from '../../entities/user-group-membership.entity';
import { Group } from '../../entities/group.entity';

export interface JwtPayload {
  sub: number;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserGroupMembership)
    private membershipRepo: Repository<UserGroupMembership>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'default-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, status: 1 },
    });
    if (!user) throw new UnauthorizedException();

    // Load user's group names for RBAC
    const memberships = await this.membershipRepo.find({
      where: { userId: user.id },
    });
    const groupIds = memberships.map((m) => m.groupId);
    const groups: string[] = [];

    if (groupIds.length > 0) {
      const userGroups = await this.groupRepo
        .createQueryBuilder('g')
        .where('g.id IN (:...ids)', { ids: groupIds })
        .getMany();
      groups.push(...userGroups.map((g) => g.name.toLowerCase()));
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      groups,
    };
  }
}
