ALTER TABLE "alunos"
  ADD COLUMN "senha" VARCHAR(255),
  ADD COLUMN "cliente_id" UUID;

CREATE UNIQUE INDEX "alunos_cliente_id_key" ON "alunos"("cliente_id");

ALTER TABLE "alunos"
  ADD CONSTRAINT "alunos_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id_cliente")
  ON DELETE SET NULL ON UPDATE CASCADE;
