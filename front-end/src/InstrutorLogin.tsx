import { useState } from 'react'
import type { FormEvent } from 'react'
import { Dumbbell } from 'lucide-react'
import './InstrutorLogin.css'

export type InstrutorSession = {
  id_instrutor: number
  nome: string
  email: string
  telefone: string
  especialidade: string
  ativo: boolean
  foto: string
  token: string
  expiresAt: number
}

type LoginResponse = InstrutorSession & { token: string; expiresIn: number }
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/instrutores${path}`, { ...options, signal: AbortSignal.timeout(15000) })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) throw new Error(result?.erro ?? 'Não foi possível acessar o servidor.')
  return result as T
}

export default function InstrutorLogin({ onLogin }: { onLogin: (instrutor: InstrutorSession) => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await request<LoginResponse>('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const profile = await request<InstrutorSession>('/me', {
        headers: { Authorization: `Bearer ${result.token}` },
      })
      onLogin({ ...profile, token: result.token, expiresAt: Date.now() + result.expiresIn * 1000 })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="instructor-login-page">
    <header className="instructor-login-header">
      <a href="#cliente" className="instructor-brand"><Dumbbell aria-hidden="true"/> movimente</a>
      <a href="#cliente">Área do cliente</a>
    </header>
    <section className="instructor-login-card" aria-labelledby="instructor-login-title">
      <p className="eyebrow">GESTÃO DA ACADEMIA</p>
      <h1 id="instructor-login-title">Acesso do instrutor</h1>
      <p>Entre com suas credenciais para acessar o painel de gestão.</p>
      {error && <p className="instructor-login-error" role="alert">{error}</p>}
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)}/></label>
          <label>Senha<input type="password" autoComplete="current-password" required value={senha} onChange={event => setSenha(event.target.value)}/></label>
          <button className="primary-button" type="submit">{busy ? 'Entrando…' : 'Entrar'}</button>
        </fieldset>
      </form>
    </section>
  </main>
}
