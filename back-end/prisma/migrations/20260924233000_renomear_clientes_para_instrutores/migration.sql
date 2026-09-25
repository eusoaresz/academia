-- Rename the legacy table to match the Instrutor model in schema.prisma
ALTER TABLE "clientes" RENAME TO "instrutores";
ALTER INDEX "clientes_pkey" RENAME TO "instrutores_pkey";
