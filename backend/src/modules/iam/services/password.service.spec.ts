import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes a password so the hash never equals the plain text', async () => {
    const hash = await service.hash('supersecret123');
    expect(hash).not.toEqual('supersecret123');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await service.hash('supersecret123');
    await expect(service.verify('supersecret123', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('supersecret123');
    await expect(service.verify('wrongpassword', hash)).resolves.toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const hashA = await service.hash('supersecret123');
    const hashB = await service.hash('supersecret123');
    expect(hashA).not.toEqual(hashB);
  });
});
