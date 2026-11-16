/ Sistema de arquivos em memória modelado como uma árvore N-ária.
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