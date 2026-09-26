import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, message, when } from './api'
import type { Agendamento, Horario, Plano } from './api'
import './Portal.css'

export function AdminOverview({ token }: { token: string }) {
  const [data, setData] = useState<{ clientes: number; planos: number; porStatus: { nome: string; total: number }[]; porPlano: { nome: string; total: number }[] } | null>(null)
  const [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => { let active = true; api<typeof data>('/admin/dashboard', {}, token).then(value => { if (active) { setData(value); setError('') } }).catch(cause => { if (active) setError(message(cause)) }); return () => { active = false } }, [token, retry])
  return <section className="admin-work"><h2>Visão geral das aulas experimentais</h2><button onClick={() => setRetry(x => x + 1)}>Atualizar gráficos</button>{error && <p role="alert">{error}</p>}{data ? <><p>{data.clientes} clientes cadastrados · {data.planos} planos ativos</p><div className="admin-grid"><BarChart title="Agendamentos por status" values={data.porStatus}/><BarChart title="Interesse por plano" values={data.porPlano}/></div></> : !error && <p>Carregando gráficos…</p>}</section>
}
function BarChart({ title, values }: { title: string; values: { nome: string; total: number }[] }) {
  const max = Math.max(1, ...values.map(x => x.total))
  return <figure className="portal-panel" style={{ margin: 0 }} aria-label={title}><figcaption><h3>{title}</h3></figcaption>{!values.some(x => x.total) && <p>Ainda não há agendamentos registrados.</p>}{values.map((item, index) => <div className="chart-row" key={`${item.nome}-${index}`}><span>{item.nome}</span><div className="chart-track" aria-hidden="true"><div className="chart-bar" style={{ width: `${100 * item.total / max}%` }}/></div><strong>{item.total}</strong></div>)}</figure>
}

export default function AdminWork({ page, token }: { page: 'Agendamentos' | 'Horários' | 'Informações IA'; token: string }) {
  const [items, setItems] = useState<Agendamento[]>([]), [slots, setSlots] = useState<Horario[]>([]), [plans, setPlans] = useState<Plano[]>([])
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0)
  const pending = useRef(false)
  const [filter, setFilter] = useState('Todos')
  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react/set-state-in-effect -- Atualiza os indicadores da consulta ao trocar a página ou recarregar.
    setLoading(true); setError('')
    Promise.all([api<Plano[]>('/planos/gestao', {}, token), page === 'Agendamentos' ? api<Agendamento[]>('/agendamentos', {}, token) : Promise.resolve([]), page === 'Horários' ? api<Horario[]>('/horarios/gestao', {}, token) : Promise.resolve([])])
      .then(([planos, appointments, horarios]) => { if (active) { setPlans(planos); setItems(appointments); setSlots(horarios) } })
      .catch(cause => { if (active) setError(message(cause)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, token, retry])
  async function mutate(path: string, method: string, body?: object) {
    if (pending.current) return
    pending.current = true; setBusy(true); setError(''); setNotice('')
    try { await api(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }, token); setRetry(x => x + 1); setNotice('Operação concluída.') }
    catch (cause) { setError(message(cause)) } finally { pending.current = false; setBusy(false) }
  }
  async function createSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    // O formulário informa explicitamente o fuso da academia, independente do computador do administrador.
    await mutate('/horarios', 'POST', { id_plano: Number(data.get('plano')), data_hora: new Date(`${data.get('data')}:00-03:00`).toISOString() })
  }
  return <section className="admin-work"><h1>{page}</h1><button disabled={busy} onClick={() => setRetry(x => x + 1)}>Atualizar</button>{error && <p className="client-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{loading ? <p>Carregando…</p> : <>
    {page === 'Agendamentos' && <><label>Filtrar por status<select value={filter} onChange={e => setFilter(e.target.value)}>{['Todos','Pendente','Confirmado','Recusado','Cancelado'].map(x => <option key={x}>{x}</option>)}</select></label>{!items.filter(x => filter === 'Todos' || x.status === filter).length && <p>Nenhum agendamento neste filtro.</p>}{items.filter(x => filter === 'Todos' || x.status === filter).map(item => <article className="portal-panel" key={item.id_agendamento}><span className={`portal-tag status-${item.status}`}>{item.status}</span><h2>{item.cliente?.nome} · {item.plano.nome_plano}</h2><p>{item.cliente?.email} · {when(item.horario.data_hora)}</p>{item.observacao_cliente && <p>Observação: {item.observacao_cliente}</p>}{item.resposta_admin && <blockquote>{item.resposta_admin}<p><small>{item.admin?.nome} · {item.respondido_em && when(item.respondido_em)}</small></p></blockquote>}{['Pendente','Confirmado'].includes(item.status) && new Date(item.horario.data_hora) > new Date() && <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate(`/agendamentos/${item.id_agendamento}/resposta`, 'PATCH', { status: data.get('status'), resposta_admin: data.get('resposta') }) }}><fieldset disabled={busy}><label>Decisão<select name="status" defaultValue={item.status === 'Pendente' ? 'Confirmado' : 'Cancelado'}>{(item.status === 'Pendente' ? ['Confirmado','Recusado','Cancelado'] : ['Cancelado']).map(x => <option key={x}>{x}</option>)}</select></label><label>Resposta ao cliente<textarea name="resposta" required maxLength={1000} rows={3}/></label><button>Enviar resposta</button></fieldset></form>}</article>)}</>}
    {page === 'Horários' && <><article className="portal-panel"><h2>Publicar horário de aula experimental</h2><p>Cada horário oferece uma vaga. Datas no fuso de Brasília (UTC−3).</p><form onSubmit={createSlot}><fieldset disabled={busy}><label>Plano<select name="plano" required defaultValue=""><option value="" disabled>Selecione um plano ativo</option>{plans.filter(x => x.ativo).map(x => <option value={x.id_plano} key={x.id_plano}>{x.nome_plano}</option>)}</select></label><label>Data e hora (Brasília)<input name="data" type="datetime-local" required/></label><button disabled={!plans.some(x => x.ativo)}>Publicar horário</button></fieldset></form></article>{!slots.length && <p>Nenhum horário publicado.</p>}{slots.map(slot => <article className="portal-panel" key={slot.id_horario}><h3>{slot.plano?.nome_plano}</h3><p>{when(slot.data_hora)} · {slot._count?.agendamentos ? 'Reservado' : slot.ativo ? 'Disponível' : 'Desativado'}</p><button disabled={busy || !!slot._count?.agendamentos || new Date(slot.data_hora) <= new Date()} onClick={() => void mutate(`/horarios/${slot.id_horario}`, 'PATCH', { ativo: !slot.ativo })}>{slot.ativo ? 'Desativar horário' : 'Reativar horário'}</button></article>)}</>}
    {page === 'Informações IA' && <><p>Consulte a IA para complementar os planos. Apenas os dados do plano são enviados. O texto fica salvo e identificado como IA na página do cliente. Consultas podem consumir créditos da plataforma.</p>{!plans.length && <p>Cadastre um plano primeiro.</p>}{plans.map(plan => <article className="portal-panel" key={plan.id_plano}><h2>{plan.nome_plano}</h2>{plan.ia_texto ? <><p style={{ whiteSpace: 'pre-line' }}>{plan.ia_texto}</p><small>{plan.ia_modelo} · {plan.ia_gerado_em && when(plan.ia_gerado_em)}</small></> : <p>Ainda não há informação gerada por IA.</p>}<div className="admin-actions"><button disabled={busy} onClick={() => void mutate(`/planos/${plan.id_plano}/ia`, 'POST')}>{busy ? 'Aguarde…' : 'Consultar IA'}</button></div></article>)}</>}
  </>}</section>
}
