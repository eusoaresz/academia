-- AlterTable
ALTER TABLE "alunos" ALTER COLUMN "telefone" TYPE VARCHAR(20) USING "telefone"::text;

-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "telefone" TYPE VARCHAR(20) USING "telefone"::text;
