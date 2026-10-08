import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto';
import { UpdateTenantDto } from './update-tenant.dto';

const codeErrors = async <T extends object>(cls: new () => T, payload: object): Promise<string[]> => {
  const errors = await validate(plainToInstance(cls, payload));
  return errors.filter((e) => e.property === 'code').flatMap((e) => Object.values(e.constraints ?? {}));
};

describe('Validación del código de organización', () => {
  it.each(['..', '.', '---', '  '])('CreateTenantDto rechaza "%s" (sin letras ni números)', async (code) => {
    const errors = await codeErrors(CreateTenantDto, { name: 'Org', code });
    expect(errors).toContain('El código debe tener al menos una letra o un número');
  });

  it.each(['SYNG EVENTOS', 'NK', 'A1', 'syng.bio'])('CreateTenantDto acepta "%s"', async (code) => {
    expect(await codeErrors(CreateTenantDto, { name: 'Org', code })).toEqual([]);
  });

  it('UpdateTenantDto rechaza ".." al editar', async () => {
    const errors = await codeErrors(UpdateTenantDto, { code: '..' });
    expect(errors).toContain('El código debe tener al menos una letra o un número');
  });

  it('UpdateTenantDto permite no mandar código (edición parcial)', async () => {
    expect(await codeErrors(UpdateTenantDto, { name: 'Nuevo nombre' })).toEqual([]);
  });
});
