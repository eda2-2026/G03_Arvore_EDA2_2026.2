
import { useMemo, useState } from 'react'
import {
  avlHeight,
  avlInOrder,
  avlSearch,
  balanceFactor,
  type AvlNode,
} from '../lib/avl'
import { pathOf, type FsState } from '../lib/fs'

interface Props {
  fs: FsState
  directoryId: string
  selected: string
  highlight: string[]
  onSelect: (id: string) => void
  onCd: (id: string) => void
}

const CARD_W = 164
const CARD_H = 88
const STEP_X = 190
const STEP_Y = 140

function layoutAvl(root: AvlNode | null) {
  const positions = new Map<string, { x: number; y: number }>()
  let index = 0
  let maxDepth = 0

  function visit(current: AvlNode | null, depth: number): void {
    if (!current) return

    visit(current.left, depth + 1)

    positions.set(current.value, {
      x: 24 + index++ * STEP_X,
      y: 24 + depth * STEP_Y,
    })

    maxDepth = Math.max(maxDepth, depth)
    visit(current.right, depth + 1)
  }

  visit(root, 0)

  return {
    positions,
    width: Math.max(420, index * STEP_X + 40),
    height: 60 + maxDepth * STEP_Y + CARD_H,
  }
}

const rotationNames = {
  LL: 'simples à direita',
  RR: 'simples à esquerda',
  LR: 'à esquerda no filho, depois à direita',
  RL: 'à direita no filho, depois à esquerda',
}

export function AvlCanvas({
  fs,
  directoryId,
  selected,
  highlight,
  onSelect,
  onCd,
}: Props) {
  const [zoom, setZoom] = useState(0.8)

  const directory = fs.nodes[directoryId]
  const root = directory.entries

  const entries = useMemo(() => avlInOrder(root), [root])
  const layout = useMemo(() => layoutAvl(root), [root])

  const balanced = entries.every(
    (entry) => Math.abs(balanceFactor(entry)) <= 1,
  )

  const selectedNode = fs.nodes[selected]

  const selectedEntry =
    selectedNode?.parent === directoryId
      ? avlSearch(root, selectedNode.name)
      : null

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#09090c] text-zinc-200">
      <div className="shrink-0 border-b border-white/10 p-3">
        <h2 className="text-sm font-semibold text-emerald-300">
          AVL de {pathOf(fs, directoryId)}
        </h2>

        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Os nós são entradas da mesma pasta. As ligações esquerda e
          direita ordenam nomes; não representam subpastas.
        </p>

        <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs">
          <span>Entradas: {entries.length}</span>
          <span>Altura: {avlHeight(root)}</span>

          <span className={balanced ? 'text-emerald-300' : 'text-rose-300'}>
            {balanced ? 'Balanceada' : 'Desequilibrada'}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs">
          <button
            aria-label="Diminuir zoom AVL"
            onClick={() => setZoom((value) => Math.max(0.25, value - 0.1))}
            className="rounded border border-white/20 px-2 py-1"
          >
            −
          </button>

          <span>{Math.round(zoom * 100)}%</span>

          <button
            aria-label="Aumentar zoom AVL"
            onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))}
            className="rounded border border-white/20 px-2 py-1"
          >
            +
          </button>

          <span className="text-zinc-500">
            Clique: inspecionar. Duplo clique em pasta: entrar.
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <div className="min-h-[220px] min-w-0 flex-1 overflow-auto p-3">
          {!root ? (
            <div className="rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-zinc-400">
              Pasta vazia: raiz AVL = NULL.
              <br />
              Entre nesta pasta e use mkdir ou touch.
            </div>
          ) : (
            <svg
              role="group"
              aria-label={`AVL de ${pathOf(fs, directoryId)}`}
              width={layout.width * zoom}
              height={layout.height * zoom}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
            >
              {entries.flatMap((entry) => {
                const parent = layout.positions.get(entry.value)!

                return (
                  [
                    ['E', entry.left],
                    ['D', entry.right],
                  ] as const
                ).map(([side, child]) => {
                  if (!child) return null

                  const position = layout.positions.get(child.value)!
                  const color = side === 'E' ? '#38bdf8' : '#c084fc'

                  return (
                    <g key={`${entry.value}-${side}`}>
                      <line
                        x1={parent.x + CARD_W / 2}
                        y1={parent.y + CARD_H}
                        x2={position.x + CARD_W / 2}
                        y2={position.y}
                        stroke={color}
                        strokeWidth={2}
                      />

                      <text
                        x={(parent.x + position.x + CARD_W) / 2}
                        y={(parent.y + CARD_H + position.y) / 2 - 5}
                        fill={color}
                        fontSize={12}
                        textAnchor="middle"
                      >
                        {side}
                      </text>
                    </g>
                  )
                })
              })}

              {entries.map((entry) => {
                const position = layout.positions.get(entry.value)!
                const file = fs.nodes[entry.value]
                const found = highlight.includes(entry.value)
                const active = selected === entry.value

                return (
                  <g
                    key={entry.value}
                    transform={`translate(${position.x}, ${position.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${entry.key}; altura ${entry.height}; FB ${balanceFactor(entry)}`}
                    aria-pressed={active}
                    className="cursor-pointer"
                    onClick={() => onSelect(entry.value)}
                    onDoubleClick={() => {
                      if (file.type === 'dir') onCd(entry.value)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(entry.value)
                      }
                    }}
                  >
                    <title>
                      {entry.key} — {entry.value}
                    </title>

                    <rect
                      width={CARD_W}
                      height={CARD_H}
                      rx={10}
                      fill={file.type === 'dir' ? '#102338' : '#12251d'}
                      stroke={
                        found ? '#fbbf24' : active ? '#ffffff' : '#34d399'
                      }
                      strokeWidth={found || active ? 3 : 1.5}
                    />

                    <text
                      x={12}
                      y={23}
                      fill="#f4f4f5"
                      fontSize={13}
                      fontWeight={600}
                    >
                      {entry.key.length > 18
                        ? entry.key.slice(0, 17) + '…'
                        : entry.key}
                    </text>

                    <text x={12} y={43} fill="#a1a1aa" fontSize={11}>
                      {file.type === 'dir' ? 'pasta' : 'arquivo'} · {entry.value}
                    </text>

                    <text x={12} y={66} fill="#6ee7b7" fontSize={12}>
                      altura {entry.height} · FB {balanceFactor(entry)}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}
        </div>

        <aside className="max-h-[240px] shrink-0 space-y-4 overflow-auto border-t border-white/10 bg-[#101018] p-3 xl:max-h-none xl:w-[270px] xl:border-t-0 xl:border-l">
          <section>
            <h3 className="text-xs font-semibold text-cyan-300">
              Convenções
            </h3>

            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Altura da árvore vazia = 0.
              <br />
              Altura de uma folha = 1.
              <br />
              FB = altura(esquerda) − altura(direita).
              <br />
              Uma AVL mantém FB entre −1 e 1 em todos os nós.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-cyan-300">
              Entrada selecionada
            </h3>

            {selectedEntry ? (
              <div className="mt-2 space-y-1 break-words font-mono text-xs text-zinc-300">
                <div>Nome: {selectedEntry.key}</div>
                <div>ID: {selectedEntry.value}</div>
                <div>Altura: {selectedEntry.height}</div>
                <div>FB: {balanceFactor(selectedEntry)}</div>
                <div>Esquerda: {selectedEntry.left?.key ?? 'NULL'}</div>
                <div>Direita: {selectedEntry.right?.key ?? 'NULL'}</div>

                {selectedNode?.type === 'dir' && (
                  <button
                    onClick={() => onCd(selectedEntry.value)}
                    className="mt-2 rounded border border-cyan-400/30 px-2 py-1 text-cyan-200"
                  >
                    Entrar na pasta
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                Selecione uma entrada desta AVL.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold text-amber-300">
              Rotações do último comando
            </h3>

            <p className="mt-1 text-[11px] text-zinc-500">
              Inclui todos os diretórios afetados pelo comando.
            </p>

            {fs.avlEvents.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-400">
                Nenhuma rotação necessária.
              </p>
            ) : (
              <ul className="mt-2 space-y-3 text-xs text-zinc-400">
                {fs.avlEvents.map((event, index) => (
                  <li key={index}>
                    <strong className="text-amber-200">
                      {event.kind}
                    </strong>
                    : rotação {rotationNames[event.kind]}
                    <br />
                    Pivô: {event.pivot}
                    <br />
                    Nova raiz: {event.newRoot}
                    <br />
                    Pasta:{' '}
                    {fs.nodes[event.directoryId]
                      ? pathOf(fs, event.directoryId)
                      : event.directoryId}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}