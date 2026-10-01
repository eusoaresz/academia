import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Dumbbell, CalendarDays, Search, ArrowLeft, Star } from 'lucide-react'
import { api, ApiError, message, money, when } from './api'
import type { Cliente, Plano, Horario, Agendamento, MeuPlano as MeuPlanoData } from './api'
import './ClientePortal.css'
import './Portal.css'

type Session = { token: string; expiresAt: number; id_cliente: string }
const storageKey = 'movimente.cliente'
function clearSession() { localStorage.removeItem(storageKey); localStorage.removeItem('clienteId'); sessionStorage.removeItem(storageKey) }
function readSession(): Session | null {
  try {
    const persisted = localStorage.getItem(storageKey)
    const value = JSON.parse(persisted ?? sessionStorage.getItem(storageKey) ?? 'null') as Session | null
    if (!value?.token || !value.id_cliente || value.expiresAt <= Date.now() || (persisted && localStorage.getItem('clienteId') !== value.id_cliente)) { clearSession(); return null }
    return value
  } catch { clearSession(); return null }
}

export default function ClientePortal() {
  const [view, setView] = useState<'planos' | 'login' | 'cadastro' | 'conta' | 'agenda'>('planos')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [initialSession] = useState(readSession)
  const [restoring, setRestoring] = useState(() => !!initialSession)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const [destaques, setDestaques] = useState(true)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)

  const logout = useCallback((text = 'Você saiu da sua conta.') => { clearSession(); setCliente(null); setSession(null); setView('planos'); setNotice(text) }, [])
  useEffect(() => {
    const stored = initialSession
    if (!stored) return
    let cancelled = false
    api<Cliente>('/clientes/me', {}, stored.token).then(profile => {
      if (cancelled) return
      if (profile.id_cliente !== stored.id_cliente) { clearSession(); return }
      setCliente(profile); setSession(stored)
    }).catch(cause => {
      if (cancelled) return
      if (cause instanceof ApiError && cause.status === 401) clearSession()
      setError('Não foi possível restaurar sua sessão. Entre novamente.')
    }).finally(() => { if (!cancelled) setRestoring(false) })
    return () => { cancelled = true }
  }, [initialSession])
  useEffect(() => {
    if (!session) return
    const timer = window.setTimeout(() => logout('Sua sessão expirou. Entre novamente.'), Math.max(0, session.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [session, logout])
  useEffect(() => {
    const controller = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect -- Reinicia o estado da consulta remota quando seus filtros mudam.
    setLoading(true); setLoadError('')
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ busca, destaque: String(destaques) })
      api<Plano[]>(`/planos?${query}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
        .then(items => { if (!controller.signal.aborted) setPlanos(items) })
        .catch(cause => { if (!controller.signal.aborted) setLoadError(message(cause)) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 200)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [busca, destaques, retry])

  function navigate(next: typeof view) { setView(next); setError(''); setNotice(''); if (next === 'planos') setSelected(null) }
  const onAuthError = useCallback((cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) { logout('Sua sessão expirou. Entre novamente.'); setView('login') }
  }, [logout])
  return <main className="portal-page">
    <header className="portal-header"><a href="#cliente" onClick={() => navigate('planos')} className="client-brand"><span className="client-brand-mark"><Dumbbell size={19}/></span>movimente</a>
      <nav aria-label="Navegação do cliente"><button onClick={() => navigate('planos')}>Planos</button>{cliente && <><button onClick={() => navigate('agenda')}>Meus agendamentos</button><button onClick={() => navigate('conta')}>Minha conta</button></>}{!cliente ? <button disabled={restoring} onClick={() => navigate('login')}>{restoring ? 'Verificando sessão…' : 'Entrar / Cadastrar'}</button> : <button onClick={() => logout()}>Sair</button>}<a href="#gestao">Administração</a></nav>
    </header>
    <div className="portal-content">
      {error && <p role="alert" className="client-error">{error}</p>}{notice && <p role="status" className="client-notice">{notice}</p>}
      {(view === 'login' || view === 'cadastro') && <AuthForm key={view} mode={view} switchMode={() => navigate(view === 'login' ? 'cadastro' : 'login')} onCreated={() => { setView('login'); setNotice('Conta criada. Entre com seu e-mail e senha.') }} onLogin={(profile, next) => { setCliente(profile); setSession(next); setView('planos'); setNotice('Você entrou na sua conta.') }}/ >}
      {view === 'conta' && cliente && <section className="portal-panel"><p className="client-eyebrow">MINHA CONTA</p><h1>Olá, {cliente.nome}</h1><dl><dt>E-mail</dt><dd>{cliente.email}</dd><dt>Telefone</dt><dd>{cliente.telefone}</dd></dl>{session && <MeuPlano token={session.token} onAuthError={onAuthError}/>}<button className="client-primary-button" onClick={() => navigate('agenda')}>Ver meus agendamentos</button></section>}
      {view === 'agenda' && session && <MinhaAgenda token={session.token} onAuthError={onAuthError}/>}
      {view === 'planos' && selected !== null && <Detalhes key={selected} id={selected} token={session?.token} back={() => setSelected(null)} login={() => navigate('login')} onBooked={() => { setView('agenda'); setNotice('Solicitação enviada! A academia responderá por aqui.') }} onAuthError={onAuthError}/>}
      {view === 'planos' && selected === null && <>
        <section className="portal-hero"><p className="client-eyebrow">SEU PRÓXIMO MOVIMENTO</p><h1>Encontre seu ritmo.</h1><p>Conheça nossos planos e agende uma aula experimental.</p></section>
        <div className="portal-toolbar"><label className="portal-search"><Search size={18}/><span className="sr-only">Pesquisar planos</span><input maxLength={100} placeholder="Busque por nome ou descrição" value={busca} onChange={event => { setBusca(event.target.value); setDestaques(false) }}/></label><button className={destaques ? 'portal-active' : ''} onClick={() => { setBusca(''); setDestaques(true) }}>Exibir destaques</button><button onClick={() => { setBusca(''); setDestaques(false) }}>Todos os planos</button></div>
        <h2>{destaques ? 'Planos em destaque' : 'Nossos planos'}</h2>
        {loading ? <p role="status">Carregando planos…</p> : loadError ? <p role="alert">{loadError} <button onClick={() => setRetry(x => x + 1)}>Tentar novamente</button></p> : !planos.length ? <div className="portal-panel"><p>{destaques ? 'Nenhum destaque selecionado no momento.' : 'Nenhum plano encontrado.'}</p><button onClick={() => { setDestaques(false); setBusca('') }}>Ver todos os planos</button></div> : <div className="client-plans-grid">{planos.map(plano => <article className="client-plan-card" key={plano.id_plano}>
          {plano.destaque && <span className="portal-tag"><Star size={13}/>Destaque</span>}<h3>{plano.nome_plano}</h3><p>{plano.descricao}</p><div className="client-plan-meta"><span><CalendarDays size={15}/>{plano.duracao_meses} meses</span><strong>{money(plano.valor_plano)}</strong></div>
          {plano.ia_texto && <section className="portal-ai"><small>Informação obtida por IA · {plano.ia_modelo}</small><p>{plano.ia_texto}</p></section>}
          <button className="client-primary-button" onClick={() => setSelected(plano.id_plano)}>Ver detalhes</button>
        </article>)}</div>}
      </>}
    </div><footer className="portal-footer">Movimente · Horários exibidos no fuso de Brasília</footer>
  </main>
}

function AuthForm({ mode, switchMode, onCreated, onLogin }: { mode: 'login' | 'cadastro'; switchMode: () => void; onCreated: () => void; onLogin: (profile: Cliente, session: Session) => void }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const pending = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const data = new FormData(event.currentTarget), senha = String(data.get('senha'))
    if (mode === 'cadastro' && senha !== data.get('confirmacao')) { setError('As senhas não coincidem.'); return }
    pending.current = true; setBusy(true); setError('')
    try {
      const email = String(data.get('email'))
      if (mode === 'cadastro') {
        await api('/clientes/cadastro', { method: 'POST', body: JSON.stringify({ email, senha, nome: data.get('nome'), telefone: data.get('telefone') }) }); onCreated()
      } else {
        const remember = data.get('remember') === 'on'
        const result = await api<{ token: string; expiresIn: number }>('/clientes/login', { method: 'POST', body: JSON.stringify({ email, senha, manterConectado: remember }) })
        const profile = await api<Cliente>('/clientes/me', {}, result.token)
        const session = { ...result, expiresAt: Date.now() + result.expiresIn * 1000, id_cliente: profile.id_cliente }
        clearSession()
        if (remember) { localStorage.setItem('clienteId', profile.id_cliente); localStorage.setItem(storageKey, JSON.stringify(session)) }
        else sessionStorage.setItem(storageKey, JSON.stringify(session))
        onLogin(profile, session)
      }
    } catch (cause) { setError(message(cause)) } finally { pending.current = false; setBusy(false) }
  }
  return <section className="client-auth-card portal-auth"><p className="client-eyebrow">ÁREA DO CLIENTE</p><h1>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h1>{error && <p role="alert" className="client-error">{error}</p>}<form onSubmit={submit}><fieldset disabled={busy}>
    {mode === 'cadastro' && <label>Nome completo<input name="nome" autoComplete="name" required minLength={2} maxLength={80}/></label>}
    <label>E-mail<input type="email" name="email" autoComplete="email" required maxLength={254}/></label>
    {mode === 'cadastro' && <label>Telefone<input type="tel" name="telefone" autoComplete="tel" required minLength={8} maxLength={20}/></label>}
    <label>Senha<input type="password" name="senha" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'cadastro' ? 8 : 1} maxLength={100}/></label>
    {mode === 'cadastro' ? <label>Confirme a senha<input type="password" name="confirmacao" autoComplete="new-password" required minLength={8} maxLength={100}/></label> : <label className="portal-checkbox"><input type="checkbox" name="remember"/>Manter conectado por até 7 dias</label>}
    <button className="client-primary-button">{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar na conta' : 'Criar conta'}</button>
  </fieldset></form><button className="client-switch" disabled={busy} onClick={switchMode}>{mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}</button></section>
}

function Detalhes({ id, token, back, login, onBooked, onAuthError }: { id: number; token?: string; back: () => void; login: () => void; onBooked: () => void; onAuthError: (e: unknown) => void }) {
  const [plano, setPlano] = useState<Plano | null>(null), [horarios, setHorarios] = useState<Horario[]>([])
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0)
  const pending = useRef(false)
  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react/set-state-in-effect -- Sincroniza o carregamento dos detalhes com o plano remoto.
    setLoading(true); setError('')
    Promise.all([api<Plano>(`/planos/${id}`), api<Horario[]>(`/horarios?plano=${id}`)]).then(([plan, slots]) => { if (active) { setPlano(plan); setHorarios(slots) } }).catch(cause => { if (active) setError(message(cause)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, retry])
  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!token || pending.current) return
    const data = new FormData(event.currentTarget)
    pending.current = true; setBusy(true); setError('')
    try { await api('/agendamentos', { method: 'POST', body: JSON.stringify({ id_horario: Number(data.get('horario')), observacao_cliente: data.get('observacao') }) }, token); onBooked() }
    catch (cause) { setError(message(cause)); onAuthError(cause) }
    finally { pending.current = false; setBusy(false) }
  }
  return <><button className="portal-back" onClick={back}><ArrowLeft size={16}/>Voltar aos planos</button>{error && <p role="alert" className="client-error">{error} <button onClick={() => setRetry(x => x + 1)}>Atualizar horários</button></p>}{loading ? <p>Carregando…</p> : plano && <div className="portal-detail"><section className="portal-panel"><span className="portal-tag">{plano.destaque ? 'Destaque' : 'Plano'}</span><h1>{plano.nome_plano}</h1><p>{plano.descricao}</p><h2>{money(plano.valor_plano)}</h2><p>Duração: {plano.duracao_meses} meses</p>{plano.ia_texto && <section className="portal-ai"><h3>Saiba mais sobre este plano</h3><p>{plano.ia_texto}</p><small>Informações obtidas por consulta à IA ({plano.ia_modelo}) em {plano.ia_gerado_em && when(plano.ia_gerado_em)}.</small></section>}</section><section className="portal-panel"><h2>Aula experimental</h2><p>Escolha um horário e aguarde a confirmação da academia. Horários de Brasília.</p>{!token ? <><p>Entre na sua conta para enviar uma solicitação.</p><button className="client-primary-button" onClick={login}>Entrar para agendar</button></> : !horarios.length ? <p>Nenhum horário disponível para este plano no momento.</p> : <form onSubmit={book}><fieldset disabled={busy}><label>Horário disponível<select name="horario" required defaultValue=""><option value="" disabled>Selecione</option>{horarios.map(x => <option key={x.id_horario} value={x.id_horario}>{when(x.data_hora)}</option>)}</select></label><label>Observação (opcional)<textarea name="observacao" maxLength={500} rows={4}/></label><button className="client-primary-button">{busy ? 'Enviando…' : 'Agendar aula experimental'}</button></fieldset></form>}</section></div>}</>
}

const metodos = { PIX: 'PIX', Cartao: 'Cartão', Dinheiro: 'Dinheiro (na academia)' } as const
const situacao = { Pendente: 'Aguardando confirmação', Pago: 'Pago', Atrasado: 'Atrasado' } as const
function MeuPlano({ token, onAuthError }: { token: string; onAuthError: (e: unknown) => void }) {
  const [data, setData] = useState<MeuPlanoData | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    api<MeuPlanoData>('/meu-plano', {}, token).then(result => { if (active) { setData(result); setError('') } }).catch(cause => { if (active) { setError(message(cause)); onAuthError(cause) } })
    return () => { active = false }
  }, [token, retry, onAuthError])
  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const metodo = new FormData(event.currentTarget).get('metodo')
    setBusy(true); setError(''); setNotice('')
    try { await api('/meu-plano/pagamentos', { method: 'POST', body: JSON.stringify({ metodo }) }, token); setNotice('Pagamento registrado. Aguarde a confirmação da academia.'); setRetry(x => x + 1) } catch (cause) { setError(message(cause)); onAuthError(cause) } finally { setBusy(false) }
  }
  return <section className="portal-panel" aria-label="Meu plano"><h2>Meu plano</h2>
    {error && <p className="client-error" role="alert">{error}</p>}{notice && <p className="client-notice" role="status">{notice}</p>}
    {!data ? (!error && <p>Carregando…</p>) : !data.matriculado ? <p>Você ainda não possui um plano cadastrado. Fale com a academia para fazer a sua matrícula.</p> : <>
      <h3>{data.plano.nome_plano}</h3><p>{data.plano.descricao}</p>
      <dl><dt>Duração</dt><dd>{data.plano.duracao_meses} meses</dd><dt>Valor</dt><dd>{money(data.plano.valor_plano)}</dd><dt>Aluno desde</dt><dd>{when(data.desde)}</dd></dl>
      {data.pago ? <p className="client-notice">Seu plano está pago. Obrigado!</p> : data.pendente ? <p className="client-notice">Pagamento aguardando confirmação da academia.</p> : <form onSubmit={pay}><fieldset disabled={busy}><label>Forma de pagamento<select name="metodo" defaultValue="PIX">{Object.entries(metodos).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="client-primary-button">{busy ? 'Enviando…' : `Pagar plano · ${money(data.plano.valor_plano)}`}</button></fieldset></form>}
      {!!data.pagamentos.length && <><h3>Meus pagamentos</h3>{data.pagamentos.map(item => <p key={item.id_pagamento}>{when(item.data_pagamento)} · {money(item.valor)} · {metodos[item.metodo]} · <strong>{situacao[item.status_pagamento]}</strong></p>)}</>}
    </>}
  </section>
}

function MinhaAgenda({ token, onAuthError }: { token: string; onAuthError: (e: unknown) => void }) {
  const [items, setItems] = useState<Agendamento[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react/set-state-in-effect -- Reinicia o carregamento após atualização da lista remota.
    setLoading(true)
    api<Agendamento[]>('/agendamentos/meus', {}, token).then(data => { if (active) { setItems(data); setError('') } }).catch(cause => { if (active) { setError(message(cause)); onAuthError(cause) } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, retry, onAuthError])
  async function cancel(id: string) {
    if (busy || !confirm('Cancelar esta aula experimental?')) return
    setBusy(true)
    try { await api(`/agendamentos/${id}/cancelar`, { method: 'PATCH' }, token); setRetry(x => x + 1) } catch (cause) { setError(message(cause)); onAuthError(cause) } finally { setBusy(false) }
  }
  return <section><h1>Meus agendamentos</h1><button onClick={() => setRetry(x => x + 1)}>Atualizar</button>{error && <p className="client-error" role="alert">{error}</p>}{loading ? <p>Carregando…</p> : !items.length ? <p>Você ainda não solicitou uma aula experimental. Escolha um plano para começar.</p> : <div className="portal-appointments">{items.map(item => <article key={item.id_agendamento} className="portal-panel"><span className={`portal-tag status-${item.status}`}>{item.status}</span><h2>{item.plano.nome_plano}</h2><p>{when(item.horario.data_hora)}</p>{item.observacao_cliente && <p>Sua observação: {item.observacao_cliente}</p>}{item.resposta_admin ? <blockquote><p>{item.resposta_admin}</p><small>{item.admin?.nome} · {item.respondido_em && when(item.respondido_em)}</small></blockquote> : <p>{item.status === 'Cancelado' ? 'Solicitação cancelada.' : 'Aguardando resposta da academia.'}</p>}{['Pendente', 'Confirmado'].includes(item.status) && new Date(item.horario.data_hora) > new Date() && <button disabled={busy} onClick={() => void cancel(item.id_agendamento)}>Cancelar agendamento</button>}</article>)}</div>}</section>
}
