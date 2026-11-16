import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, CornerLeftUp, Folder, ScanSearch } from 'lucide-react'
import { depthOf, pathOf, type FsState } from '../lib/fs'
import { FileIcon } from './Explorer'

interface Props {
  fs: FsState
  nodeId: string
  open: boolean
  onToggle: () => void
  onSelect: (id: string) => void
  onCd: (id: string) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/[0.05] px-3 py-2 last:border-0">
      <div className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-zinc-500 uppercase">{label}</div>
      {children}
    </div>
  )
}

export function Inspector({ fs, nodeId, open, onToggle, onSelect, onCd }: Props) {
  const [copied, setCopied] = useState(false)
  const node = fs.nodes[nodeId]
  if (!node) return null
  const isDir = node.type === 'dir'
  const parent = node.parent ? fs.nodes[node.parent] : null

  const copy = () => {
    navigator.clipboard?.writeText(node.id).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <aside
      data-nopan
      aria-label="Inspeção de Nó"
      className="absolute top-3 right-3 z-10 w-[296px] cursor-default overflow-hidden rounded-xl border border-white/[0.1] bg-[#0e0e13]/90 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md"
    >
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2 border-b border-white/[0.07] px-3 py-2.5 text-left hover:bg-white/[0.03]"
      >
        <ScanSearch className="size-4 text-violet-400" />
        <span className="text-[13px] font-semibold text-zinc-100">Inspeção de Nó</span>
        <span className="ml-auto font-mono text-[10.5px] text-zinc-500">struct Node</span>
        {open ? <ChevronUp className="size-4 text-zinc-500" /> : <ChevronDown className="size-4 text-zinc-500" />}
      </button>

      {open && (
        <div className="fade-up max-h-[calc(100vh-260px)] overflow-y-auto">
          <Row label="ID do Ponteiro">
            <div className="flex items-center justify-between gap-2">
              <code className="rounded bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[13px] text-cyan-300">{node.id}</code>
              <button
                onClick={copy}
                title="Copiar ponteiro"
                className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-200"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </Row>

          <Row label="Nome">
            <div className="flex items-center gap-2">
              {isDir ? <Folder className="size-4 text-sky-400" /> : <FileIcon node={node} />}
              <span className="font-mono text-[13px] text-zinc-100">"{node.name}"</span>
            </div>
          </Row>

          <Row label="Tipo">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  isDir
                    ? 'border-blue-400/30 bg-blue-500/15 text-blue-300'
                    : 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                }`}
              >
                {isDir ? 'Pasta' : 'Arquivo'}
              </span>
              <span className="font-mono text-[11px] text-zinc-500">
                {isDir ? 'nó interno' : `nó folha · ${node.size} KB`}
              </span>
            </div>
          </Row>

          <Row label="Ponteiro para o Pai (parent)">
            {parent ? (
              <button
                onClick={() => onSelect(parent.id)}
                className="group flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-white/[0.06]"
              >
                <CornerLeftUp className="size-3.5 text-zinc-500 group-hover:text-cyan-300" />
                <code className="font-mono text-[12.5px] text-violet-300">{parent.id}</code>
                <span className="truncate font-mono text-[11px] text-zinc-500">// {parent.name}</span>
              </button>
            ) : (
              <div className="px-1.5 font-mono text-[12.5px]">
                <span className="text-rose-300">NULL</span> <span className="text-[11px] text-zinc-500">// raiz</span>
              </div>
            )}
          </Row>

          <Row label={`Children[] (${node.children.length})`}>
            {!isDir ? (
              <div className="px-1.5 font-mono text-[12.5px]">
                <span className="text-rose-300">NULL</span> <span className="text-[11px] text-zinc-500">// folha</span>
              </div>
            ) : node.children.length === 0 ? (
              <div className="px-1.5 font-mono text-[12.5px] text-zinc-400">
                [ ] <span className="text-[11px] text-zinc-500">// vazio</span>
              </div>
            ) : (
              <div className="font-mono text-[12px]">
                <div className="px-1.5 text-zinc-600">[</div>
                {node.children.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => onSelect(c)}
                    className="group flex w-full cursor-pointer items-center gap-2 rounded py-0.5 pr-1.5 pl-4 text-left hover:bg-white/[0.06]"
                  >
                    <span className="w-4 text-zinc-600">{i}</span>
                    <span className="text-cyan-300">{c}</span>
                    <span className="truncate text-[11px] text-zinc-500 group-hover:text-zinc-300">
                      {fs.nodes[c].name}
                      {fs.nodes[c].type === 'dir' ? '/' : ''}
                    </span>
                  </button>
                ))}
                <div className="px-1.5 text-zinc-600">]</div>
              </div>
            )}
          </Row>

          <div className="flex items-center justify-between gap-2 bg-black/30 px-3 py-2">
            <div className="min-w-0 font-mono text-[10.5px] text-zinc-500">
              <div className="truncate">{pathOf(fs, node.id)}</div>
              <div>profundidade {depthOf(fs, node.id)}</div>
            </div>
            {isDir && fs.cwd !== node.id && (
              <button
                onClick={() => onCd(node.id)}
                className="shrink-0 cursor-pointer rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 font-mono text-[11px] text-cyan-200 hover:bg-cyan-400/20"
              >
                cd aqui
              </button>
            )}
            {isDir && fs.cwd === node.id && (
              <span className="shrink-0 rounded-md bg-cyan-400/10 px-2 py-1 font-mono text-[11px] text-cyan-300">cwd</span>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
