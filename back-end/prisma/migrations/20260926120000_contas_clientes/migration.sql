-- Contas novas não alteram matrículas, instrutores ou senhas existentes.
CREATE TABLE "Cliente" (
    "id_cliente" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id_cliente")
);
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");
