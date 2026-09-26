import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Bell, CalendarDays, ClipboardList, CreditCard, Dumbbell, GraduationCap, LayoutDashboard, Menu, Pencil, Plus, Search, Settings, Trash2, Users, X } from 'lucide-react'
import './App.css'
import ClientePortal from './ClientePortal'
import InstrutorLogin, { type InstrutorSession } from './InstrutorLogin'

type Entity = 'Alunos' | 'Planos' | 'Treinos' | 'Instrutores' | 'Pagamentos'
type Page = 'Visão geral' | Entity
type Item = Record<string, any>
type Store = Record<Entity, Item[]> & { connected: boolean }
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const paths: Record<Entity, string> = { Alunos:'/alunos', Planos:'/planos', Treinos:'/treinos', Instrutores:'/instrutores', Pagamentos:'/pagamentos' }
const keys: Record<Entity, string> = { Alunos:'id_aluno', Planos:'id_plano', Treinos:'id_treino', Instrutores:'id_instrutor', Pagamentos:'id_pagamento' }
const singular: Record<Entity, string> = { Alunos:'aluno', Planos:'plano', Treinos:'treino', Instrutores:'instrutor', Pagamentos:'pagamento' }
const avatar = 'https://i.pravatar.cc/100?img=5'

const today = () => {
  const value = new Date()
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

const money = (n:number) => Number(n || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const calendarDate = (value: string) => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? ''

const date = (value: string) => {
  const day = calendarDate(value)
  return day ? day.split('-').reverse().join('/') : '—'
}

const emptyStore: Store = { Alunos: [], Planos: [], Instrutores: [], Treinos: [], Pagamentos: [], connected: false }

async function request(path: string, options?: RequestInit) {
  const response = await fetch(API + path, { ...options, signal: options?.signal ?? AbortSignal.timeout(15000) })
  const text = await response.text()
  let result: any
  try { result = text ? JSON.parse(text) : undefined } catch {
    throw new Error(response.ok ? 'Resposta inválida da API.' : `Falha na API (HTTP ${response.status}).`)
  }
  if (!response.ok) {
    const detail = result?.erro ?? result?.error
    throw new Error(typeof detail === 'string' ? detail : `Falha na API (HTTP ${response.status}).`)
  }
  return result
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível acessar a API.'

const fields: Record<Entity,{key:string; label:string; type?:string; options?:string[]}[]> = {
  Alunos:[{key:'nome',label:'Nome completo'},{key:'email',label:'E-mail',type:'email'},{key:'telefone',label:'Telefone'},{key:'data_nascimento',label:'Ano de nascimento',type:'number'},{key:'id_plano',label:'Plano',type:'plan'},{key:'data_cadastro',label:'Data de cadastro',type:'date'},{key:'foto',label:'URL da foto'}],
  Planos:[{key:'nome_plano',label:'Nome do plano'},{key:'descricao',label:'Descrição',type:'textarea'},{key:'duracao_meses',label:'Duração (meses)',type:'number'},{key:'valor_plano',label:'Valor',type:'number'},{key:'ativo',label:'Status',type:'boolean'}],
  Instrutores:[{key:'nome',label:'Nome completo'},{key:'email',label:'E-mail',type:'email'},{key:'senha',label:'Senha',type:'password'},{key:'telefone',label:'Telefone'},{key:'especialidade',label:'Especialidade'},{key:'foto',label:'URL da foto'},{key:'ativo',label:'Status',type:'boolean'}],
  Treinos:[{key:'id_aluno',label:'Aluno',type:'student'},{key:'id_instrutor',label:'Instrutor',type:'instructor'},{key:'objetivo',label:'Objetivo'},{key:'observacoes',label:'Observações',type:'textarea'}],
  Pagamentos:[{key:'id_aluno',label:'Aluno',type:'student'},{key:'id_plano',label:'Plano',type:'plan'},{key:'valor',label:'Valor',type:'number'},{key:'data_vencimento',label:'Vencimento',type:'date'},{key:'metodo',label:'Método',options:['Dinheiro','Cartao','PIX']},{key:'status_pagamento',label:'Status',options:['Pendente','Pago','Atrasado']}]
}
function initialValues(entity: Entity, store: Store, value?: Item): Item {
  const defaults: Record<Entity, Item> = {
    Alunos: { nome: '', email: '', telefone: '', data_nascimento: 2000, id_plano: store.Planos[0]?.id_plano ?? '', data_cadastro: today(), foto: avatar },
    Planos: { nome_plano: '', descricao: '', duracao_meses: 1, valor_plano: 0, ativo: true },
    Instrutores: { nome: '', email: '', senha: '', telefone: '', especialidade: '', foto: avatar, ativo: true },
    Treinos: { id_aluno: store.Alunos[0]?.id_aluno ?? '', id_instrutor: store.Instrutores[0]?.id_instrutor ?? '', objetivo: '', observacoes: '' },
    Pagamentos: { id_aluno: store.Alunos[0]?.id_aluno ?? '', id_plano: store.Planos[0]?.id_plano ?? '', valor: 0, data_vencimento: today(), metodo: 'PIX', status_pagamento: 'Pendente' },
  }
  const data = { ...(value ?? defaults[entity]) }
  for (const field of fields[entity]) {
    if (field.type === 'date') data[field.key] = calendarDate(data[field.key])
  }
  if (entity === 'Instrutores') data.senha = ''
  return data
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash === '#gestao' ? <><div className="client-management-link"><a href="#cliente">← Área do cliente</a></div><Gestao/></> : <ClientePortal/>
}

function Gestao() {
  const [page,setPage] = useState<Page>('Visão geral'), [store,setStore] = useState<Store>(emptyStore), [query,setQuery] = useState(''), [menu,setMenu] = useState(false), [editing,setEditing] = useState<{entity:Entity;value?:Item}|null>(null)
  const [instrutor, setInstrutor] = useState<InstrutorSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const mutationPending = useRef(false)

  useEffect(() => {
    if (!instrutor) return
    const timer = window.setTimeout(() => setInstrutor(null), Math.max(0, instrutor.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [instrutor])

  useEffect(() => {
    if (!instrutor) return
    const initials = instrutor.nome.slice(0, 2).toUpperCase()
    document.querySelector('.profile strong')?.replaceChildren(instrutor.nome)
    document.querySelector('.profile small')?.replaceChildren('Instrutor')
    document.querySelectorAll('.profile .avatar, .top-avatar').forEach(element => element.replaceChildren(initials))
  }, [instrutor])

  useEffect(() => {
    if (!instrutor) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
    Promise.all((Object.keys(paths) as Entity[]).map(async entity => {
      const items = await request(paths[entity], { signal, headers: { Authorization: `Bearer ${instrutor.token}` } })
      if (!Array.isArray(items)) throw new Error(`Resposta inválida ao carregar ${entity.toLowerCase()}.`)
      return [entity, items] as const
    })).then(items => {
      if (!controller.signal.aborted) setStore({ ...emptyStore, ...Object.fromEntries(items), connected: true })
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(errorMessage(error))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [reload, instrutor])

  if (!instrutor) return <InstrutorLogin onLogin={setInstrutor}/>

  const navigate = (p: Page) => { setPage(p); setQuery(''); setMenu(false); setActionError('') }
  const save = async (entity: Entity, value: Item) => {
    if (!store.connected || mutationPending.current) return
    mutationPending.current = true
    setBusy(true)
    setActionError('')
    const id = value[keys[entity]]
    try {
      const result = await request(`${paths[entity]}${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instrutor.token}` },
        body: JSON.stringify(value),
      })
      if (!result || !Number.isInteger(result[keys[entity]])) throw new Error('A API não retornou o registro salvo.')
      setStore(current => ({
        ...current,
        [entity]: id ? current[entity].map(item => item[keys[entity]] === id ? result : item) : [...current[entity], result],
      }))
      setEditing(null)
    } catch (error) {
      setActionError(`Não foi possível salvar ${singular[entity]}: ${errorMessage(error)}`)
    } finally {
      mutationPending.current = false
      setBusy(false)
    }
  }
  const remove = async (entity: Entity, id: number) => {
    if (!store.connected || mutationPending.current || !confirm(`Excluir este ${singular[entity]}?`)) return
    mutationPending.current = true
    setBusy(true)
    setActionError('')
    try {
      await request(`${paths[entity]}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${instrutor.token}` } })
      setStore(current => ({ ...current, [entity]: current[entity].filter(item => item[keys[entity]] !== id) }))
    } catch (error) {
      setActionError(`Não foi possível excluir ${singular[entity]}: ${errorMessage(error)}`)
    } finally {
      mutationPending.current = false
      setBusy(false)
    }
  }
  const pending=store.Pagamentos.filter(x=>x.status_pagamento!=='Pago').length
  const nav:[Page,any][]=[['Visão geral',LayoutDashboard],['Alunos',Users],['Planos',ClipboardList],['Treinos',Dumbbell],['Instrutores',GraduationCap],['Pagamentos',CreditCard]]
  return <div className="app-shell"><aside className={`sidebar ${menu?'sidebar-open':''}`}><div className="workspace-label">GESTÃO DA ACADEMIA</div><nav>{nav.map(([name,Icon])=><button key={name} className={`nav-item ${page===name?'active':''}`} onClick={()=>navigate(name)}><Icon size={18}/><span>{name}</span>{name==='Alunos'&&<span className="nav-count">{store.Alunos.length}</span>}{name==='Pagamentos'&&!!pending&&<span className="nav-alert">{pending}</span>}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item"><Settings size={18}/><span>Configurações</span></button><div className="profile"><div className="avatar">RC</div><div><strong>Rafael Costa</strong><small>Administrador</small></div></div></div></aside><main className="main-content"><header className="topbar"><button className="icon-button menu-button" onClick={()=>setMenu(true)}><Menu size={22}/></button><div className="breadcrumb"><span>Academia</span><b>/</b><strong>{page}</strong></div><div className="topbar-actions"><span className={`api-status ${store.connected?'online':''}`}><i/>{loading?'Carregando…':store.connected?'API conectada':'API indisponível'}</span><button className="icon-button notification-button"><Bell size={19}/></button><div className="top-avatar">RC</div></div></header><div className="page-content">{actionError&&!editing&&<p role="alert">{actionError}</p>}{loading?<p role="status">Carregando dados da academia…</p>:loadError?<section role="alert"><p>Não foi possível carregar os dados: {loadError}</p><button className="primary-button" onClick={()=>{setLoading(true);setLoadError('');setStore(emptyStore);setReload(n=>n+1)}}>Tentar novamente</button></section>:page==='Visão geral'?<Dashboard store={store} go={navigate}/>:<List entity={page} store={store} query={query} setQuery={setQuery} edit={x=>{setActionError('');setEditing({entity:page,value:x})}} create={()=>{setActionError('');setEditing({entity:page})}} remove={remove} busy={busy}/>}</div><footer><span>Movimente · Gestão inteligente para sua academia</span><span>{store.connected ? "Dados carregados da API" : "Aguardando dados da API"}</span></footer></main>{editing&&<Form entity={editing.entity} value={editing.value} store={store} close={()=>{if(!busy){setEditing(null);setActionError('')}}} save={save} busy={busy} error={actionError}/>}</div>
}
function Dashboard({store,go}:{store:Store;go:(p:Page)=>void}){const received=store.Pagamentos.filter(x=>x.status_pagamento==='Pago').reduce((n,x)=>n+Number(x.valor),0);const instrutorNome=sessionStorage.getItem('instrutorNome')??'Instrutor';return <><section className="page-heading"><div><p className="eyebrow">GESTÃO DA ACADEMIA</p><h1>Bom dia, {instrutorNome} <span>✦</span></h1><p className="subheading">Acompanhe a rotina e os resultados da sua academia.</p></div><button className="primary-button" onClick={()=>go('Alunos')}><Plus size={18}/>Nova matrícula</button></section><section className="metrics-grid"><Card icon={<Users/>} label="Alunos cadastrados" value={String(store.Alunos.length)}/><Card icon={<ClipboardList/>} label="Planos ativos" value={String(store.Planos.filter(x=>x.ativo).length)}/><Card icon={<CreditCard/>} label="Receita recebida" value={money(received)}/><Card icon={<CalendarDays/>} label="Pagamentos pendentes" value={String(store.Pagamentos.filter(x=>x.status_pagamento!=='Pago').length)}/></section><section className="dashboard-actions"><button onClick={()=>go('Treinos')}><Dumbbell/>Gerenciar treinos</button><button onClick={()=>go('Pagamentos')}><CreditCard/>Abrir financeiro</button><button onClick={()=>go('Instrutores')}><GraduationCap/>Ver instrutores</button></section></>}
function Card({icon,label,value}:{icon:any;label:string;value:string}){return <article className="metric-card"><div className="metric-icon">{icon}</div><span className="metric-label">{label}</span><strong>{value}</strong></article>}
function List({entity,store,query,setQuery,edit,create,remove,busy}:{entity:Entity;store:Store;query:string;setQuery:(s:string)=>void;edit:(x:Item)=>void;create:()=>void;remove:(e:Entity,id:number)=>void;busy:boolean}){const name=(id:number)=>store.Alunos.find(x=>x.id_aluno===id)?.nome??'—',plan=(id:number)=>store.Planos.find(x=>x.id_plano===id)?.nome_plano??'—',trainer=(id:number)=>store.Instrutores.find(x=>x.id_instrutor===id)?.nome??'—';const rows=useMemo(()=>store[entity].filter(x=>JSON.stringify(x).toLowerCase().includes(query.toLowerCase())),[store,entity,query]);const cells=(x:Item)=>entity==='Alunos'?[<td key="cell-1"><div className="car-cell"><img src={x.foto||avatar} alt=""/><div><strong>{x.nome}</strong><span>{x.email}</span></div></div></td>,<td key="cell-2">{plan(x.id_plano)}</td>,<td key="cell-3">{date(x.data_cadastro||x.status)}</td>]:entity==='Planos'?[<td key="cell-4"><strong>{x.nome_plano}</strong><br/><small>{x.descricao}</small></td>,<td key="cell-5">{x.duracao_meses} meses</td>,<td key="cell-6">{money(x.valor_plano)}</td>,<td key="cell-7"><Badge value={x.ativo}/></td>]:entity==='Instrutores'?[<td key="cell-8"><div className="car-cell"><img src={x.foto||avatar} alt=""/><div><strong>{x.nome}</strong><span>{x.email}</span></div></div></td>,<td key="cell-9">{x.especialidade}</td>,<td key="cell-10"><Badge value={x.ativo}/></td>]:entity==='Treinos'?[<td key="cell-11"><strong>{x.objetivo}</strong><br/><small>{x.observacoes}</small></td>,<td key="cell-12">{name(x.id_aluno)}</td>,<td key="cell-13">{trainer(x.id_instrutor)}</td>,<td key="cell-14">{date(x.data_entrada)}</td>]:[<td key="cell-15">{name(x.id_aluno)}</td>,<td key="cell-16">{plan(x.id_plano)}</td>,<td key="cell-17">{money(x.valor)}</td>,<td key="cell-18"><Badge value={x.status_pagamento}/></td>,<td key="cell-19">{date(x.data_vencimento)}</td>];return <section><section className="page-heading"><div><p className="eyebrow">CADASTROS</p><h1>{entity}</h1><p className="subheading">Cadastre, edite e acompanhe {entity.toLowerCase()}.</p></div><button className="primary-button" disabled={busy} onClick={create}><Plus size={18}/>Novo {singular[entity]}</button></section><div className="toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Buscar ${singular[entity]}...`}/></div></div><div className="table-wrap"><table><thead><tr>{headers[entity].map(x=><th key={x}>{x}</th>)}<th/></tr></thead><tbody>{rows.map(x=><tr key={x[keys[entity]]}>{cells(x)}<td key="cell-20"><div className="row-actions"><button disabled={busy} aria-label="Editar registro" onClick={()=>edit(x)}><Pencil size={15}/></button><button disabled={busy} aria-label="Excluir registro" onClick={()=>remove(entity,x[keys[entity]])}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{!rows.length&&<div className="empty-state">Nenhum registro encontrado.</div>}</div></section>}
const headers:Record<Entity,string[]>={Alunos:['ALUNO','PLANO','CADASTRO'],Planos:['PLANO','DURAÇÃO','VALOR','STATUS'],Instrutores:['INSTRUTOR','ESPECIALIDADE','STATUS'],Treinos:['OBJETIVO','ALUNO','INSTRUTOR','INÍCIO'],Pagamentos:['ALUNO','PLANO','VALOR','STATUS','VENCIMENTO']}
function Badge({value}:{value:any}){const good=value===true||value==='Pago';return <span className={`status ${good?'available':'featured'}`}><i/>{typeof value==='boolean'?(value?'Ativo':'Inativo'):value}</span>}
function Form({ entity, value, store, close, save, busy, error }: {
  entity: Entity; value?: Item; store: Store; close: () => void;
  save: (entity: Entity, value: Item) => Promise<void>; busy: boolean; error: string;
}) {
  const [data, setData] = useState<Item>(() => initialValues(entity, store, value))
  const change = (key: string, next: any) => setData(current => ({ ...current, [key]: next }))
  const selectOptions = (type?: string): [number | string, string][] =>
    type === 'student' ? store.Alunos.map(item => [item.id_aluno, item.nome]) :
    type === 'plan' ? store.Planos.map(item => [item.id_plano, item.nome_plano]) :
    type === 'instructor' ? store.Instrutores.map(item => [item.id_instrutor, item.nome]) : []
  const missingReference = fields[entity].some(field =>
    ['student', 'plan', 'instructor'].includes(field.type ?? '') &&
    !selectOptions(field.type).some(([id]) => String(id) === String(data[field.key])),
  )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (busy || missingReference) return
    // Envia somente campos do formulário; datas automáticas ficam sob responsabilidade da API.
    const payload = Object.fromEntries(fields[entity].map(field => [field.key, data[field.key]]))
    if (value) payload[keys[entity]] = value[keys[entity]]
    if (entity === 'Instrutores') {
      if (value && !payload.senha) delete payload.senha
      delete payload.ativo // A API atual ainda não permite alterar o status do instrutor.
    }
    void save(entity, payload)
  }
  return <div className="modal-backdrop">
    <form className="form-modal" onSubmit={submit} aria-label={`${value ? 'Editar' : 'Novo'} ${singular[entity]}`} aria-busy={busy}>
      <div className="modal-heading">
        <div><p className="eyebrow">{value ? 'EDIÇÃO' : 'NOVO CADASTRO'}</p><h2>{value ? 'Editar' : 'Novo'} {singular[entity]}</h2></div>
        <button type="button" className="icon-button" disabled={busy} onClick={close} aria-label="Fechar formulário"><X/></button>
      </div>
      {error && <p role="alert">{error}</p>}
      {missingReference && <p role="status">Selecione registros existentes nos campos vinculados. Se a lista estiver vazia, cadastre o registro correspondente primeiro.</p>}
      <div className="form-grid">
        {fields[entity].map(field => {
          const reference = ['student', 'plan', 'instructor'].includes(field.type ?? '')
          const options: [number | string, string][] = field.options?.map(option => [option, option]) ??
            (field.type === 'boolean' ? [['true', 'Ativo'], ['false', 'Inativo']] : selectOptions(field.type))
          const isSelect = reference || field.type === 'boolean' || !!field.options
          const statusUnavailable = entity === 'Instrutores' && field.key === 'ativo'
          const decimal = ['valor', 'valor_plano'].includes(field.key)
          const maxLength = ({ nome: 30, nome_plano: 30, email: 40, telefone: 20, senha: 100, especialidade: 50, objetivo: 100, descricao: 100, observacoes: 200 } as Record<string, number>)[field.key]
          return <label className={field.type === 'textarea' ? 'wide' : ''} key={field.key}>
            {field.label}
            {field.type === 'textarea' ?
              <textarea disabled={busy} maxLength={maxLength} value={data[field.key] ?? ''} onChange={event => change(field.key, event.target.value)}/> :
              isSelect ?
                <select required disabled={busy || statusUnavailable || (reference && !options.length)}
                  value={String(data[field.key] ?? '')}
                  onChange={event => change(field.key, field.type === 'boolean' ? event.target.value === 'true' : reference ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)}>
                  {reference && <option value="">Selecione…</option>}
                  {reference && data[field.key] !== '' && !options.some(([id]) => String(id) === String(data[field.key])) &&
                    <option value={String(data[field.key])} disabled>Registro indisponível</option>}
                  {options.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
                </select> :
                <input disabled={busy} required={!(value && field.key === 'senha') && !['foto', 'data_cadastro'].includes(field.key)}
                  type={field.type || 'text'} value={data[field.key] ?? ''}
                  step={field.type === 'number' ? (decimal ? '0.01' : '1') : undefined}
                  min={field.type === 'number' ? (decimal ? 0 : 1) : undefined}
                  max={field.key === 'data_nascimento' ? new Date().getFullYear() : field.key === 'duracao_meses' ? 32767 : undefined}
                  minLength={field.key === 'senha' ? 6 : field.key === 'telefone' ? 8 : undefined}
                  maxLength={maxLength}
                  autoComplete={field.key === 'senha' ? 'new-password' : undefined}
                  onChange={event => change(field.key, field.type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)}/>}
            {field.key === 'senha' && value && <small>Deixe em branco para manter a senha atual.</small>}
            {statusUnavailable && <small>A alteração de status ainda não está disponível.</small>}
          </label>
        })}
      </div>
      <div className="form-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={close}>Cancelar</button>
        <button className="primary-button" disabled={busy || missingReference}>{busy ? 'Salvando…' : `Salvar ${singular[entity]}`}</button>
      </div>
    </form>
  </div>
}
