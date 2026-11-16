/ Sistema de arquivos em memória modelado como uma árvore N-ária.
// Cada nó guarda um "ponteiro" (id), o ponteiro do pai e um array de ponteiros filhos.

export type NodeType = 'dir' | 'file'

export interface FsNode {
  id: string
  name: string
  type: NodeType

  // Pai na hierarquia de diretórios, não na AVL.
  parent: string | null

  // Raiz da AVL das entradas deste diretório.
  // Arquivos possuem entries = null.
  entries: AvlNode | null

  // Compatibilidade com os componentes existentes.
  // É calculado a partir da AVL, não armazenado em paralelo.
  readonly children: string[]

  size: number
}

export interface FsRotation extends RotationEvent {
  directoryId: string
}

export interface FsState {
  nodes: Record<string, FsNode>
  root: string
  cwd: string
  counter: number
  avlEvents: FsRotation[]
}

export type Tone =
  | 'dir'
  | 'file'
  | 'err'
  | 'ok'
  | 'dim'
  | 'warn'
  | 'accent'

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

// Estimativa didática; não representa consumo real de memória do JavaScript.
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

export const makeId = (n: number) =>
  '0x' + (0x7f3a01c0 + n * 0x48).toString(16)

function makeFsNode(data: Omit<FsNode, 'children'>): FsNode {
  return {
    ...data,

    get children(): string[] {
      return avlInOrder(this.entries).map((entry) => entry.value)
    },
  }
}

export function createFs(): FsState {
  const rootId = makeId(0)

  return {
    nodes: {
      [rootId]: makeFsNode({
        id: rootId,
        name: '/',
        type: 'dir',
        parent: null,
        entries: null,
        size: 0,
      }),
    },
    root: rootId,
    cwd: rootId,
    counter: 1,
    avlEvents: [],
  }
}

function cloneFs(fs: FsState): FsState {
  const nodes: Record<string, FsNode> = {}

  for (const id of Object.keys(fs.nodes)) {
    const current = fs.nodes[id]

    nodes[id] = makeFsNode({
      id: current.id,
      name: current.name,
      type: current.type,
      parent: current.parent,
      size: current.size,
      entries: current.entries,
    })
  }

  // As AVL são imutáveis e podem compartilhar subárvores entre estados.
  return {
    ...fs,
    nodes,
    avlEvents: [],
  }
}

export function childrenOf(fs: FsState, id: string): string[] {
  return fs.nodes[id]?.children ?? []
}

export function pathOf(fs: FsState, id: string): string {
  const parts: string[] = []
  let current: FsNode | undefined = fs.nodes[id]

  while (current && current.parent) {
    parts.unshift(current.name)
    current = fs.nodes[current.parent]
  }

  return '/' + parts.join('/')
}

export function ancestors(fs: FsState, id: string): string[] {
  const result: string[] = []
  let current: FsNode | undefined = fs.nodes[id]

  while (current) {
    result.unshift(current.id)
    current = current.parent
      ? fs.nodes[current.parent]
      : undefined
  }

  return result
}

export function depthOf(fs: FsState, id: string): number {
  return ancestors(fs, id).length - 1
}

function homeId(fs: FsState): string | null {
  return resolve(fs, '/home/usuario', fs.root)
}

export function promptPath(fs: FsState): string {
  const currentPath = pathOf(fs, fs.cwd)
  const home = homeId(fs)

  if (home) {
    const homePath = pathOf(fs, home)

    if (currentPath === homePath) return '~'

    if (currentPath.startsWith(homePath + '/')) {
      return '~' + currentPath.slice(homePath.length)
    }
  }

  return currentPath
}

export function childByName(
  fs: FsState,
  dirId: string,
  name: string,
): string | null {
  const directory = fs.nodes[dirId]

  if (!directory || directory.type !== 'dir') return null

  return avlSearch(directory.entries, name)?.value ?? null
}

export function resolve(
  fs: FsState,
  path: string,
  from: string = fs.cwd,
): string | null {
  let current: string
  let remaining = path

  if (remaining === '~' || remaining.startsWith('~/')) {
    current = homeId(fs) ?? fs.root
    remaining = remaining.slice(1)
  } else {
    current = remaining.startsWith('/') ? fs.root : from
  }

  for (const part of remaining.split('/')) {
    if (!part || part === '.') continue

    const node = fs.nodes[current]

    if (!node || node.type !== 'dir') return null

    if (part === '..') {
      current = node.parent ?? current
      continue
    }

    const next = childByName(fs, current, part)

    if (!next) return null

    current = next
  }

  return fs.nodes[current] ? current : null
}

function splitPath(path: string): { dir: string; base: string } {
  let value = path

  while (value.length > 1 && value.endsWith('/')) {
    value = value.slice(0, -1)
  }

  const index = value.lastIndexOf('/')

  if (index === -1) return { dir: '', base: value }
  if (index === 0) return { dir: '/', base: value.slice(1) }

  return {
    dir: value.slice(0, index),
    base: value.slice(index + 1),
  }
}

export function validateName(name: string): string | null {
  if (!name) return 'O nome não pode ser vazio'
  if (name === '.' || name === '..') return 'Nome reservado'
  if (/[\/"']/.test(name)) return `O nome não pode conter /, ' ou "`
  if (name.length > 48) return 'Máximo de 48 caracteres'

  return null
}

export function validateNewName(
  fs: FsState,
  parentId: string,
  name: string,
): string | null {
  if (fs.nodes[parentId]?.type !== 'dir') {
    return 'Destino não é um diretório'
  }

  const error = validateName(name)

  if (error) return error

  if (childByName(fs, parentId, name)) {
    return `"${name}" já existe neste diretório`
  }

  return null
}

function insertEntry(
  fs: FsState,
  directoryId: string,
  name: string,
  id: string,
): void {
  const events: RotationEvent[] = []
  const directory = fs.nodes[directoryId]

  directory.entries = avlInsert(
    directory.entries,
    name,
    id,
    events,
  )

  fs.avlEvents.push(
    ...events.map((event) => ({ ...event, directoryId })),
  )
}

function removeEntry(
  fs: FsState,
  directoryId: string,
  name: string,
): void {
  const events: RotationEvent[] = []
  const directory = fs.nodes[directoryId]

  directory.entries = avlRemove(directory.entries, name, events)

  fs.avlEvents.push(
    ...events.map((event) => ({ ...event, directoryId })),
  )
}

function addNode(
  fs: FsState,
  parentId: string,
  name: string,
  type: NodeType,
  size = 0,
): string {
  const id = makeId(fs.counter++)

  fs.nodes[id] = makeFsNode({
    id,
    name,
    type,
    parent: parentId,
    entries: null,
    size: type === 'file' ? size : 0,
  })

  insertEntry(fs, parentId, name, id)

  return id
}

function removeSubtree(
  fs: FsState,
  id: string,
): { count: number; kb: number } {
  const node = fs.nodes[id]
  const parent = node.parent ? fs.nodes[node.parent] : null

  if (parent) removeEntry(fs, parent.id, node.name)

  const stack = [id]
  const removed = new Set<string>()
  let kb = 0

  while (stack.length) {
    const current = stack.pop()!

    if (removed.has(current)) continue

    removed.add(current)
    stack.push(...childrenOf(fs, current))
  }

  for (const current of removed) {
    kb += fs.nodes[current].size + NODE_OVERHEAD_KB
    delete fs.nodes[current]
  }

  if (removed.has(fs.cwd)) {
    fs.cwd = parent?.id ?? fs.root
  }

  return { count: removed.size, kb }
}

export function listDfs(
  fs: FsState,
  from: string = fs.root,
): string[] {
  const result: string[] = []

  function visit(id: string): void {
    if (!fs.nodes[id]) return

    result.push(id)
    childrenOf(fs, id).forEach(visit)
  }

  visit(from)
  return result
}

export function findNodes(fs: FsState, term: string): string[] {
  const search = term.trim().toLowerCase()

  if (!search) return []

  return listDfs(fs).filter(
    (id) =>
      id !== fs.root &&
      fs.nodes[id].name.toLowerCase().includes(search),
  )
}

export function computeStats(fs: FsState) {
  let total = 0
  let height = 0
  let maxDegree = 0
  let files = 0
  let memoryKb = 0

  function visit(id: string, depth: number): void {
    const node = fs.nodes[id]
    const children = childrenOf(fs, id)

    total++
    height = Math.max(height, depth)
    maxDegree = Math.max(maxDegree, children.length)
    memoryKb += NODE_OVERHEAD_KB + node.size

    if (node.type === 'file') files++

    children.forEach((child) => visit(child, depth + 1))
  }

  visit(fs.root, 0)

  return {
    total,
    height,
    maxDegree,
    memoryKb,
    files,
    dirs: total - files,
  }
}

export function formatKb(kb: number): string {
  return kb >= 1024
    ? `${(kb / 1024).toFixed(1)} MB`
    : `${kb} KB`
}

export function fileKind(name: string): 'code' | 'text' | 'other' {
  if (/\.(c|h|cpp|ts|tsx|js|jsx|py|rs|go|java|sh|json)$/i.test(name)) {
    return 'code'
  }

  if (/\.(md|txt|log|conf)$/i.test(name) || name === 'hosts') {
    return 'text'
  }

  return 'other'
}

const err = (text: string): Line => [{ text, tone: 'err' }]
const dim = (text: string): Line => [{ text, tone: 'dim' }]

function tokenize(input: string): string[] {
  const result: string[] = []
  const expression = /"([^"]*)"|'([^']*)'|(\S+)/g
  let match: RegExpExecArray | null

  while ((match = expression.exec(input))) {
    result.push(match[1] ?? match[2] ?? match[3])
  }

  return result
}

function expandTargets(fs: FsState, path: string): string[] {
  const { dir, base } = splitPath(path)

  if (base === '*') {
    const directoryId = dir === '' ? fs.cwd : resolve(fs, dir)

    if (!directoryId || fs.nodes[directoryId].type !== 'dir') {
      return []
    }

    return childrenOf(fs, directoryId)
  }

  const id = resolve(fs, path)
  return id ? [id] : []
}

function createAt(
  fs: FsState,
  path: string,
  type: NodeType,
  size: number,
  parents: boolean,
): { id?: string; error?: string } {
  if (parents && type === 'dir') {
    const tilde = path === '~' || path.startsWith('~/')

    let current = tilde
      ? (homeId(fs) ?? fs.root)
      : path.startsWith('/')
        ? fs.root
        : fs.cwd

    const remaining = tilde ? path.slice(1) : path

    for (const part of remaining.split('/').filter(Boolean)) {
      if (part === '.') continue

      if (part === '..') {
        current = fs.nodes[current].parent ?? current
        continue
      }

      const nameError = validateName(part)

      if (nameError) return { error: nameError }

      const existing = childByName(fs, current, part)

      if (existing) {
        if (fs.nodes[existing].type !== 'dir') {
          return { error: `'${part}' não é um diretório` }
        }

        current = existing
      } else {
        current = addNode(fs, current, part, 'dir')
      }
    }

    return { id: current }
  }

  const { dir, base } = splitPath(path)
  const parentId = dir === '' ? fs.cwd : resolve(fs, dir)

  if (!parentId) {
    return { error: `'${path}': arquivo ou diretório inexistente` }
  }

  const nameError = validateNewName(fs, parentId, base)

  if (nameError) return { error: nameError }

  return { id: addNode(fs, parentId, base, type, size) }
}

export function runCommand(
  previous: FsState,
  input: string,
): CmdResult {
  const fs = cloneFs(previous)
  const lines: Line[] = []
  const result: CmdResult = { fs, lines }

  const tokens = tokenize(input.trim())

  if (!tokens.length) return result

  const [command, ...rest] = tokens

  const isFlag = (value: string) =>
    value.startsWith('-') && value.length > 1

  const flags = rest.filter(isFlag)
  const args = rest.filter((value) => !isFlag(value))

  switch (command) {
    case 'help': {
      const rows = [
        ['pwd', 'mostra o diretório atual'],
        ['ls [-l] [dir]', 'lista entradas em ordem pela AVL'],
        ['cd <dir>', 'entra em uma pasta; aceita .. e ~'],
        ['mkdir [-p] <nome>', 'cria pastas e insere entradas na AVL'],
        ['touch <nome> [kb]', 'cria arquivos e insere entradas na AVL'],
        ['rm [-rf] <alvo>', 'remove entradas e rebalanceia a AVL'],
        ['mv <origem> <destino>', 'move ou renomeia uma entrada'],
        ['tree [dir]', 'mostra a hierarquia de diretórios'],
        ['find <termo>', 'busca por parte do nome em toda a hierarquia'],
        ['stat [alvo]', 'mostra dados do nó e da AVL'],
        ['clear', 'limpa o terminal'],
      ]

      rows.forEach(([name, description]) => {
        lines.push([
          { text: name.padEnd(24), tone: 'accent' },
          { text: description, tone: 'dim' },
        ])
      })

      break
    }

    case 'pwd':
      lines.push([{ text: pathOf(fs, fs.cwd) }])
      break

    case 'clear':
      result.clear = true
      break

    case 'ls': {
      const target = args[0] ? resolve(fs, args[0]) : fs.cwd

      if (!target) {
        lines.push(err(`ls: '${args[0]}': caminho inexistente`))
        break
      }

      const node = fs.nodes[target]
      const ids = node.type === 'dir' ? node.children : [target]

      if (!ids.length) {
        lines.push(dim('(diretório vazio)'))
        break
      }

      const long = flags.some((flag) => flag.includes('l'))

      if (long) {
        ids.forEach((id) => {
          const child = fs.nodes[id]

          const metadata =
            child.type === 'dir'
              ? `d  ${child.children.length} entradas  `
              : `-  ${child.size} KB  `

          lines.push([
            { text: metadata, tone: 'dim' },
            {
              text: child.name + (child.type === 'dir' ? '/' : ''),
              tone: child.type,
            },
          ])
        })
      } else {
        const line: Line = []

        ids.forEach((id) => {
          const child = fs.nodes[id]

          line.push({
            text: child.name + (child.type === 'dir' ? '/' : ''),
            tone: child.type,
          })

          line.push({ text: '  ' })
        })

        lines.push(line)
      }

      break
    }

    case 'cd': {
      const target = args[0]
        ? resolve(fs, args[0])
        : (homeId(fs) ?? fs.root)

      if (!target) {
        lines.push(err(`cd: '${args[0]}': caminho inexistente`))
      } else if (fs.nodes[target].type !== 'dir') {
        lines.push(err(`cd: '${args[0]}': não é um diretório`))
      } else {
        fs.cwd = target
        result.select = target
      }

      break
    }

    case 'mkdir': {
      if (!args.length) {
        lines.push(err('mkdir: operando ausente'))
        break
      }

      const parents = flags.some((flag) => flag.includes('p'))

      for (const path of args) {
        const created = createAt(fs, path, 'dir', 0, parents)

        if (created.error) {
          lines.push(err(`mkdir: ${created.error}`))
        } else {
          result.select = created.id
        }
      }

      break
    }

    case 'touch': {
      if (!args.length) {
        lines.push(err('touch: operando ausente'))
        break
      }

      let names = args
      let size = 1
      let explicitSize = false

      if (args.length >= 2 && /^\d+$/.test(args[args.length - 1])) {
        size = Math.min(Number(args[args.length - 1]), 99999)
        names = args.slice(0, -1)
        explicitSize = true
      }

      for (const path of names) {
        const existing = resolve(fs, path)

        if (existing) {
          const node = fs.nodes[existing]

          if (node.type !== 'file') {
            lines.push(err(`touch: '${path}' é um diretório`))
          } else {
            if (explicitSize) node.size = size

            result.select = existing
            lines.push(dim(`touch: '${path}' já existe (atualizado)`))
          }

          continue
        }

        const created = createAt(fs, path, 'file', size, false)

        if (created.error) {
          lines.push(err(`touch: ${created.error}`))
        } else {
          result.select = created.id
        }
      }

      break
    }

    case 'rm': {
      if (!args.length) {
        lines.push(err('rm: operando ausente'))
        break
      }

      const recursive = flags.some((flag) => /[rR]/.test(flag))
      const force = flags.some((flag) => flag.includes('f'))

      for (const path of args) {
        if (resolve(fs, path) === fs.root) {
          lines.push(err("rm: não é permitido remover a raiz '/'"))
          continue
        }

        const targets = expandTargets(fs, path)

        if (!targets.length) {
          if (!force) {
            lines.push(err(`rm: '${path}': caminho inexistente`))
          }

          continue
        }

        let count = 0
        let kb = 0

        for (const id of targets) {
          const node = fs.nodes[id]

          if (!node || id === fs.root) continue

          if (node.type === 'dir' && !recursive) {
            lines.push(err(`rm: '${node.name}' é um diretório; use -r`))
            continue
          }

          const removed = removeSubtree(fs, id)
          count += removed.count
          kb += removed.kb
        }

        if (count > 1) {
          lines.push(dim(`${count} nós removidos · ${kb} KB estimados`))
        }
      }

      break
    }

    case 'mv': {
      if (args.length !== 2) {
        lines.push(err('mv: uso: mv <origem> <destino>'))
        break
      }

      const source = resolve(fs, args[0])

      if (!source) {
        lines.push(err(`mv: '${args[0]}': caminho inexistente`))
        break
      }

      if (source === fs.root) {
        lines.push(err("mv: não é permitido mover a raiz '/'"))
        break
      }

      const destination = resolve(fs, args[1])
      const node = fs.nodes[source]

      let newParent: string
      let newName: string

      if (destination && fs.nodes[destination].type === 'dir') {
        newParent = destination
        newName = node.name
      } else if (destination) {
        if (destination === source) {
          result.select = source
          break
        }

        lines.push(err(`mv: '${args[1]}' já existe`))
        break
      } else {
        const { dir, base } = splitPath(args[1])
        const parentId = dir === '' ? fs.cwd : resolve(fs, dir)

        if (!parentId || fs.nodes[parentId].type !== 'dir') {
          lines.push(err(`mv: destino '${args[1]}' inválido`))
          break
        }

        newParent = parentId
        newName = base
      }

      const nameError = validateName(newName)

      if (nameError) {
        lines.push(err(`mv: ${nameError}`))
        break
      }

      if (ancestors(fs, newParent).includes(source)) {
        lines.push(err('mv: não é possível mover uma pasta para dentro de si mesma'))
        break
      }

      const duplicate = childByName(fs, newParent, newName)

      if (duplicate && duplicate !== source) {
        lines.push(err(`mv: '${newName}' já existe no destino`))
        break
      }

      if (node.parent === newParent && node.name === newName) {
        result.select = source
        break
      }

      // Remove a chave antiga antes de alterar nome e pai.
      removeEntry(fs, node.parent!, node.name)
      insertEntry(fs, newParent, newName, source)

      node.parent = newParent
      node.name = newName
      result.select = source

      break
    }

    case 'tree': {
      const target = args[0] ? resolve(fs, args[0]) : fs.cwd

      if (!target) {
        lines.push(err(`tree: '${args[0]}': caminho inexistente`))
        break
      }

      lines.push([
        {
          text: target === fs.root ? '/' : fs.nodes[target].name,
          tone: fs.nodes[target].type,
        },
      ])

      function visit(id: string, prefix: string): void {
        const children = childrenOf(fs, id)

        children.forEach((childId, index) => {
          const last = index === children.length - 1
          const child = fs.nodes[childId]

          lines.push([
            { text: prefix + (last ? '└── ' : '├── '), tone: 'dim' },
            { text: child.name, tone: child.type },
          ])

          visit(childId, prefix + (last ? '    ' : '│   '))
        })
      }

      visit(target, '')
      lines.push(dim(`${listDfs(fs, target).length} nós`))

      break
    }

    case 'find': {
      const term = args.join(' ')

      if (!term) {
        lines.push(err('find: uso: find <termo>'))
        break
      }

      const matches = findNodes(fs, term)

      if (!matches.length) {
        lines.push(err(`find: nenhum resultado para '${term}'`))
      } else {
        matches.forEach((id) => {
          lines.push([
            { text: pathOf(fs, id), tone: fs.nodes[id].type },
          ])
        })

        lines.push(dim(`${matches.length} resultado(s)`))
        result.highlight = matches
        result.select = matches[0]
      }

      break
    }

    case 'stat': {
      const target = args[0] ? resolve(fs, args[0]) : fs.cwd

      if (!target) {
        lines.push(err(`stat: '${args[0]}': caminho inexistente`))
        break
      }

      const node = fs.nodes[target]

      const row = (label: string, value: string) => {
        lines.push([
          { text: label.padEnd(14), tone: 'dim' },
          { text: value },
        ])
      }

      row('ID', node.id)
      row('nome', node.name)
      row('tipo', node.type === 'dir' ? 'pasta' : 'arquivo')
      row('pai', node.parent ?? 'NULL')
      row('caminho', pathOf(fs, target))

      if (node.type === 'dir') {
        row('entradas', String(node.children.length))
        row('AVL raiz', node.entries?.key ?? 'NULL')
        row('AVL altura', String(avlHeight(node.entries)))
        row('AVL FB', String(balanceFactor(node.entries)))
      } else {
        row('tamanho', `${node.size} KB`)
      }

      result.select = target
      break
    }

    default:
      lines.push(err(`bash: ${command}: comando não encontrado; digite help`))
  }

  return result
}

export function createInitialSession(): {
  fs: FsState
  history: HistoryEntry[]
} {
  let fs = createFs()

  const setup = [
    'mkdir home etc var tmp usr',
    'mkdir -p home/usuario',
    'touch home/usuario/notas.txt 12',
    'touch etc/hosts 2',
    'touch var/app.log 48',
    'touch tmp/cache.bin 6',
  ]

  for (const command of setup) {
    fs = runCommand(fs, command).fs
  }

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
      lines: [
        dim('memfs · sistema de arquivos com AVL por diretório · digite help'),
      ],
    },
  ]

  visible.forEach((command, index) => {
    const result = runCommand(fs, command)
    fs = result.fs

    history.push({
      id: index + 1,
      cmd: command,
      lines: result.lines,
    })
  })

  return { fs, history }
}