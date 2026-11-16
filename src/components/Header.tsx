import { useEffect, useRef } from 'react'
import {
  ArrowDownToLine,
  Boxes,
  ChevronRight,
  FilePlus,
  FolderPlus,
  GitFork,
  HardDrive,
  MemoryStick,
  Network,
  Search,
  Trash2,
} from 'lucide-react'
import { ancestors, computeStats, formatKb, type FsState } from '../lib/fs'

interface Props {
  fs: FsState
  onCd: (id: string) => void
  onMkdir: () => void
  onTouch: () => void
  onFind: () => void
  onClear: () => void
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] py-1 pr-2.5 pl-2 text-xs">
      <span className={`flex size-5 items-center justify-center rounded ${tone}`}>{icon}</span>
      <span className="text-zinc-400">{label}:</span>
      <span key={String(value)} className="tick font-mono font-semibold text-zinc-50">
        {value}
      </span>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  hint,
  onClick,
  variant = 'ghost',
}: {
  icon: React.ReactNode
  label: string
  hint: string
  onClick: () => void
  variant?: 'primary' | 'ghost' | 'danger'
}) {
  const styles = {
    primary:
      'bg-gradient-to-b from-blue-500 to-indigo-600 text-white border-blue-400/40 shadow-[0_0_20px_-4px_rgba(59,130,246,0.6)] hover:from-blue-400 hover:to-indigo-500',
    ghost: 'bg-white/[0.04] text-zinc-200 border-white/[0.09] hover:bg-white/[0.08] hover:border-white/20',
    danger:
      'bg-rose-500/[0.08] text-rose-300 border-rose-500/25 hover:bg-rose-500/15 hover:border-rose-400/50',
  }[variant]
  return (
    <button
      onClick={onClick}
      className={`group flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${styles}`}
    >
      {icon}
      <span>{label}</span>
      <span className="hidden font-mono text-[11px] opacity-60 xl:inline">({hint})</span>
    </button>
  )
}

export function Header({ fs, onCd, onMkdir, onTouch, onFind, onClear }: Props) {
  const stats = computeStats(fs)
  const crumbs = ancestors(fs, fs.cwd)
  const crumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = crumbRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [fs.cwd])

  return (
    <header className="shrink-0 border-b border-white/[0.07] bg-[#0b0b0f]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_18px_-2px_rgba(99,102,241,0.7)]">
            <Network className="size-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-zinc-50">memfs</div>
            <div className="text-[11px] text-zinc-500">Árvore N-ária em memória</div>
          </div>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" />

        <nav
          aria-label="Caminho atual"
          className="flex min-w-0 flex-1 basis-64 items-center gap-2.5 rounded-md border border-white/[0.08] bg-black/40 py-1 pr-2 pl-1"
        >
          <span className="flex shrink-0 items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-400">
            $ pwd
          </span>
          <div ref={crumbRef} className="no-scrollbar flex min-w-0 items-center overflow-x-auto">
            {crumbs.map((id, i) => {
              const last = i === crumbs.length - 1
              const name = fs.nodes[id].name
              return (
                <div key={id} className="flex shrink-0 items-center">
                  {i > 0 && <ChevronRight className="mx-0.5 size-3.5 text-zinc-600" />}
                  <button
                    onClick={() => onCd(id)}
                    className={`cursor-pointer rounded px-1.5 py-0.5 font-mono text-[13px] transition-colors ${
                      last
                        ? 'bg-cyan-400/10 font-semibold text-cyan-300'
                        : 'text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-100'
                    }`}
                  >
                    {name}
                  </button>
                </div>
              )
            })}
          </div>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            variant="primary"
            icon={<FolderPlus className="size-4" />}
            label="Nova Pasta"
            hint="mkdir"
            onClick={onMkdir}
          />
          <ActionButton
            icon={<FilePlus className="size-4" />}
            label="Novo Arquivo"
            hint="touch"
            onClick={onTouch}
          />
          <ActionButton
            icon={<Search className="size-4" />}
            label="Buscar Nó"
            hint="find"
            onClick={onFind}
          />
          <ActionButton
            variant="danger"
            icon={<Trash2 className="size-4" />}
            label="Limpar Memória"
            hint="rm -rf"
            onClick={onClear}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.05] bg-black/20 px-4 py-2">
        <Metric
          icon={<Boxes className="size-3.5" />}
          tone="bg-blue-500/15 text-blue-400"
          label="Total de Nós"
          value={stats.total}
        />
        <Metric
          icon={<ArrowDownToLine className="size-3.5" />}
          tone="bg-violet-500/15 text-violet-400"
          label="Altura da Árvore"
          value={stats.height}
        />
        <Metric
          icon={<GitFork className="size-3.5" />}
          tone="bg-cyan-500/15 text-cyan-400"
          label="Grau Máximo"
          value={stats.maxDegree}
        />
        <Metric
          icon={<MemoryStick className="size-3.5" />}
          tone="bg-emerald-500/15 text-emerald-400"
          label="Uso de Memória"
          value={formatKb(stats.memoryKb)}
        />
        <div className="ml-auto hidden items-center gap-1.5 text-[11px] text-zinc-500 md:flex">
          <HardDrive className="size-3.5" />
          {stats.dirs} pastas · {stats.files} arquivos (folhas)
        </div>
      </div>
    </header>
  )
}
