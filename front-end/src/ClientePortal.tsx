import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Dumbbell } from 'lucide-react'
import './ClientePortal.css'

type Cliente = { id_cliente: string; nome: string; email: string; telefone: string }
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/clientes${path}`, { ...options, signal: AbortSignal.timeout(15000) })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) throw new Error(result?.erro ?? 'Não foi possível acessar o servidor. Tente novamente.')
  return result as T
}

export default function ClientePortal() {
  const [mode, setMode] = useState<'login' | 'cadastro'>('login')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [session, setSession] = useState<{ token: string; expiresAt: number } | null>(null)
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
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, telefone, senha }),
        })
        setMode('login')
        setSenha('')
        setConfirmation('')
        setNotice('Conta criada! Entre com seu e-mail e senha.')
      } else {
        const result = await api<{ token: string; expiresIn: number }>('/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }),
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

  return <main className="client-page">
    <header className="client-header"><a href="#cliente" className="client-brand"><Dumbbell aria-hidden="true"/> movimente</a><a href="#gestao">Gestão da academia</a></header>
    <section className="client-card" aria-labelledby="client-title">
      <p className="eyebrow">ÁREA DO CLIENTE</p>
      <h1 id="client-title">{cliente ? `Olá, ${cliente.nome}!` : mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h1>
      {error && <p className="client-error" role="alert">{error}</p>}
      {notice && <p className="client-notice" role="status">{notice}</p>}
      {cliente ? <>
        <p>Você está conectado à sua conta da academia.</p>
        <dl><dt>Nome</dt><dd>{cliente.nome}</dd><dt>E-mail</dt><dd>{cliente.email}</dd><dt>Telefone</dt><dd>{cliente.telefone}</dd></dl>
        <button className="primary-button" onClick={() => { setSession(null); setCliente(null); setNotice('Você saiu da sua conta.'); setError('') }}>Sair da conta</button>
      </> : <>
        <p>{mode === 'login' ? 'Use seu e-mail e senha para acessar.' : 'Cadastre-se para acessar a área do cliente. Não é necessário ter uma matrícula.'}</p>
        <form onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy}>
            {mode === 'cadastro' && <label>Nome completo<input name="nome" autoComplete="name" required minLength={2} maxLength={80} value={nome} onChange={event => setNome(event.target.value)}/></label>}
            <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/></label>
            {mode === 'cadastro' && <label>Telefone<input name="telefone" type="tel" autoComplete="tel" required minLength={8} maxLength={20} value={telefone} onChange={event => setTelefone(event.target.value)}/></label>}
            <label>Senha<input name="senha" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'cadastro' ? 8 : 1} maxLength={100} value={senha} onChange={event => setSenha(event.target.value)}/>{mode === 'cadastro' && <small>Use pelo menos 8 caracteres.</small>}</label>
            {mode === 'cadastro' && <label>Confirme a senha<input name="confirmacao" type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label>}
            <button className="primary-button" type="submit">{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
          </fieldset>
        </form>
        <button type="button" className="client-switch" disabled={busy} onClick={switchMode}>{mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}</button>
      </>}
    </section>
  </main>
}
