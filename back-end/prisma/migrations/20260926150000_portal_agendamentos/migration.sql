ALTER TABLE "planos" ADD COLUMN "destaque" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "ia_texto" TEXT, ADD COLUMN "ia_modelo" TEXT, ADD COLUMN "ia_gerado_em" TIMESTAMP(3);
CREATE TYPE "StatusAgendamento" AS ENUM ('Pendente','Confirmado','Recusado','Cancelado');
CREATE TABLE "Admin" (
 "id_admin" UUID PRIMARY KEY, "nome" VARCHAR(80) NOT NULL, "email" VARCHAR(254) NOT NULL UNIQUE,
 "senha" VARCHAR(255) NOT NULL, "ativo" BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE "Horario" (
 "id_horario" SERIAL PRIMARY KEY, "id_plano" INTEGER NOT NULL REFERENCES "planos"("id_plano") ON DELETE RESTRICT ON UPDATE CASCADE,
 "data_hora" TIMESTAMP(3) NOT NULL, "ativo" BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX "Horario_id_plano_data_hora_key" ON "Horario"("id_plano", "data_hora");
CREATE TABLE "Agendamento" (
 "id_agendamento" UUID PRIMARY KEY,
 "id_cliente" UUID NOT NULL REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE,
 "id_plano" INTEGER NOT NULL REFERENCES "planos"("id_plano") ON DELETE RESTRICT ON UPDATE CASCADE,
 "id_horario" INTEGER NOT NULL REFERENCES "Horario"("id_horario") ON DELETE RESTRICT ON UPDATE CASCADE,
 "id_admin" UUID REFERENCES "Admin"("id_admin") ON DELETE RESTRICT ON UPDATE CASCADE,
 "observacao_cliente" VARCHAR(500) NOT NULL DEFAULT '',
 "status" "StatusAgendamento" NOT NULL DEFAULT 'Pendente', "resposta_admin" VARCHAR(1000),
 "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "respondido_em" TIMESTAMP(3)
);
CREATE INDEX "Agendamento_id_cliente_criado_em_idx" ON "Agendamento"("id_cliente", "criado_em");
CREATE INDEX "Agendamento_status_idx" ON "Agendamento"("status");
-- Uma vaga por horário. A restrição garante consistência mesmo entre requisições concorrentes.
CREATE UNIQUE INDEX "Agendamento_horario_ocupado" ON "Agendamento"("id_horario") WHERE "status" IN ('Pendente','Confirmado');
