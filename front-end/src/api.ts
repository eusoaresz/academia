export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
export class ApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status } }
export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(API + path, { ...options, headers, signal: options.signal ?? AbortSignal.timeout(55000) })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(typeof data?.erro === 'string' ? data.erro : 'Não foi possível concluir a operação.', response.status)
  if (data === null) throw new ApiError('Resposta inválida do servidor.', 502)
  return data as T
}
export const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível acessar o servidor.'
export type Cliente = { id_cliente: string; nome: string; email: string; telefone: string }
export type Plano = { id_plano: number; nome_plano: string; descricao: string; duracao_meses: number; valor_plano: number; ativo: boolean; destaque: boolean; ia_texto: string | null; ia_modelo: string | null; ia_gerado_em: string | null }
export type Horario = { id_horario: number; id_plano: number; data_hora: string; ativo: boolean; plano?: { nome_plano: string }; _count?: { agendamentos: number } }
export type Agendamento = { id_agendamento: string; id_plano: number; status: 'Pendente' | 'Confirmado' | 'Recusado' | 'Cancelado'; observacao_cliente: string; resposta_admin: string | null; criado_em: string; respondido_em: string | null; plano: { nome_plano: string }; horario: { data_hora: string }; cliente?: { nome: string; email: string }; admin: { nome: string } | null }
export type Pagamento = { id_pagamento: number; valor: number; metodo: 'PIX' | 'Cartao' | 'Dinheiro'; status_pagamento: 'Pendente' | 'Pago' | 'Atrasado'; data_pagamento: string }
export type MeuPlano = { matriculado: false } | { matriculado: true; desde: string; plano: Pick<Plano, 'id_plano' | 'nome_plano' | 'descricao' | 'duracao_meses' | 'valor_plano'>; pagamentos: Pagamento[]; pendente: boolean; pago: boolean }
export const money = (value: number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const when = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
