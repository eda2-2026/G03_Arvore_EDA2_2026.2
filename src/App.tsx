import { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Explorer } from './components/Explorer'
import { Terminal } from './components/Terminal'
import { TreeCanvas } from './components/TreeCanvas'
import { Inspector } from './components/Inspector'
import { AvlCanvas } from './components/AvlCanvas'
import {
  ClearDialog,
  CreateDialog,
  FindDialog,
} from './components/Dialogs'
import {
  ancestors,
  createInitialSession,
  listDfs,
  pathOf,
  runCommand,
} from './lib/fs'

type Dialog = null | 'dir' | 'file' | 'find' | 'clear'
type ViewMode = 'hierarchy' | 'avl'

export default function App() {
  const initial = useMemo(createInitialSession, [])

  const [fs, setFs] = useState(initial.fs)
  const [history, setHistory] = useState(initial.history)
  const [selected, setSelected] = useState(initial.fs.cwd)
  const [highlight, setHighlight] = useState<string[]>([])

  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        listDfs(initial.fs).filter(
          (id) => initial.fs.nodes[id].type === 'dir',
        ),
      ),
  )

  const [dialog, setDialog] = useState<Dialog>(null)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('avl')
  const [avlDirectory, setAvlDirectory] = useState(initial.fs.cwd)
  const [seq, setSeq] = useState(initial.history.length)

  const selectedId = fs.nodes[selected] ? selected : fs.cwd

  const avlDirectoryId =
    fs.nodes[avlDirectory]?.type === 'dir'
      ? avlDirectory
      : fs.cwd

  useEffect(() => {
    setExpanded((previous) => {
      const next = new Set(previous)

      ancestors(fs, fs.cwd).forEach((id) => next.add(id))

      ancestors(fs, selectedId)
        .slice(0, -1)
        .forEach((id) => next.add(id))

      return next.size === previous.size ? previous : next
    })
  }, [fs, selectedId])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault()
        setDialog('find')
      }
    }

    window.addEventListener('keydown', handler)

    return () => window.removeEventListener('keydown', handler)
  }, [])

  const exec = (command: string) => {
    const result = runCommand(fs, command)

    if (result.clear) {
      setHistory([])
    } else {
      setHistory((previous) => [
        ...previous,
        {
          id: seq,
          cmd: command,
          lines: result.lines,
        },
      ])

      setSeq((previous) => previous + 1)
    }

    setFs(result.fs)
    setHighlight(result.highlight ?? [])

    if (result.select) {
      setSelected(result.select)
    } else if (result.fs.cwd !== fs.cwd) {
      setSelected(result.fs.cwd)
    }

    if (result.fs.cwd !== fs.cwd) {
      setAvlDirectory(result.fs.cwd)
    }
  }

  const cdTo = (id: string) => {
    exec(`cd "${pathOf(fs, id)}"`)
  }

  const directories = listDfs(fs).filter(
    (id) => fs.nodes[id].type === 'dir',
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-[#09090b] text-zinc-200 lg:overflow-hidden">
      <Header
        fs={fs}
        onCd={cdTo}
        onMkdir={() => setDialog('dir')}
        onTouch={() => setDialog('file')}
        onFind={() => setDialog('find')}
        onClear={() => setDialog('clear')}
      />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex h-[640px] shrink-0 flex-col border-b border-white/[0.07] bg-[#0c0c10] lg:h-auto lg:w-[340px] lg:border-r lg:border-b-0">
          <Explorer
            fs={fs}
            expanded={expanded}
            selected={selectedId}
            highlight={highlight}
            onToggle={(id) => {
              setExpanded((previous) => {
                const next = new Set(previous)

                if (next.has(id)) next.delete(id)
                else next.add(id)

                return next
              })
            }}
            onSelect={setSelected}
            onCd={(path) => exec(`cd "${path}"`)}
            onExpandAll={() => setExpanded(new Set(directories))}
            onCollapseAll={() => setExpanded(new Set([fs.root]))}
          />

          <div className="h-[44%] min-h-[220px] shrink-0 border-t border-white/[0.09]">
            <Terminal
              fs={fs}
              history={history}
              onRun={exec}
              onClear={() => setHistory([])}
            />
          </div>
        </aside>

        <section className="flex h-[680px] min-w-0 flex-1 flex-col lg:h-auto">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-[#101018] p-2">
            <div
              role="group"
              aria-label="Visualização"
              className="flex gap-1"
            >
              <button
                onClick={() => setViewMode('hierarchy')}
                aria-pressed={viewMode === 'hierarchy'}
                className={`rounded px-3 py-1.5 text-xs ${
                  viewMode === 'hierarchy'
                    ? 'bg-sky-500/25 text-sky-200'
                    : 'text-zinc-400'
                }`}
              >
                Hierarquia de pastas
              </button>

              <button
                onClick={() => setViewMode('avl')}
                aria-pressed={viewMode === 'avl'}
                className={`rounded px-3 py-1.5 text-xs ${
                  viewMode === 'avl'
                    ? 'bg-emerald-500/25 text-emerald-200'
                    : 'text-zinc-400'
                }`}
              >
                AVL por diretório
              </button>
            </div>

            {viewMode === 'avl' && (
              <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
                Visualizar pasta

                <select
                  aria-label="Diretório da AVL"
                  value={avlDirectoryId}
                  onChange={(event) => {
                    setAvlDirectory(event.target.value)
                    setSelected(event.target.value)
                  }}
                  className="max-w-[250px] rounded border border-white/15 bg-[#15151d] p-1.5 text-zinc-200"
                >
                  {directories.map((id) => (
                    <option key={id} value={id}>
                      {pathOf(fs, id)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="relative min-h-0 flex-1">
            {viewMode === 'avl' ? (
              <AvlCanvas
                fs={fs}
                directoryId={avlDirectoryId}
                selected={selectedId}
                highlight={highlight}
                onSelect={setSelected}
                onCd={cdTo}
              />
            ) : (
              <>
                <TreeCanvas
                  fs={fs}
                  selected={selectedId}
                  highlight={highlight}
                  rightInset={inspectorOpen ? 336 : 60}
                  onSelect={setSelected}
                  onCd={cdTo}
                  onClearHighlight={() => setHighlight([])}
                />

                <Inspector
                  fs={fs}
                  nodeId={selectedId}
                  open={inspectorOpen}
                  onToggle={() => setInspectorOpen((previous) => !previous)}
                  onSelect={setSelected}
                  onCd={cdTo}
                />
              </>
            )}
          </div>
        </section>
      </main>

      {(dialog === 'dir' || dialog === 'file') && (
        <CreateDialog
          kind={dialog}
          fs={fs}
          onClose={() => setDialog(null)}
          onSubmit={(name, size) => {
            exec(
              dialog === 'dir'
                ? `mkdir "${name}"`
                : `touch "${name}" ${size}`,
            )

            setDialog(null)
          }}
        />
      )}

      {dialog === 'find' && (
        <FindDialog
          fs={fs}
          onClose={() => setDialog(null)}
          onRun={(term) => {
            exec(`find "${term}"`)
            setDialog(null)
          }}
          onPick={(id) => {
            setSelected(id)
            setHighlight([id])

            const node = fs.nodes[id]

            if (node.parent) {
              setAvlDirectory(node.parent)
            }

            setDialog(null)
          }}
        />
      )}

      {dialog === 'clear' && (
        <ClearDialog
          fs={fs}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            exec('rm -rf /*')
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}