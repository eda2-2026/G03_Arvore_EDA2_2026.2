import { ChevronDown, ChevronRight, File, FileCode, FileText, Folder, FolderOpen, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { fileKind, pathOf, type FsNode, type FsState } from '../lib/fs'

interface Props {
  fs: FsState
  expanded: Set<string>
  selected: string
  highlight: string[]
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onCd: (path: string) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function FileIcon({ node, className = 'size-4' }: { node: FsNode; className?: string }) {
  const k = fileKind(node.name)
  if (k === 'code') return <FileCode className={`${className} text-emerald-400`} />
  if (k === 'text') return <FileText className={`${className} text-zinc-400`} />
  return <File className={`${className} text-zinc-500`} />
}

const INDENT = 14

export function Explorer(props: Props) {
  const { fs, expanded, selected, highlight, onToggle, onSelect, onCd } = props

  const renderNode = (id: string, depth: number) => {
    const n = fs.nodes[id]
    const isDir = n.type === 'dir'
    const open = isDir && expanded.has(id)
    const isCwd = fs.cwd === id
    const isSel = selected === id
    const found = highlight.includes(id)
    const sorted = isDir
      ? [...n.children].sort((a, b) => {
          const x = fs.nodes[a]
          const y = fs.nodes[b]
          if (x.type !== y.type) return x.type === 'dir' ? -1 : 1
          return x.name.localeCompare(y.name)
        })
      : []
    const violet = depth % 2 === 0 && depth > 0
    return (
      <div key={id}>
        <div
          role="treeitem"
          aria-expanded={isDir ? open : undefined}
          aria-selected={isCwd}
          onClick={() => {
            onSelect(id)
            if (isDir) onCd(pathOf(fs, id))
          }}
          className={`group relative flex h-[26px] cursor-pointer items-center gap-1.5 pr-3 text-[13px] ${
            isCwd
              ? 'bg-blue-500/[0.14] text-white'
              : isSel
                ? 'bg-white/[0.07] text-zinc-100'
                : 'text-zinc-300 hover:bg-white/[0.04]'
          }`}
          style={{ paddingLeft: depth * INDENT + 6 }}
        >
          {isCwd && <span className="absolute inset-y-0 left-0 w-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />}
          {Array.from({ length: depth }).map((_, i) => (
            <span
              key={i}
              className="pointer-events-none absolute inset-y-0 w-px bg-white/[0.06]"
              style={{ left: i * INDENT + 13 }}
            />
          ))}
          <span
            className="flex size-4 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-200"
            onClick={(e) => {
              if (!isDir) return
              e.stopPropagation()
              onToggle(id)
            }}
          >
            {isDir && (open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />)}
          </span>
          {isDir ? (
            open ? (
              <FolderOpen className={`size-4 shrink-0 ${violet ? 'text-violet-400' : 'text-sky-400'}`} />
            ) : (
              <Folder className={`size-4 shrink-0 ${violet ? 'text-violet-400' : 'text-sky-400'}`} />
            )
          ) : (
            <FileIcon node={n} className="size-4 shrink-0" />
          )}
          <span className={`truncate ${found ? 'rounded bg-amber-400/20 px-1 text-amber-200' : ''}`}>
            {n.name}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10.5px]">
            {isCwd && <span className="rounded bg-cyan-400/15 px-1 text-cyan-300">cwd</span>}
            <span className="text-zinc-600">{isDir ? n.children.length : `${n.size}K`}</span>
          </span>
        </div>
        {open && <div role="group">{sorted.map((c) => renderNode(c, depth + 1))}</div>}
      </div>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-400">EXPLORER</span>
        <div className="flex items-center gap-0.5 text-zinc-500">
          <button
            title="Expandir tudo"
            onClick={props.onExpandAll}
            className="cursor-pointer rounded p-1 hover:bg-white/[0.07] hover:text-zinc-200"
          >
            <ChevronsUpDown className="size-3.5" />
          </button>
          <button
            title="Recolher tudo"
            onClick={props.onCollapseAll}
            className="cursor-pointer rounded p-1 hover:bg-white/[0.07] hover:text-zinc-200"
          >
            <ChevronsDownUp className="size-3.5" />
          </button>
        </div>
      </div>
      <div role="tree" className="min-h-0 flex-1 overflow-y-auto pb-2">
        {renderNode(fs.root, 0)}
      </div>
    </section>
  )
}
