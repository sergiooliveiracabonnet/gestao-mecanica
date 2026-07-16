// Reexporta o Prisma Client gerado. Outros workspaces (backend) importam daqui
// em vez de `@prisma/client` diretamente — assim a resolução de módulo em
// runtime sempre encontra o client gerado dentro de `database/node_modules`
// (onde `prisma generate` de fato roda), mesmo sob o isolamento estrito de
// node_modules do pnpm.
export * from '@prisma/client';
