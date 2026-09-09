import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, ChevronDown, ClipboardList, CreditCard, Dumbbell, LayoutDashboard, Menu, Plus, Search, Settings, Users, X } from 'lucide-react'
import './App.css'

type Student = { id_aluno: number; nome: string; email: string; telefone: number; foto: string; id_plano: number; status: string }
type Plan = { id_plano: number; nome_plano: string; descricao: string; duracao_meses: number; valor_plano: number; ativo: boolean }
type Workout = { id_treino: number; objetivo: string; observacoes: string; data_entrada: string; data_saida: string; id_aluno: number; id_instrutor: number }
type Payment = { id_pagamento: number; id_aluno: number; id_plano: number; data_vencimento: string; valor: number; metodo: string; status_pagamento: string }
type AcademyState = { students: Student[]; plans: Plan[]; workouts: Workout[]; payments: Payment[]; connected: boolean }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const sampleStudents: Student[] = [
  { id_aluno: 1, nome: 'Marina Oliveira', email: 'marina.oliveira@email.com', telefone: 11987654321, foto: 'https://i.pravatar.cc/100?img=47', id_plano: 1, status: 'Ativo' },
  { id_aluno: 2, nome: 'Lucas Mendes', email: 'lucas.mendes@email.com', telefone: 11976543210, foto: 'https://i.pravatar.cc/100?img=12', id_plano: 2, status: 'Ativo' },
  { id_aluno: 3, nome: 'Camila Rocha', email: 'camila.rocha@email.com', telefone: 11965432109, foto: 'https://i.pravatar.cc/100?img=32', id_plano: 1, status: 'Ativo' },
  { id_aluno: 4, nome: 'André Ribeiro', email: 'andre.ribeiro@email.com', telefone: 11954321098, foto: 'https://i.pravatar.cc/100?img=11', id_plano: 3, status: 'Pendente' },
]
const samplePlans: Plan[] = [
  { id_plano: 1, nome_plano: 'Plano Performance', descricao: 'Acompanhamento completo', duracao_meses: 3, valor_plano: 289.9, ativo: true },
  { id_plano: 2, nome_plano: 'Plano Essencial', descricao: 'Treinos personalizados', duracao_meses: 1, valor_plano: 149.9, ativo: true },
  { id_plano: 3, nome_plano: 'Plano Família', descricao: 'Para até 3 alunos', duracao_meses: 6, valor_plano: 599.9, ativo: true },
]
const samplePayments: Payment[] = [
  { id_pagamento: 1, id_aluno: 1, id_plano: 1, data_vencimento: '2026-09-12', valor: 289.9, metodo: 'PIX', status_pagamento: 'Pago' },
  { id_pagamento: 2, id_aluno: 2, id_plano: 2, data_vencimento: '2026-09-14', valor: 149.9, metodo: 'Cartao', status_pagamento: 'Pendente' },
  { id_pagamento: 3, id_aluno: 3, id_plano: 1, data_vencimento: '2026-09-18', valor: 289.9, metodo: 'PIX', status_pagamento: 'Pago' },
]
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')

function App() {
  const [activePage, setActivePage] = useState('Visão geral')
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [state, setState] = useState<AcademyState>({ students: [], plans: [], workouts: [], payments: [], connected: false })

  useEffect(() => {
    const loadResources = async () => {
      try {
        const responses = await Promise.all(['/alunos', '/planos', '/treinos', '/pagamentos'].map((path) => fetch(`${API_URL}${path}`)))
        if (responses.some((response) => !response.ok)) throw new Error('API indisponível')
        const [students, plans, workouts, payments] = await Promise.all(responses.map((response) => response.json()))
        setState({ students, plans, workouts, payments, connected: true })
      } catch {
        setState({ students: sampleStudents, plans: samplePlans, workouts: [], payments: samplePayments, connected: false })
      }
    }
    loadResources()
  }, [])

  const students = useMemo(() => state.students.filter((student) => `${student.nome} ${student.email}`.toLowerCase().includes(query.toLowerCase())), [query, state.students])
  const activeStudents = state.students.filter((student) => student.status.toLowerCase() === 'ativo').length || 186
  const pendingPayments = state.payments.filter((payment) => payment.status_pagamento !== 'Pago').length || 8
  const navItems = [{ label: 'Visão geral', icon: LayoutDashboard }, { label: 'Alunos', icon: Users }, { label: 'Planos', icon: ClipboardList }, { label: 'Treinos', icon: Dumbbell }, { label: 'Pagamentos', icon: CreditCard }]

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Dumbbell size={20} /></span><span>movimente</span><button className="icon-button close-menu" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={20} /></button></div>
      <div className="workspace-label">GESTÃO DA ACADEMIA</div>
      <nav>{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activePage === label ? 'active' : ''}`} onClick={() => { setActivePage(label); setMenuOpen(false) }}><Icon size={18} /><span>{label}</span>{label === 'Alunos' && <span className="nav-count">{state.students.length || 186}</span>}{label === 'Pagamentos' && <span className="nav-alert">{pendingPayments}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={18} /><span>Configurações</span></button><div className="profile"><div className="avatar">RC</div><div><strong>Rafael Costa</strong><small>Administrador</small></div><ChevronDown size={16} /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button><div className="breadcrumb"><span>Academia</span><b>/</b><strong>{activePage}</strong></div><div className="topbar-actions"><span className={`api-status ${state.connected ? 'online' : ''}`}><i />{state.connected ? 'API conectada' : 'Modo demonstração'}</span><button className="icon-button notification-button" aria-label="Notificações"><Bell size={19} /><em>3</em></button><div className="top-avatar">RC</div></div></header>
      <div className="page-content">
        <section className="page-heading"><div><p className="eyebrow">QUARTA-FEIRA, 09 DE SETEMBRO DE 2026</p><h1>Bom dia, Rafael <span>✦</span></h1><p className="subheading">Acompanhe a rotina e os resultados da sua academia.</p></div><button className="primary-button"><Plus size={18} />Nova matrícula</button></section>
        <section className="metrics-grid"><article className="metric-card highlight"><div className="metric-icon"><Users size={20} /></div><span className="metric-label">Alunos ativos</span><strong>{activeStudents}</strong><small><b>+12,4%</b> <span>vs. mês anterior</span></small><div className="sparkline"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article><article className="metric-card"><div className="metric-icon green"><CalendarDays size={20} /></div><span className="metric-label">Matrículas este mês</span><strong>24</strong><small><b>+8,2%</b> <span>novas matrículas</span></small></article><article className="metric-card"><div className="metric-icon orange"><CreditCard size={20} /></div><span className="metric-label">Receita mensal</span><strong>{formatCurrency(32680)}</strong><small><b>+15,6%</b> <span>vs. mês anterior</span></small></article><article className="metric-card"><div className="metric-icon violet"><ClipboardList size={20} /></div><span className="metric-label">Pagamentos pendentes</span><strong>{pendingPayments}</strong><small><b className="neutral">Atenção</b> <span>vencimentos próximos</span></small></article></section>
        <section className="section-grid"><section className="inventory-section"><div className="section-heading"><div><h2>Alunos recentes</h2><p>Gerencie matrículas e acompanhe seus alunos.</p></div><button className="text-button">Ver todos <span>→</span></button></div><div className="toolbar"><div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar aluno por nome ou e-mail..." /></div><button className="filter-button">Todos os alunos <ChevronDown size={16} /></button></div><div className="table-wrap"><table><thead><tr><th>ALUNO</th><th>PLANO</th><th>STATUS</th><th>CADASTRO</th><th /></tr></thead><tbody>{students.slice(0, 5).map((student) => <tr key={student.id_aluno}><td><div className="car-cell"><img src={student.foto} alt={student.nome} /><div><strong>{student.nome}</strong><span>{student.email}</span></div></div></td><td><span className="plan-pill">{state.plans.find((plan) => plan.id_plano === student.id_plano)?.nome_plano ?? 'Plano ativo'}</span></td><td><span className={`status ${student.status.toLowerCase() === 'ativo' ? 'available' : 'featured'}`}><i />{student.status}</span></td><td>Set 2026</td><td><button className="more-button" aria-label={`Ações para ${student.nome}`}>•••</button></td></tr>)}</tbody></table>{students.length === 0 && <div className="empty-state">Nenhum aluno encontrado para esta busca.</div>}</div></section>
          <aside className="payment-panel"><div className="section-heading"><div><h2>Próximos pagamentos</h2><p>Vencimentos da semana.</p></div><button className="icon-button"><ChevronDown size={17} /></button></div><div className="payment-list">{state.payments.slice(0, 3).map((payment) => <div className="payment-row" key={payment.id_pagamento}><div className="payment-icon"><CreditCard size={15} /></div><div><strong>{state.students.find((student) => student.id_aluno === payment.id_aluno)?.nome ?? 'Aluno'}</strong><small>Vence em {formatDate(payment.data_vencimento)}</small></div><b>{formatCurrency(payment.valor)}</b></div>)}</div><button className="full-button">Abrir financeiro <span>→</span></button></aside></section>
      </div>
      <footer><span>Movimente <b>·</b> Gestão inteligente para sua academia</span><span>Última atualização: agora</span></footer>
    </main>
  </div>
}

export default App
