// Atalho de conveniência na raiz do repo. A implementação real do seed vive
// em `database/prisma/seed.ts` (convenção do Prisma: `prisma db seed` exige
// que o script fique ao lado do schema.prisma para resolver `@prisma/client`
// corretamente a partir de `database/node_modules`).
import { execSync } from 'node:child_process';

execSync('pnpm --filter @oficina/database run seed', { stdio: 'inherit' });
