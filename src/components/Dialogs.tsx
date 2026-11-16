import { useEffect, useMemo, useRef, useState } from 'react'
import { FilePlus, FolderPlus, Search, TriangleAlert, X } from 'lucide-react'
import {
  computeStats,
  findNodes,
  formatKb,
  pathOf,
  validateNewName,
  type FsState,
} from '../lib/fs'
import { FileIcon } from './Explorer'
import { Folder } from 'lucide-react'

function Modal({
  onClose,
  children,
  top = false,
}: {
  onClose: () => void
  children: React.ReactNode
  top?: boolean
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/60 px-4 backdrop-blur-[3px] ${top ? 'items-start pt-[14vh]' : 'items-center'}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fade-up w-full max-w-md overflow-hidden rounded-xl border border-white/[0.12] bg-[#0f0f14] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.9)]">
        {children}
      </div>
    </div>
  )
}

function Title({ icon, title, cmd, onClose }: { icon: React.ReactNode; title: string; cmd: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
      {icon}
      <span className="text-sm font-semibold text-zinc-100">{title}</span>
      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">{cmd}</code>
      <button onClick={onClose} className="ml-auto cursor-pointer rounded p-1 text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-200">
        <X className="size-4" />
      </button>
    </div>
  )
}

export function CreateDialog({
  kind,
  fs,
  onClose,
  onSubmit,
}: {
  kind: 'dir' | 'file'
  fs: FsState
  onClose: () => void
  onSubmit: (name: string, size: number) => void
}) {
  const [name, setName] = useState('')
  const [size, setSize] = useState('4')
  const [touched, setTouched] = useState(false)
  const isDir = kind === 'dir'
  const error = validateNewName(fs, fs.cwd, name.trim())
  const submit = () => {
    setTouched(true)
    if (error) return
    onSubmit(name.trim(), Math.max(0, parseInt(size, 10) || 0))
  }
  return (
    <Modal onClose={onClose}>
      <Title
        icon={isDir ? <FolderPlus className="size-4 text-sky-400" /> : <FilePlus className="size-4 text-emerald-400" />}
        title={isDir ? 'Nova Pasta' : 'Novo Arquivo'}
        cmd={isDir ? 'mkdir' : 'touch'}
        onClose={onClose}
      />
      <form
        className="space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="text-xs text-zinc-500">
          Será criado como filho de{' '}
          <code className="font-mono text-cyan-300">{pathOf(fs, fs.cwd)}</code>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-400">Nome</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setTouched(true)
            }}
            placeholder={isDir ? 'projetos' : 'index.ts'}
            spellCheck={false}
            className={`h-9 w-full rounded-md border bg-black/50 px-3 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-2 ${
              touched && error ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-white/10 focus:border-blue-400/60 focus:ring-blue-500/20'
            }`}
          />
          {touched && error && name !== '' && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
        </label>
        {!isDir && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">Tamanho (KB)</span>
            <input
              type="number"
              min={0}
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="h-9 w-32 rounded-md border border-white/10 bg-black/50 px-3 font-mono text-sm text-zinc-100 outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
        )}
        <div className="rounded-md bg-black/40 px-3 py-2 font-mono text-xs text-zinc-400">
          <span className="text-emerald-400">$</span> {isDir ? 'mkdir' : 'touch'} {name.trim() || '<nome>'}
          {!isDir ? ` ${parseInt(size, 10) || 0}` : ''}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-8 cursor-pointer rounded-md px-3 text-sm text-zinc-300 hover:bg-white/[0.06]">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!!error}
            className="h-8 cursor-pointer rounded-md bg-gradient-to-b from-blue-500 to-indigo-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Criar nó
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function FindDialog({
  fs,
  onClose,
  onRun,
  onPick,
}: {
  fs: FsState
  onClose: () => void
  onRun: (term: string) => void
  onPick: (id: string) => void
}) {
  const [term, setTerm] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const hits = useMemo(() => findNodes(fs, term), [fs, term])
  return (
    <Modal onClose={onClose} top>
      <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
        <Search className="size-4 text-amber-300" />
        <span className="font-mono text-sm text-emerald-400">find</span>
        <input
          ref={ref}
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && term.trim()) onRun(term.trim())
          }}
          placeholder="nome do nó (ex: main, log, proj)"
          spellCheck={false}
          className="h-7 min-w-0 flex-1 bg-transparent font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <kbd className="rounded border border-white/10 px-1.5 font-mono text-[10px] text-zinc-500">esc</kbd>
      </div>
      <div className="max-h-72 overflow-y-auto p-1.5">
        {!term.trim() ? (
          <div className="px-3 py-6 text-center text-xs text-zinc-500">Digite para buscar em toda a árvore</div>
        ) : hits.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-zinc-500">Nenhum nó encontrado</div>
        ) : (
          hits.slice(0, 20).map((id) => {
            const n = fs.nodes[id]
            return (
              <button
                key={id}
                onClick={() => onPick(id)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-white/[0.07]"
              >
                {n.type === 'dir' ? <Folder className="size-4 text-sky-400" /> : <FileIcon node={n} />}
                <span className="text-sm text-zinc-100">{n.name}</span>
                <span className="ml-auto truncate font-mono text-[11px] text-zinc-500">{pathOf(fs, id)}</span>
              </button>
            )
          })
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.07] bg-black/30 px-4 py-2 text-[11px] text-zinc-500">
        <span>{term.trim() ? `${hits.length} resultado(s)` : 'Busca em profundidade (DFS) a partir de /'}</span>
        <span>
          <kbd className="rounded border border-white/10 px-1 font-mono">Enter</kbd> destacar no canvas
        </span>
      </div>
    </Modal>
  )
}

export function ClearDialog({ fs, onClose, onConfirm }: { fs: FsState; onClose: () => void; onConfirm: () => void }) {
  const s = computeStats(fs)
  return (
    <Modal onClose={onClose}>
      <Title icon={<TriangleAlert className="size-4 text-rose-400" />} title="Limpar Memória" cmd="rm -rf /*" onClose={onClose} />
      <div className="space-y-3 p-4">
        <p className="text-sm leading-relaxed text-zinc-300">
          Todos os nós abaixo da raiz serão desalocados e o ponteiro atual voltará para <code className="font-mono text-cyan-300">/</code>.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Nós', String(s.total - 1)],
            ['Arquivos', String(s.files)],
            ['Memória', formatKb(s.memoryKb - 2)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2">
              <div className="text-[10px] tracking-wide text-rose-300/70 uppercase">{k}</div>
              <div className="font-mono text-base font-semibold text-rose-200">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-8 cursor-pointer rounded-md px-3 text-sm text-zinc-300 hover:bg-white/[0.06]">
            Cancelar
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className="h-8 cursor-pointer rounded-md bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-500"
          >
            Limpar tudo
          </button>
        </div>
      </div>
    </Modal>
  )
}
