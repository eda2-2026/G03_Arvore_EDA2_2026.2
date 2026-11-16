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