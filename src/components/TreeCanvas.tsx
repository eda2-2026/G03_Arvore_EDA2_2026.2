import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Folder, FolderOpen, Minus, Plus, Search, X } from 'lucide-react'
import { ancestors, fileKind, type FsNode, type FsState } from '../lib/fs'
import { FileIcon } from './Explorer'

const NODE_W = 168
const NODE_H = 64
const GAP_X = 20
const GAP_Y = 88

interface Props {
  fs: FsState
  selected: string
  highlight: string[]
  rightInset: number
  onSelect: (id: string) => void
  onCd: (id: string) => void
  onClearHighlight: () => void
}

interface Layout {
  pos: Record<string, { x: number; y: number; depth: number }>
  w: number
  h: number
}

function layoutTree(fs: FsState): Layout {
  // Layout por contornos: cada subárvore é encaixada ao lado da anterior
  // com a menor distância que não gera sobreposição em nenhuma profundidade.
  const STEP = NODE_W + GAP_X
  interface Sub {
    rel: Record<string, number> // x do nó relativo ao pai da subárvore
    lo: number[]
    hi: number[]
  }
  const build = (id: string): Sub => {
    const kids = fs.nodes[id].children.map(build)
    if (!kids.length) return { rel: { [id]: 0 }, lo: [0], hi: [0] }
    const offsets: number[] = []
    const accLo: number[] = []
    const accHi: number[] = []
    kids.forEach((k, i) => {
      let off = 0
      if (i > 0) {
        off = -Infinity
        for (let d = 0; d < Math.min(k.lo.length, accHi.length); d++) off = Math.max(off, accHi[d] - k.lo[d] + STEP)
      }
      offsets.push(off)
      k.lo.forEach((v, d) => {
        accLo[d] = d < accLo.length ? Math.min(accLo[d], v + off) : v + off
        accHi[d] = d < accHi.length ? Math.max(accHi[d], k.hi[d] + off) : k.hi[d] + off
      })
    })
    const center = (offsets[0] + offsets[offsets.length - 1]) / 2
    const rel: Record<string, number> = { [id]: 0 }
    kids.forEach((k, i) => {
      for (const kid of Object.keys(k.rel)) rel[kid] = k.rel[kid] + offsets[i] - center
    })
    return {
      rel,
      lo: [0, ...accLo.map((v) => v - center)],
      hi: [0, ...accHi.map((v) => v - center)],
    }
  }
  const tree = build(fs.root)
  const minX = Math.min(...Object.values(tree.rel))
  const maxX = Math.max(...Object.values(tree.rel))
  const pos: Layout['pos'] = {}
  let maxDepth = 0
  const place = (id: string, depth: number) => {
    maxDepth = Math.max(maxDepth, depth)
    pos[id] = { x: tree.rel[id] - minX, y: depth * (NODE_H + GAP_Y), depth }
    fs.nodes[id].children.forEach((c) => place(c, depth + 1))
  }
  place(fs.root, 0)
  return { pos, w: maxX - minX + NODE_W, h: (maxDepth + 1) * (NODE_H + GAP_Y) - GAP_Y }
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function NodeCard({
  node,
  depth,
  isRoot,
  isCwd,
  onPath,
  isSelected,
  isFound,
  isOpen,
}: {
  node: FsNode
  depth: number
  isRoot: boolean
  isCwd: boolean
  onPath: boolean
  isSelected: boolean
  isFound: boolean
  isOpen: boolean
}) {
  const isDir = node.type === 'dir'
  let ring: string
  let body: string
  let iconBox: string
  if (isDir) {
    const violet = depth % 2 === 0 && !isRoot
    ring = violet ? 'from-violet-400/70 to-fuchsia-600/40' : 'from-sky-400/70 to-blue-600/50'
    body = violet ? 'bg-[#140f25]' : 'bg-[#0c1426]'
    iconBox = violet ? 'bg-violet-500/20 text-violet-300' : 'bg-blue-500/20 text-sky-300'
  } else if (fileKind(node.name) === 'code') {
    ring = 'from-emerald-400/60 to-emerald-700/30'
    body = 'bg-[#0b1713]'
    iconBox = 'bg-emerald-500/15'
  } else {
    ring = 'from-zinc-400/40 to-zinc-700/30'
    body = 'bg-[#141416]'
    iconBox = 'bg-zinc-500/15'
  }
  const Icon = isOpen ? FolderOpen : Folder
  return (
    <div className="node-pop relative" style={{ width: NODE_W, height: NODE_H }}>
      {isCwd && (
        <div className="absolute -top-[26px] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-cyan-400/50 bg-cyan-400/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide whitespace-nowrap text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.35)]">
          <Crosshair className="size-3" /> CWD
        </div>
      )}
      <div
        className={`h-full rounded-xl bg-gradient-to-br p-px ${ring} ${isCwd ? 'node-current' : ''} ${
          isFound ? 'node-found' : isSelected ? 'node-selected' : ''
        } ${onPath && !isCwd ? 'shadow-[0_0_18px_-4px_rgba(34,211,238,0.5)]' : ''}`}
      >
        <div className={`flex h-full items-center gap-2.5 rounded-[11px] px-3 ${body}`}>
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBox}`}>
            {isDir ? (
              <Icon className={`size-[18px] ${depth % 2 === 0 && !isRoot ? 'text-violet-300' : 'text-sky-300'}`} />
            ) : (
              <FileIcon node={node} className="size-[18px]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] leading-tight font-semibold text-zinc-50">{node.name}</div>
            <div className="mt-0.5 font-mono text-[10.5px] text-zinc-400">
              {isDir ? (
                `${node.children.length} ${node.children.length === 1 ? 'filho' : 'filhos'}`
              ) : (
                <>
                  {node.size} KB <span className="text-zinc-600">·</span>{' '}
                  <span className="text-emerald-400/80">folha</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {isDir && (
        <div className="absolute -top-2 -right-2 flex size-[22px] items-center justify-center rounded-full border border-white/20 bg-[#1b1b24] font-mono text-[11px] font-semibold text-zinc-100 shadow-md">
          {node.children.length}
        </div>
      )}
    </div>
  )
}

export function TreeCanvas({ fs, selected, highlight, rightInset, onSelect, onCd, onClearHighlight }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [auto, setAuto] = useState(true)
  const [animate, setAnimate] = useState(false)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null)

  const layout = useMemo(() => layoutTree(fs), [fs.nodes])
  const cwdPath = useMemo(() => new Set(ancestors(fs, fs.cwd)), [fs.nodes, fs.cwd])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const fit = useCallback(() => {
    const inset = { t: 84, r: size.w > 900 ? rightInset : 40, b: 90, l: 40 }
    const aw = Math.max(size.w - inset.l - inset.r, 100)
    const ah = Math.max(size.h - inset.t - inset.b, 100)
    const k = clamp(Math.min(aw / layout.w, ah / layout.h), 0.35, 1)
    return {
      k,
      x: inset.l + (aw - layout.w * k) / 2,
      y: inset.t + Math.max((ah - layout.h * k) / 2, 0),
    }
  }, [size, layout.w, layout.h, rightInset])

  useEffect(() => {
    if (auto && size.w) setView(fit())
  }, [auto, fit, size.w])

  // wheel zoom (listener não-passivo para poder impedir o scroll da página)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      setAnimate(false)
      setAuto(false)
      setView((v) => {
        const k = clamp(v.k * Math.exp(-e.deltaY * 0.0015), 0.25, 1.8)
        const q = k / v.k
        return { k, x: mx - (mx - v.x) * q, y: my - (my - v.y) * q }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (f: number) => {
    setAnimate(true)
    setAuto(false)
    setView((v) => {
      const k = clamp(v.k * f, 0.25, 1.8)
      const mx = size.w / 2
      const my = size.h / 2
      const q = k / v.k
      return { k, x: mx - (mx - v.x) * q, y: my - (my - v.y) * q }
    })
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-node],[data-nopan]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    setAnimate(false)
    setAuto(false)
    setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }))
  }
  const endDrag = () => {
    drag.current = null
    setDragging(false)
  }

  const edges: { id: string; d: string; active: boolean }[] = []
  for (const id of Object.keys(fs.nodes)) {
    const n = fs.nodes[id]
    if (!n.parent) continue
    const p = layout.pos[n.parent]
    const c = layout.pos[id]
    if (!p || !c) continue
    const x1 = p.x + NODE_W / 2
    const y1 = p.y + NODE_H
    const x2 = c.x + NODE_W / 2
    const y2 = c.y
    const dy = (y2 - y1) * 0.55
    edges.push({
      id,
      d: `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`,
      active: cwdPath.has(id),
    })
  }
  edges.sort((a, b) => Number(a.active) - Number(b.active))

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`relative h-full w-full overflow-hidden bg-[#09090c] select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(161,161,180,0.22) 1px, transparent 1.3px)',
        backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 40% 30%, rgba(79,70,229,0.10), transparent 70%), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(14,165,233,0.07), transparent 70%)',
        }}
      />

      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: layout.w,
          height: layout.h,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          transition: animate ? 'transform 0.45s cubic-bezier(0.2,0.8,0.2,1)' : 'none',
        }}
      >
        <svg
          width={layout.w}
          height={layout.h}
          className="pointer-events-none absolute top-0 left-0"
          style={{ overflow: 'visible' }}
        >
          {edges.map((e) => (
            <path
              key={e.id}
              d={e.d}
              style={{ d: `path("${e.d}")`, transition: 'd 0.5s cubic-bezier(0.2,0.8,0.2,1)' } as React.CSSProperties}
              fill="none"
              stroke={e.active ? '#22d3ee' : '#3a3f5c'}
              strokeWidth={e.active ? 2 : 1.5}
              className={e.active ? 'edge-active' : ''}
            />
          ))}
          {edges.map((e) => {
            const n = fs.nodes[e.id]
            const p = layout.pos[n.parent!]
            const c = layout.pos[e.id]
            const col = e.active ? '#22d3ee' : '#5a6082'
            return (
              <g key={'p' + e.id} fill={col}>
                <circle cx={p.x + NODE_W / 2} cy={p.y + NODE_H} r={3} />
                <circle cx={c.x + NODE_W / 2} cy={c.y} r={3} />
              </g>
            )
          })}
        </svg>

        {Object.keys(fs.nodes).map((id) => {
          const n = fs.nodes[id]
          const p = layout.pos[id]
          if (!p) return null
          return (
            <div
              key={id}
              data-node
              onClick={() => onSelect(id)}
              onDoubleClick={() => n.type === 'dir' && onCd(id)}
              title={n.type === 'dir' ? 'Clique: inspecionar · Duplo clique: cd' : 'Clique: inspecionar'}
              className="absolute top-0 left-0 cursor-pointer"
              style={{
                transform: `translate(${p.x}px, ${p.y}px)`,
                transition: 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1)',
                zIndex: fs.cwd === id ? 3 : selected === id ? 2 : 1,
              }}
            >
              <NodeCard
                node={n}
                depth={p.depth}
                isRoot={id === fs.root}
                isCwd={fs.cwd === id}
                onPath={cwdPath.has(id)}
                isSelected={selected === id}
                isFound={highlight.includes(id)}
                isOpen={cwdPath.has(id)}
              />
            </div>
          )
        })}
      </div>

      {/* overlays */}
      <div data-nopan className="absolute top-3 left-4 flex items-center gap-2">
        <div className="rounded-md border border-white/[0.08] bg-black/50 px-2.5 py-1.5 backdrop-blur">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-zinc-300">TREE VISUALIZER</div>
          <div className="font-mono text-[10.5px] text-zinc-500">árvore N-ária · tempo real</div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> live
        </span>
      </div>

      {highlight.length > 0 && (
        <div
          data-nopan
          className="fade-up absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 py-1 pr-1.5 pl-3 text-xs text-amber-200 backdrop-blur"
          style={{ marginLeft: -rightInset / 2 }}
        >
          <Search className="size-3.5" />
          {highlight.length} {highlight.length === 1 ? 'nó encontrado' : 'nós encontrados'}
          <button
            onClick={onClearHighlight}
            className="cursor-pointer rounded-full p-1 hover:bg-amber-400/20"
            aria-label="Limpar busca"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <div data-nopan className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border border-white/[0.08] bg-black/60 p-1 backdrop-blur">
        <button onClick={() => zoomBy(1 / 1.25)} className="cursor-pointer rounded p-1.5 text-zinc-300 hover:bg-white/[0.08]" aria-label="Diminuir zoom">
          <Minus className="size-4" />
        </button>
        <span className="w-11 text-center font-mono text-[11px] text-zinc-400">{Math.round(view.k * 100)}%</span>
        <button onClick={() => zoomBy(1.25)} className="cursor-pointer rounded p-1.5 text-zinc-300 hover:bg-white/[0.08]" aria-label="Aumentar zoom">
          <Plus className="size-4" />
        </button>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button
          onClick={() => {
            setAnimate(true)
            setAuto(true)
            setView(fit())
          }}
          className="cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.08]"
        >
          Ajustar
        </button>
      </div>

      <div
        data-nopan
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-3.5 rounded-lg border border-white/[0.08] bg-black/60 px-3 py-2 text-[11px] text-zinc-400 backdrop-blur lg:flex"
        style={{ marginLeft: -rightInset / 2 + 60 }}
      >
        <Legend color="bg-gradient-to-br from-sky-400 to-violet-500" label="Pasta" />
        <Legend color="bg-gradient-to-br from-emerald-400 to-zinc-500" label="Arquivo (folha)" />
        <Legend color="bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]" label="Ponteiro atual" />
        <Legend color="border-2 border-white/80" label="Selecionado" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  )
}
