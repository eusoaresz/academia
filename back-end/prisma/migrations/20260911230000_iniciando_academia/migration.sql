-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('Dinheiro', 'Cartao', 'PIX');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('Pendente', 'Pago', 'Atrasado');

-- CreateTable
CREATE TABLE "alunos" (
    "id_aluno" SERIAL NOT NULL,
    "nome" VARCHAR(30) NOT NULL,
    "data_nascimento" SMALLINT NOT NULL,
    "email" VARCHAR(40) NOT NULL,
    "telefone" INTEGER NOT NULL,
    "data_cadastro" TEXT,
    "foto" TEXT NOT NULL,
    "id_plano" INTEGER NOT NULL,
    "status" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id_aluno")
);

-- CreateTable
CREATE TABLE "treinos" (
    "id_treino" SERIAL NOT NULL,
    "id_aluno" INTEGER NOT NULL,
    "id_instrutor" INTEGER NOT NULL,
    "objetivo" VARCHAR(100) NOT NULL,
    "observacoes" VARCHAR(200) NOT NULL,
    "data_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_saida" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treinos_pkey" PRIMARY KEY ("id_treino")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id_instrutor" SERIAL NOT NULL,
    "nome" VARCHAR(30) NOT NULL,
    "email" VARCHAR(40) NOT NULL,
    "telefone" INTEGER NOT NULL,
    "especialidade" VARCHAR(50) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "foto" TEXT NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_instrutor")
);

-- CreateTable
CREATE TABLE "planos" (
    "id_plano" SERIAL NOT NULL,
    "nome_plano" VARCHAR(30) NOT NULL,
    "descricao" VARCHAR(100) NOT NULL,
    "duracao_meses" SMALLINT NOT NULL,
    "valor_plano" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id_plano")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id_pagamento" SERIAL NOT NULL,
    "id_aluno" INTEGER NOT NULL,
    "id_plano" INTEGER NOT NULL,
    "data_pagamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "metodo" "MetodoPagamento" NOT NULL,
    "status_pagamento" "StatusPagamento" NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id_pagamento")
);
