import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async byName(name: string) {
    return this.prisma.unscoped.role.findFirst({
      where: { name },
    });
  }

  async byId(id: string) {
    return this.prisma.unscoped.role.findFirst({
      where: { id },
    });
  }

  async all() {
    return this.prisma.unscoped.role.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
