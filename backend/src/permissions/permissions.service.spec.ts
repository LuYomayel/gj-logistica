import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { Permission } from '../entities/permission.entity';
import { PermissionGroup } from '../entities/permission-group.entity';
import { PermissionGroupItem } from '../entities/permission-group-item.entity';
import { UserPermissionGroup } from '../entities/user-permission-group.entity';
import { UserPermission } from '../entities/user-permission.entity';
import { User } from '../entities/user.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const superAdmin = {
  id: 1, username: 'sa', email: null, isAdmin: true,
  userType: 'super_admin' as const, tenantId: null, permissions: ['*'],
};
const clientAdmin = {
  id: 2, username: 'ca', email: 'ca@t.com', isAdmin: false,
  userType: 'client_admin' as const, tenantId: 1, permissions: ['*'],
};

const mockPerm = { id: 1, module: 'orders', action: 'read', label: 'Consultar pedidos', isAdvanced: false, isActive: true };
const mockGroup = { id: 1, tenantId: 1, name: 'Ventas', description: null, isActive: true };
const mockGroupItem = { id: 1, groupId: 1, permissionId: 1 };
const mockUserGroup = { userId: 2, groupId: 1 };
const mockUserPerm = { id: 1, userId: 2, permissionId: 1, granted: true };
const mockUser = { id: 2, username: 'user1', email: 'u@t.com', entity: 1, userType: 'client_user' };

function makeQb(result: unknown) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}

const mockPermRepo = {
  find: jest.fn().mockResolvedValue([mockPerm]),
  findOne: jest.fn(),
  findByIds: jest.fn().mockResolvedValue([mockPerm]),
};
const mockGroupRepo = {
  createQueryBuilder: jest.fn(() => makeQb([mockGroup])),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};
const mockGroupItemRepo = {
  find: jest.fn().mockResolvedValue([mockGroupItem]),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQb([mockGroupItem])),
};
const mockUserGroupRepo = {
  find: jest.fn().mockResolvedValue([mockUserGroup]),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};
const mockUserPermRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};
const mockUserRepo = {
  find: jest.fn().mockResolvedValue([mockUser]),
  findOne: jest.fn(),
  findByIds: jest.fn().mockResolvedValue([mockUser]),
};

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: getRepositoryToken(Permission), useValue: mockPermRepo },
        { provide: getRepositoryToken(PermissionGroup), useValue: mockGroupRepo },
        { provide: getRepositoryToken(PermissionGroupItem), useValue: mockGroupItemRepo },
        { provide: getRepositoryToken(UserPermissionGroup), useValue: mockUserGroupRepo },
        { provide: getRepositoryToken(UserPermission), useValue: mockUserPermRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();
    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('getCatalog', () => {
    it('returns permissions grouped by module', async () => {
      const result = await service.getCatalog();
      expect(result['orders']).toBeDefined();
      expect(result['orders'][0].action).toBe('read');
    });
  });

  describe('findGroups', () => {
    it('super_admin gets all groups without tenant filter', async () => {
      const result = await service.findGroups(superAdmin);
      expect(result).toEqual([mockGroup]);
    });

    it('client_admin gets only their tenant groups', async () => {
      const result = await service.findGroups(clientAdmin);
      expect(result).toEqual([mockGroup]);
    });
  });

  describe('findGroupById', () => {
    it('returns group if found and accessible', async () => {
      mockGroupRepo.findOne.mockResolvedValueOnce(mockGroup);
      const result = await service.findGroupById(1, clientAdmin);
      expect(result).toEqual(mockGroup);
    });

    it('throws NotFoundException if not found', async () => {
      mockGroupRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findGroupById(999, superAdmin)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if group belongs to different tenant', async () => {
      const otherTenantGroup = { ...mockGroup, tenantId: 99 };
      mockGroupRepo.findOne.mockResolvedValueOnce(otherTenantGroup);
      await expect(service.findGroupById(1, clientAdmin)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createGroup', () => {
    it('creates group with super_admin tenantId=null', async () => {
      mockGroupRepo.create.mockReturnValue({ ...mockGroup, tenantId: null });
      mockGroupRepo.save.mockResolvedValueOnce({ ...mockGroup, tenantId: null });
      const result = await service.createGroup({ name: 'TestGroup' }, superAdmin);
      expect(result.tenantId).toBeNull();
    });

    it('creates group with client_admin tenantId', async () => {
      mockGroupRepo.create.mockReturnValue({ ...mockGroup, tenantId: 1 });
      mockGroupRepo.save.mockResolvedValueOnce(mockGroup);
      const result = await service.createGroup({ name: 'Ventas' }, clientAdmin);
      expect(result.tenantId).toBe(1);
    });
  });

  describe('addPermissionToGroup', () => {
    it('adds permission to group (idempotent if already exists)', async () => {
      mockGroupRepo.findOne.mockResolvedValueOnce(mockGroup);
      mockPermRepo.findOne.mockResolvedValueOnce(mockPerm);
      mockGroupItemRepo.findOne.mockResolvedValueOnce(mockGroupItem); // already exists
      await expect(service.addPermissionToGroup(1, 1, clientAdmin)).resolves.toBeUndefined();
      expect(mockGroupItemRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if permission not found', async () => {
      mockGroupRepo.findOne.mockResolvedValueOnce(mockGroup);
      mockPermRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.addPermissionToGroup(1, 999, clientAdmin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMemberToGroup', () => {
    it('throws ForbiddenException if user from different tenant', async () => {
      mockGroupRepo.findOne.mockResolvedValueOnce(mockGroup);
      mockUserRepo.findOne.mockResolvedValueOnce({ ...mockUser, entity: 99 }); // different tenant
      // service throws ForbiddenException before reaching userGroupRepo.findOne
      await expect(service.addMemberToGroup(1, 2, clientAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('adds member (idempotent if already member)', async () => {
      mockGroupRepo.findOne.mockResolvedValueOnce(mockGroup);
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockUserGroupRepo.findOne.mockResolvedValueOnce(mockUserGroup); // already member
      await expect(service.addMemberToGroup(1, 2, clientAdmin)).resolves.toBeUndefined();
      expect(mockUserGroupRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('returns effective permissions and overrides', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockUserGroupRepo.find.mockResolvedValueOnce([mockUserGroup]);
      mockGroupItemRepo.createQueryBuilder.mockReturnValue(makeQb([mockGroupItem]));
      mockUserPermRepo.find.mockResolvedValueOnce([]);
      mockPermRepo.findByIds.mockResolvedValueOnce([mockPerm]);
      const result = await service.getUserEffectivePermissions(2, clientAdmin);
      expect(result.effective).toContain('orders.read');
    });

    it('throws NotFoundException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getUserEffectivePermissions(999, superAdmin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('setUserPermission', () => {
    it('creates new override if not exists', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockPermRepo.findOne.mockResolvedValueOnce(mockPerm);
      mockUserPermRepo.findOne.mockResolvedValueOnce(null);
      mockUserPermRepo.create.mockReturnValue(mockUserPerm);
      mockUserPermRepo.save.mockResolvedValueOnce(mockUserPerm);
      const result = await service.setUserPermission(2, { permissionId: 1, granted: true }, clientAdmin);
      expect(result.granted).toBe(true);
    });
  });

  describe('removeUserPermission', () => {
    it('throws NotFoundException if override not found', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockUserPermRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.removeUserPermission(2, 999, clientAdmin)).rejects.toThrow(NotFoundException);
    });
  });
});
