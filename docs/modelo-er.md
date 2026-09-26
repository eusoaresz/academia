# Modelo E-R — área do cliente

```mermaid
erDiagram
    Cliente ||--o{ Agendamento : solicita
    Plano ||--o{ Horario : oferece
    Plano ||--o{ Agendamento : recebe
    Horario ||--o{ Agendamento : historico
    Admin o|--o{ Agendamento : responde
    Cliente {
      uuid id_cliente PK
      string nome
      string email UK
      string senha_hash
      string telefone
    }
    Plano {
      int id_plano PK
      string nome_plano
      boolean ativo
      boolean destaque
      string ia_texto
      string ia_modelo
      datetime ia_gerado_em
    }
    Horario {
      int id_horario PK
      int id_plano FK
      datetime data_hora
      boolean ativo
    }
    Agendamento {
      uuid id_agendamento PK
      uuid id_cliente FK
      int id_plano FK
      int id_horario FK
      uuid id_admin FK
      enum status
      string observacao_cliente
      string resposta_admin
      datetime criado_em
      datetime respondido_em
    }
    Admin {
      uuid id_admin PK
      string email UK
      string senha_hash
      boolean ativo
    }
```

Cada horário comporta uma reserva ativa. O histórico pode ter reservas canceladas
ou recusadas; um índice único parcial impede duas solicitações pendentes ou
confirmadas para a mesma vaga. As chaves estrangeiras preservam o histórico.

O administrador publica os horários; o cliente seleciona uma vaga futura. O
plano da solicitação é obtido do horário no servidor. O cliente é obtido do JWT.
As datas são guardadas como instantes UTC e apresentadas em America/Sao_Paulo.

Alunos, instrutores, treinos e pagamentos continuam como cadastros administrativos
legados. Eles não são a conta de acesso do cliente e ainda têm suas limitações de
modelagem anteriores. O fluxo novo possui cinco tabelas efetivamente relacionadas.
