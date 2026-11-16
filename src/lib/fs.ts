// Sistema de arquivos em memória modelado como uma árvore N-ária. 
// Cada nó guarda um "ponteiro" (id), o ponteiro do pai e um array de ponteiros filhos.

export type NodeType = 'dir' | 'file'

export interface FsNode {
  id: string
  name: string
  type: NodeType
  parent: string | null
  children: string[]
  size: number // KB (apenas arquivos)
}

export interface FsState {
  nodes: Record<string, FsNode>
  root: string
  cwd: string
  counter: number
}

export type Tone = 'dir' | 'file' | 'err' | 'ok' | 'dim' | 'warn' | 'accent'
export interface Seg {
  text: string
  tone?: Tone
}
export type Line = Seg[]

export interface CmdResult {
  fs: FsState
  lines: Line[]
  select?: string
  highlight?: string[]
  clear?: boolean
}

export interface HistoryEntry {
  id: number
  cmd?: string
  lines: Line[]
}

export const NODE_OVERHEAD_KB = 2
export const COMMANDS = [
  'help',
  'pwd',
  'ls',
  'cd',
  'mkdir',
  'touch',
  'rm',
  'mv',
  'tree',
  'find',
  'stat',
  'clear',
]
/* ------------------------------ helpers ------------------------------ */

export const makeId = (n: number) => '0x' + (0x7f3a01c0 + n * 0x48).toString(16)

export function createFs(): FsState {
  const rootId = makeId(0)
  return {
    nodes: {
      [rootId]: { id: rootId, name: '/', type: 'dir', parent: null, children: [], size: 0 },
    },
    root: rootId,
    cwd: rootId,
    counter: 1,
  }
}

function cloneFs(fs: FsState): FsState {
  const nodes: Record<string, FsNode> = {}
  for (const k of Object.keys(fs.nodes)) nodes[k] = { ...fs.nodes[k], children: [...fs.nodes[k].children] }
  return { ...fs, nodes }
}

export function pathOf(fs: FsState, id: string): string {
  const parts: string[] = []
  let cur: FsNode | undefined = fs.nodes[id]
  while (cur && cur.parent) {
    parts.unshift(cur.name)
    cur = fs.nodes[cur.parent]
  }
  return '/' + parts.join('/')
}

/** Ids da raiz até o nó (inclusive). */
export function ancestors(fs: FsState, id: string): string[] {
  const out: string[] = []
  let cur: FsNode | undefined = fs.nodes[id]
  while (cur) {
    out.unshift(cur.id)
    cur = cur.parent ? fs.nodes[cur.parent] : undefined
  }
  return out
}

export function depthOf(fs: FsState, id: string) {
  return ancestors(fs, id).length - 1
}

function homeId(fs: FsState): string | null {
  return resolve(fs, '/home/usuario', fs.root)
}

export function promptPath(fs: FsState): string {
  const p = pathOf(fs, fs.cwd)
  const home = homeId(fs)
  if (home) {
    const hp = pathOf(fs, home)
    if (p === hp) return '~'
    if (p.startsWith(hp + '/')) return '~' + p.slice(hp.length)
  }
  return p
}

export function childByName(fs: FsState, dirId: string, name: string): string | null {
  const d = fs.nodes[dirId]
  if (!d) return null
  return d.children.find((c) => fs.nodes[c].name === name) ?? null
}

export function resolve(fs: FsState, path: string, from: string = fs.cwd): string | null {
  let cur: string
  let p = path
  if (p === '~' || p.startsWith('~/')) {
    const h = homeId(fs)
    cur = h ?? fs.root
    p = p.slice(1)
  } else if (p.startsWith('/')) cur = fs.root
  else cur = from
  for (const part of p.split('/')) {
    if (!part || part === '.') continue
    const node = fs.nodes[cur]
    if (node.type !== 'dir') return null
    if (part === '..') {
      cur = node.parent ?? cur
      continue
    }
    const next = childByName(fs, cur, part)
    if (!next) return null
    cur = next
  }
  return cur
}

function splitPath(p: string): { dir: string; base: string } {
  let s = p
  while (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
  const i = s.lastIndexOf('/')
  if (i === -1) return { dir: '', base: s }
  if (i === 0) return { dir: '/', base: s.slice(1) }
  return { dir: s.slice(0, i), base: s.slice(i + 1) }
}

export function validateName(name: string): string | null {
  if (!name) return 'O nome não pode ser vazio'
  if (name === '.' || name === '..') return 'Nome reservado'
  if (/[\/"']/.test(name)) return "O nome não pode conter / ' ou \""
  if (name.length > 48) return 'Máximo de 48 caracteres'
  return null
}

export function validateNewName(fs: FsState, parentId: string, name: string): string | null {
  const v = validateName(name)
  if (v) return v
  if (childByName(fs, parentId, name)) return `"${name}" já existe neste diretório`
  return null
}

function isAncestor(fs: FsState, anc: string, id: string) {
  return ancestors(fs, id).includes(anc)
}

function addNode(fs: FsState, parentId: string, name: string, type: NodeType, size = 0): string {
  const id = makeId(fs.counter++)
  fs.nodes[id] = { id, name, type, parent: parentId, children: [], size: type === 'file' ? size : 0 }
  fs.nodes[parentId].children.push(id)
  return id
}

function removeSubtree(fs: FsState, id: string): { count: number; kb: number } {
  const node = fs.nodes[id]
  const parent = node.parent ? fs.nodes[node.parent] : null
  if (parent) parent.children = parent.children.filter((c) => c !== id)
  let count = 0
  let kb = 0
  const stack = [id]
  const gone = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    gone.add(cur)
    stack.push(...fs.nodes[cur].children)
  }
  for (const g of gone) {
    count++
    kb += fs.nodes[g].size + NODE_OVERHEAD_KB
    delete fs.nodes[g]
  }
  if (gone.has(fs.cwd)) fs.cwd = parent ? parent.id : fs.root
  return { count, kb }
}

export function listDfs(fs: FsState, from: string = fs.root): string[] {
  const out: string[] = []
  const walk = (id: string) => {
    out.push(id)
    fs.nodes[id].children.forEach(walk)
  }
  walk(from)
  return out
}

export function findNodes(fs: FsState, term: string): string[] {
  const t = term.trim().toLowerCase()
  if (!t) return []
  return listDfs(fs).filter((id) => id !== fs.root && fs.nodes[id].name.toLowerCase().includes(t))
}

export function computeStats(fs: FsState) {
  let total = 0
  let height = 0
  let maxDegree = 0
  let files = 0
  let kb = 0
  const walk = (id: string, d: number) => {
    const n = fs.nodes[id]
    total++
    height = Math.max(height, d)
    maxDegree = Math.max(maxDegree, n.children.length)
    kb += NODE_OVERHEAD_KB + n.size
    if (n.type === 'file') files++
    n.children.forEach((c) => walk(c, d + 1))
  }
  walk(fs.root, 0)
  return { total, height, maxDegree, memoryKb: kb, files, dirs: total - files }
}

export function formatKb(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

export function fileKind(name: string): 'code' | 'text' | 'other' {
  if (/\.(c|h|cpp|ts|tsx|js|jsx|py|rs|go|java|sh|json)$/i.test(name)) return 'code'
  if (/\.(md|txt|log|conf)$/i.test(name) || name === 'hosts') return 'text'
  return 'other'
}

/* ------------------------------ comandos ------------------------------ */

const err = (text: string): Line => [{ text, tone: 'err' }]
const dim = (text: string): Line => [{ text, tone: 'dim' }]

function tokenize(input: string): string[] {
  const out: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

function expandTargets(fs: FsState, arg: string): string[] {
  const { dir, base } = splitPath(arg)
  if (base === '*') {
    const d = dir === '' ? fs.cwd : resolve(fs, dir)
    if (!d || fs.nodes[d].type !== 'dir') return []
    return [...fs.nodes[d].children]
  }
  const r = resolve(fs, arg)
  return r ? [r] : []
}

function createAt(
  fs: FsState,
  arg: string,
  type: NodeType,
  size: number,
  parents: boolean,
  cmd: string,
): { id?: string; error?: string } {
  if (parents && type === 'dir') {
    let cur = arg.startsWith('/') ? fs.root : fs.cwd
    let created: string | undefined
    for (const part of arg.split('/').filter(Boolean)) {
      if (part === '.') continue
      if (part === '..') {
        cur = fs.nodes[cur].parent ?? cur
        continue
      }
      const v = validateName(part)
      if (v) return { error: `${cmd}: ${v}` }
      const ex = childByName(fs, cur, part)
      if (ex) {
        if (fs.nodes[ex].type !== 'dir') return { error: `${cmd}: '${part}' não é um diretório` }
        cur = ex
      } else {
        cur = addNode(fs, cur, part, 'dir')
        created = cur
      }
    }
    return { id: created ?? cur }
  }
  const { dir, base } = splitPath(arg)
  const parent = dir === '' ? fs.cwd : resolve(fs, dir)
  if (!parent) return { error: `${cmd}: não é possível criar '${arg}': Arquivo ou diretório inexistente` }
  if (fs.nodes[parent].type !== 'dir') return { error: `${cmd}: '${dir}': Não é um diretório` }
  const v = validateName(base)
  if (v) return { error: `${cmd}: ${v}` }
  if (childByName(fs, parent, base)) return { error: `${cmd}: não é possível criar '${arg}': já existe` }
  return { id: addNode(fs, parent, base, type, size) }
}

export function runCommand(prev: FsState, input: string): CmdResult {
  const tokens = tokenize(input.trim())
  const fs = cloneFs(prev)
  const lines: Line[] = []
  const result: CmdResult = { fs, lines }
  if (!tokens.length) return result
  const [cmd, ...rest] = tokens
  const flags = rest.filter((t) => t.startsWith('-') && t.length > 1)
  const args = rest.filter((t) => !(t.startsWith('-') && t.length > 1))

  switch (cmd) {
    case 'help': {
      const rows: [string, string][] = [
        ['pwd', 'mostra o diretório atual'],
        ['ls [-l] [dir]', 'lista os filhos de um nó'],
        ['cd <dir>', 'move o ponteiro atual (.. sobe, ~ home)'],
        ['mkdir [-p] <nome>', 'cria um nó pasta'],
        ['touch <nome> [kb]', 'cria um nó folha (arquivo)'],
        ['rm [-rf] <alvo>', 'remove um nó (e sua subárvore)'],
        ['mv <origem> <dest>', 'move / renomeia um nó'],
        ['tree [dir]', 'imprime a subárvore'],
        ['find <termo>', 'busca nós por nome e destaca no canvas'],
        ['stat <alvo>', 'inspeciona a estrutura de um nó'],
        ['clear', 'limpa o terminal'],
      ]
      rows.forEach(([c, d]) => lines.push([{ text: c.padEnd(20), tone: 'accent' }, { text: d, tone: 'dim' }]))
      break
    }
    case 'pwd':
      lines.push([{ text: pathOf(fs, fs.cwd) }])
      break
    case 'clear':
      result.clear = true
      break
    case 'ls': {
      const long = flags.some((f) => f.includes('l'))
      const target = args[0] ? resolve(fs, args[0]) : fs.cwd
      if (!target) {
        lines.push(err(`ls: não é possível acessar '${args[0]}': Arquivo ou diretório inexistente`))
        break
      }
      const n = fs.nodes[target]
      const ids = n.type === 'dir' ? n.children : [target]
      if (!ids.length) {
        lines.push(dim('(diretório vazio)'))
        break
      }
      const sorted = [...ids].sort((a, b) => {
        const x = fs.nodes[a]
        const y = fs.nodes[b]
        if (x.type !== y.type) return x.type === 'dir' ? -1 : 1
        return x.name.localeCompare(y.name)
      })
      if (long) {
        sorted.forEach((id) => {
          const c = fs.nodes[id]
          const meta =
            c.type === 'dir'
              ? `d  ${String(c.children.length).padStart(2)} filhos `
              : `-  ${String(c.size).padStart(2)} KB     `
          lines.push([
            { text: meta, tone: 'dim' },
            { text: c.type === 'dir' ? c.name + '/' : c.name, tone: c.type },
          ])
        })
      } else {
        const line: Line = []
        sorted.forEach((id) => {
          const c = fs.nodes[id]
          line.push({ text: c.type === 'dir' ? c.name + '/' : c.name, tone: c.type })
          line.push({ text: '  ' })
        })
        lines.push(line)
      }
      break
    }
    case 'cd': {
      const t = args[0] ? resolve(fs, args[0]) : (homeId(fs) ?? fs.root)
      if (!t) lines.push(err(`cd: ${args[0]}: Arquivo ou diretório inexistente`))
      else if (fs.nodes[t].type !== 'dir') lines.push(err(`cd: ${args[0]}: Não é um diretório`))
      else {
        fs.cwd = t
        result.select = t
      }
      break
    }
    case 'mkdir': {
      if (!args.length) {
        lines.push(err('mkdir: operando ausente'))
        break
      }
      const parents = flags.some((f) => f.includes('p'))
      for (const a of args) {
        const r = createAt(fs, a, 'dir', 0, parents, 'mkdir')
        if (r.error) lines.push(err(r.error))
        else result.select = r.id
      }
      break
    }
    case 'touch': {
      if (!args.length) {
        lines.push(err('touch: operando de arquivo ausente'))
        break
      }
      let names = args
      let size = 1
      if (args.length >= 2 && /^\d+$/.test(args[args.length - 1])) {
        size = Math.min(parseInt(args[args.length - 1], 10), 99999)
        names = args.slice(0, -1)
      }
      for (const a of names) {
        const ex = resolve(fs, a)
        if (ex) {
          if (fs.nodes[ex].type === 'file') {
            if (names !== args) fs.nodes[ex].size = size
            lines.push(dim(`touch: '${a}' já existe (atualizado)`))
            result.select = ex
          } else lines.push(err(`touch: '${a}' é um diretório`))
          continue
        }
        const r = createAt(fs, a, 'file', size, false, 'touch')
        if (r.error) lines.push(err(r.error))
        else result.select = r.id
      }
      break
    }
    case 'rm': {
      const recursive = flags.some((f) => /[rR]/.test(f))
      const force = flags.some((f) => f.includes('f'))
      if (!args.length) {
        lines.push(err('rm: operando ausente'))
        break
      }
      for (const a of args) {
        if (resolve(fs, a) === fs.root && splitPath(a).base !== '*') {
          lines.push(err("rm: é perigoso operar recursivamente em '/' (preserve-root)"))
          continue
        }
        const targets = expandTargets(fs, a)
        if (!targets.length) {
          if (!force) lines.push(err(`rm: não é possível remover '${a}': Arquivo ou diretório inexistente`))
          continue
        }
        let count = 0
        let kb = 0
        for (const id of targets) {
          if (!fs.nodes[id] || id === fs.root) continue
          if (fs.nodes[id].type === 'dir' && !recursive) {
            lines.push(err(`rm: não é possível remover '${fs.nodes[id].name}': É um diretório (use -r)`))
            continue
          }
          const r = removeSubtree(fs, id)
          count += r.count
          kb += r.kb
        }
        if (count > 1) lines.push(dim(`${count} nós liberados · ${kb} KB`))
      }
      break
    }
    case 'mv': {
      if (args.length < 2) {
        lines.push(err('mv: uso: mv <origem> <destino>'))
        break
      }
      const src = resolve(fs, args[0])
      if (!src) {
        lines.push(err(`mv: '${args[0]}': Arquivo ou diretório inexistente`))
        break
      }
      if (src === fs.root) {
        lines.push(err("mv: não é possível mover '/'"))
        break
      }
      const dst = resolve(fs, args[1])
      let newParent: string
      let newName: string
      if (dst && fs.nodes[dst].type === 'dir') {
        newParent = dst
        newName = fs.nodes[src].name
      } else if (dst) {
        lines.push(err(`mv: '${args[1]}' já existe`))
        break
      } else {
        const { dir, base } = splitPath(args[1])
        const p = dir === '' ? fs.cwd : resolve(fs, dir)
        if (!p || fs.nodes[p].type !== 'dir') {
          lines.push(err(`mv: destino '${args[1]}' inválido`))
          break
        }
        newParent = p
        newName = base
      }
      const v = validateName(newName)
      if (v) {
        lines.push(err(`mv: ${v}`))
        break
      }
      if (isAncestor(fs, src, newParent)) {
        lines.push(err('mv: não é possível mover um nó para dentro de si mesmo (ciclo)'))
        break
      }
      const clash = childByName(fs, newParent, newName)
      if (clash && clash !== src) {
        lines.push(err(`mv: '${newName}' já existe no destino`))
        break
      }
      const node = fs.nodes[src]
      const old = fs.nodes[node.parent!]
      old.children = old.children.filter((c) => c !== src)
      fs.nodes[newParent].children.push(src)
      node.parent = newParent
      node.name = newName
      result.select = src
      break
    }
    case 'tree': {
      const t = args[0] ? resolve(fs, args[0]) : fs.cwd
      if (!t) {
        lines.push(err(`tree: '${args[0]}': Arquivo ou diretório inexistente`))
        break
      }
      lines.push([{ text: t === fs.root ? '/' : fs.nodes[t].name, tone: fs.nodes[t].type }])
      const walk = (id: string, prefix: string) => {
        const kids = fs.nodes[id].children
        kids.forEach((k, i) => {
          const last = i === kids.length - 1
          const n = fs.nodes[k]
          lines.push([
            { text: prefix + (last ? '└── ' : '├── '), tone: 'dim' },
            { text: n.name, tone: n.type },
          ])
          walk(k, prefix + (last ? '    ' : '│   '))
        })
      }
      walk(t, '')
      const s = listDfs(fs, t).length
      lines.push(dim(`${s} nós`))
      break
    }
    case 'find': {
      const term = args.join(' ')
      if (!term) {
        lines.push(err('find: uso: find <termo>'))
        break
      }
      const hits = findNodes(fs, term)
      if (!hits.length) lines.push(err(`find: nenhum nó encontrado para '${term}'`))
      else {
        hits.forEach((id) => lines.push([{ text: pathOf(fs, id), tone: fs.nodes[id].type }]))
        lines.push(dim(`${hits.length} resultado(s)`))
        result.highlight = hits
        result.select = hits[0]
      }
      break
    }
    case 'stat': {
      const t = args[0] ? resolve(fs, args[0]) : fs.cwd
      if (!t) {
        lines.push(err(`stat: '${args[0]}': Arquivo ou diretório inexistente`))
        break
      }
      const n = fs.nodes[t]
      const row = (k: string, v: string) => lines.push([{ text: k.padEnd(10), tone: 'dim' }, { text: v }])
      row('ptr', n.id)
      row('nome', n.name)
      row('tipo', n.type === 'dir' ? 'pasta' : 'arquivo (folha)')
      row('parent', n.parent ?? 'NULL')
      row('filhos', n.type === 'dir' ? String(n.children.length) : 'NULL')
      if (n.type === 'file') row('tamanho', `${n.size} KB`)
      result.select = t
      break
    }
    default:
      lines.push(err(`bash: ${cmd}: comando não encontrado (digite 'help')`))
  }
  return result
}
/* ------------------------------ sessão inicial ------------------------------ */

export function createInitialSession(): { fs: FsState; history: HistoryEntry[] } {
  let fs = createFs()
  const setup = [
    'mkdir home etc var tmp usr',
    'mkdir -p home/usuario',
    'touch home/usuario/notas.txt 12',
    'touch etc/hosts 2',
    'touch var/app.log 48',
    'touch tmp/cache.bin 6',
  ]
  for (const c of setup) fs = runCommand(fs, c).fs
  const visible = [
    'cd /home/usuario',
    'mkdir projetos',
    'cd projetos',
    'touch README.md 8',
    'touch main.c 24',
    'touch temp.txt 4',
    'ls',
    'rm temp.txt',
  ]
  const history: HistoryEntry[] = [
    {
      id: 0,
      lines: [dim("memfs 1.0 · árvore N-ária em memória · digite 'help' para ver os comandos")],
    },
  ]
  visible.forEach((cmd, i) => {
    const r = runCommand(fs, cmd)
    fs = r.fs
    history.push({ id: i + 1, cmd, lines: r.lines })
  })
  return { fs, history }
}
