import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, CheckCircle2, ClipboardList, Dumbbell, LogOut, Mail, Menu, UserRound, X } from 'lucide-react'
import './ClientePortal.css'

type Cliente = { id_cliente: string; nome: string; email: string; telefone: string }
type Plano = { id_plano: number; nome_plano: string; descricao: string; duracao_meses: number; valor_plano: number; ativo: boolean }
type Session = { token: string; expiresAt: number }
type Mode = 'login' | 'cadastro'
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/clientes${path}`, { ...options, signal: options.signal ?? AbortSignal.timeout(15000) })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) throw new Error(result?.erro ?? 'Não foi possível acessar o servidor. Tente novamente.')
  return result as T
}

export default function ClientePortal() {
  const [mode, setMode] = useState<Mode>('login')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [planosLoading, setPlanosLoading] = useState(true)
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API}/planos`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Não foi possível carregar os planos.')))
      .then((items: Plano[]) => setPlanos(items.filter(plano => plano.ativo)))
      .catch(() => setPlanos([]))
      .finally(() => setPlanosLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!session) return
    const timer = window.setTimeout(() => {
      setSession(null)
      setCliente(null)
      setNotice('Sua sessão expirou. Entre novamente.')
    }, Math.max(0, session.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [session])

  function switchMode() {
    setMode(current => current === 'login' ? 'cadastro' : 'login')
    setSenha('')
    setConfirmation('')
    setError('')
    setNotice('')
  }

  function logout() {
    setSession(null)
    setCliente(null)
    setMenu(false)
    setNotice('Você saiu da sua conta.')
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    setError('')
    setNotice('')
    if (mode === 'cadastro' && senha !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }
    pending.current = true
    setBusy(true)
    try {
      if (mode === 'cadastro') {
        await api<Cliente>('/cadastro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, telefone, senha }),
        })
        setMode('login')
        setSenha('')
        setConfirmation('')
        setNotice('Conta criada. Entre com seu e-mail e senha.')
      } else {
        const result = await api<{ token: string; expiresIn: number }>('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha }),
        })
        const profile = await api<Cliente>('/me', { headers: { Authorization: `Bearer ${result.token}` } })
        setCliente(profile)
        setSession({ token: result.token, expiresAt: Date.now() + result.expiresIn * 1000 })
        setSenha('')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  if (!cliente) return <AuthView mode={mode} email={email} senha={senha} nome={nome} telefone={telefone} confirmation={confirmation} error={error} notice={notice} busy={busy} onSubmit={submit} onModeChange={switchMode} setEmail={setEmail} setSenha={setSenha} setNome={setNome} setTelefone={setTelefone} setConfirmation={setConfirmation}/>

  const initials = cliente.nome.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <main className="client-dashboard">
    <aside className={`client-sidebar ${menu ? 'client-sidebar-open' : ''}`}>
      <div className="client-brand"><span className="client-brand-mark"><Dumbbell size={19}/></span><span>movimente</span><button className="client-icon-button client-close-menu" onClick={() => setMenu(false)} aria-label="Fechar menu"><X size={19}/></button></div>
      <div className="client-workspace-label">ÁREA DO CLIENTE</div>
      <nav className="client-nav"><a className="client-nav-item active" href="#cliente"><UserRound size={18}/><span>Minha conta</span></a><a className="client-nav-item" href="#gestao"><ClipboardList size={18}/><span>Gestão da academia</span></a></nav>
      <div className="client-sidebar-bottom"><button className="client-nav-item" onClick={logout}><LogOut size={18}/><span>Sair da conta</span></button><div className="client-profile"><div className="client-avatar">{initials}</div><div><strong>{cliente.nome}</strong><small>Cliente</small></div></div></div>
    </aside>
    <section className="client-main">
      <PlansSection planos={planos} loading={planosLoading}/>
      <header className="client-topbar"><button className="client-icon-button client-menu-button" onClick={() => setMenu(true)} aria-label="Abrir menu"><Menu size={21}/></button><div className="client-breadcrumb"><span>Movimente</span><b>/</b><strong>Minha conta</strong></div><div className="client-top-actions"><span className="client-status"><i/>Conta ativa</span><div className="client-top-avatar">{initials}</div></div></header>
      <div className="client-content"><section className="client-heading"><div><p className="client-eyebrow">ÁREA DO CLIENTE</p><h1>Olá, {cliente.nome.split(' ')[0]}</h1><p className="client-subheading">Tudo certo por aqui. Acompanhe seus dados e mantenha sua rotina em movimento.</p></div><button className="client-primary-button" onClick={logout}><LogOut size={17}/>Sair</button></section>
        <section className="client-metrics"><article><div className="client-metric-icon"><CheckCircle2 size={19}/></div><span>Status da conta</span><strong>Ativa</strong></article><article><div className="client-metric-icon"><CalendarDays size={19}/></div><span>Cadastro</span><strong>Confirmado</strong></article><article><div className="client-metric-icon"><Dumbbell size={19}/></div><span>Seu objetivo</span><strong>Em movimento</strong></article></section>
        <section className="client-section-grid"><article className="client-panel client-account-panel"><div className="client-section-heading"><div><p className="client-eyebrow">SEUS DADOS</p><h2>Perfil da conta</h2></div><UserRound size={21}/></div><dl><div><dt>Nome completo</dt><dd>{cliente.nome}</dd></div><div><dt>E-mail</dt><dd>{cliente.email}</dd></div><div><dt>Telefone</dt><dd>{cliente.telefone}</dd></div></dl></article><article className="client-panel client-next-panel"><div className="client-section-heading"><div><p className="client-eyebrow">PRÓXIMO PASSO</p><h2>Continue sua jornada</h2></div><Dumbbell size={21}/></div><p>Seu acesso está pronto. Fale com a equipe da academia para conhecer planos, horários e montar seu próximo treino.</p><a className="client-outline-button" href="mailto:contato@movimente.com"><Mail size={16}/>Falar com a equipe</a></article></section>
        <footer className="client-footer"><span>Movimente · Gestão inteligente para sua academia</span><span>Sessão segura em memória</span></footer>
      </div>
    </section>
  </main>
}

function PlansSection({ planos, loading }: { planos: Plano[]; loading: boolean }) {
  return <section className="client-plans-section" aria-labelledby="plans-title"><div className="client-plans-heading"><div><p className="client-eyebrow">ESCOLHA SEU RITMO</p><h2 id="plans-title">Planos em destaque</h2></div><span>{planos.length ? `${planos.length} opções disponíveis` : 'Confira nossas opções'}</span></div>{loading ? <p className="client-plans-empty">Carregando planos…</p> : planos.length ? <div className="client-plans-grid">{planos.map(plano => <article className="client-plan-card" key={plano.id_plano}><div className="client-plan-icon"><Dumbbell size={18}/></div><h3>{plano.nome_plano}</h3><p>{plano.descricao}</p><div className="client-plan-meta"><span><CalendarDays size={15}/>{plano.duracao_meses} {plano.duracao_meses === 1 ? 'mês' : 'meses'}</span><strong>{plano.valor_plano.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div></article>)}</div> : <p className="client-plans-empty">Nenhum plano disponível no momento.</p>}</section>
}

function AuthView({ mode, email, senha, nome, telefone, confirmation, error, notice, busy, onSubmit, onModeChange, setEmail, setSenha, setNome, setTelefone, setConfirmation }: { mode: Mode; email: string; senha: string; nome: string; telefone: string; confirmation: string; error: string; notice: string; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onModeChange: () => void; setEmail: (value: string) => void; setSenha: (value: string) => void; setNome: (value: string) => void; setTelefone: (value: string) => void; setConfirmation: (value: string) => void }) {
  return <main className="client-auth-page"><header className="client-auth-header"><a href="#cliente" className="client-brand"><span className="client-brand-mark"><Dumbbell size={19}/></span>movimente</a><a href="#gestao">Gestão da academia</a></header><section className="client-auth-layout"><div className="client-auth-intro"><p className="client-eyebrow">TREINE NO SEU RITMO</p><h1>Seu próximo movimento começa aqui.</h1><p>Tenha seus dados sempre à mão e acompanhe sua jornada na academia com mais clareza.</p><div className="client-auth-points"><span><CheckCircle2 size={17}/>Acesso simples e seguro</span><span><Dumbbell size={17}/>Uma rotina feita para você</span></div></div><section className="client-auth-card" aria-labelledby="client-title"><p className="client-eyebrow">ÁREA DO CLIENTE</p><h2 id="client-title">{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h2><p className="client-auth-description">{mode === 'login' ? 'Use seu e-mail e senha para continuar.' : 'Cadastre-se para acessar sua área pessoal.'}</p>{error && <p className="client-error" role="alert">{error}</p>}{notice && <p className="client-notice" role="status">{notice}</p>}<form onSubmit={onSubmit} aria-busy={busy}><fieldset disabled={busy}>{mode === 'cadastro' && <label>Nome completo<input autoComplete="name" required minLength={2} maxLength={80} value={nome} onChange={event => setNome(event.target.value)}/></label>}<label>E-mail<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/></label>{mode === 'cadastro' && <label>Telefone<input type="tel" autoComplete="tel" required minLength={8} maxLength={20} value={telefone} onChange={event => setTelefone(event.target.value)}/></label>}<label>Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'cadastro' ? 8 : 1} maxLength={100} value={senha} onChange={event => setSenha(event.target.value)}/>{mode === 'cadastro' && <small>Use pelo menos 8 caracteres.</small>}</label>{mode === 'cadastro' && <label>Confirme a senha<input type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label>}<button className="client-primary-button" type="submit">{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar na conta' : 'Criar conta'}</button></fieldset></form><button type="button" className="client-switch" disabled={busy} onClick={onModeChange}>{mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}</button></section></section></main>
}
