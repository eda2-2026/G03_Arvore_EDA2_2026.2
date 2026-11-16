import { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Explorer } from './components/Explorer'
import { Terminal } from './components/Terminal'
import { TreeCanvas } from './components/TreeCanvas'
import { Inspector } from './components/Inspector'
import { ClearDialog, CreateDialog, FindDialog } from './components/Dialogs'
import { ancestors, createInitialSession, listDfs, pathOf, runCommand } from './lib/fs'

type Dialog = null | 'dir' | 'file' | 'find' | 'clear'

export default function App() {
  const initial = useMemo(createInitialSession, [])
  const [fs, setFs] = useState(initial.fs)
  const [history, setHistory] = useState(initial.history)
  const [selected, setSelected] = useState(initial.fs.cwd)
  const [highlight, setHighlight] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(listDfs(initial.fs).filter((id) => initial.fs.nodes[id].type === 'dir')),
  )
  const [dialog, setDialog] = useState<Dialog>(null)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [seq, setSeq] = useState(initial.history.length)

  const selectedId = fs.nodes[selected] ? selected : fs.cwd

  // mantém o caminho do cwd e do nó selecionado visível no explorer
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev)
      ancestors(fs, fs.cwd).forEach((id) => next.add(id))
      ancestors(fs, selectedId)
        .slice(0, -1)
        .forEach((id) => next.add(id))
      return next.size === prev.size ? prev : next
    })
  }, [fs, selectedId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setDialog('find')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const exec = (cmd: string) => {
    const r = runCommand(fs, cmd)
    if (r.clear) setHistory([])
    else {
      setHistory((h) => [...h, { id: seq, cmd, lines: r.lines }])
      setSeq(seq + 1)
    }
    setFs(r.fs)
    setHighlight(r.highlight ?? [])
    if (r.select) setSelected(r.select)
    else if (r.fs.cwd !== fs.cwd) setSelected(r.fs.cwd)
  }

  const cdTo = (id: string) => exec(`cd "${pathOf(fs, id)}"`)

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
            onToggle={(id) =>
              setExpanded((p) => {
                const n = new Set(p)
                if (n.has(id)) n.delete(id)
                else n.add(id)
                return n
              })
            }
            onSelect={setSelected}
            onCd={(path) => exec(`cd "${path}"`)}
            onExpandAll={() =>
              setExpanded(new Set(listDfs(fs).filter((id) => fs.nodes[id].type === 'dir')))
            }
            onCollapseAll={() => setExpanded(new Set([fs.root]))}
          />
          <div className="h-[44%] min-h-[220px] shrink-0 border-t border-white/[0.09]">
            <Terminal fs={fs} history={history} onRun={exec} onClear={() => setHistory([])} />
          </div>
        </aside>

        <section className="relative h-[620px] min-w-0 flex-1 lg:h-auto">
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
            onToggle={() => setInspectorOpen((o) => !o)}
            onSelect={setSelected}
            onCd={cdTo}
          />
        </section>
      </main>

      {(dialog === 'dir' || dialog === 'file') && (
        <CreateDialog
          kind={dialog}
          fs={fs}
          onClose={() => setDialog(null)}
          onSubmit={(name, size) => {
            exec(dialog === 'dir' ? `mkdir "${name}"` : `touch "${name}" ${size}`)
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
