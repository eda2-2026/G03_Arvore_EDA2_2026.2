import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Eraser, Terminal as TerminalIcon } from 'lucide-react'
import {
  COMMANDS,
  promptPath,
  resolve,
  type FsState,
  type HistoryEntry,
  type Tone,
} from '../lib/fs'

interface Props {
  fs: FsState
  history: HistoryEntry[]
  onRun: (cmd: string) => void
  onClear: () => void
}

const TONE: Record<Tone, string> = {
  dir: 'text-sky-400',
  file: 'text-zinc-300',
  err: 'text-rose-400',
  ok: 'text-emerald-400',
  dim: 'text-zinc-500',
  warn: 'text-amber-400',
  accent: 'text-violet-300',
}

function complete(fs: FsState, value: string): string {
  const m = /^(.*?)(\S*)$/.exec(value)!
  const head = m[1]
  const word = m[2]
  const isFirst = head.trim() === ''
  let options: string[]
  let base = ''
  let prefix = word
  if (isFirst) {
    options = COMMANDS
  } else {
    const slash = word.lastIndexOf('/')
    const dirPart = slash >= 0 ? word.slice(0, slash + 1) : ''
    prefix = slash >= 0 ? word.slice(slash + 1) : word
    base = dirPart
    const dirId = dirPart ? resolve(fs, dirPart) : fs.cwd
    if (!dirId || fs.nodes[dirId].type !== 'dir') return value
    options = fs.nodes[dirId].children.map((c) => fs.nodes[c].name + (fs.nodes[c].type === 'dir' ? '/' : ''))
  }
  const matches = options.filter((o) => o.startsWith(prefix))
  if (!matches.length) return value
  let common = matches[0]
  for (const x of matches) while (!x.startsWith(common)) common = common.slice(0, -1)
  const suffix = isFirst && matches.length === 1 ? ' ' : ''
  return head + base + common + suffix
}

export function Terminal({ fs, history, onRun, onClear }: Props) {
  const [value, setValue] = useState('')
  const [caret, setCaret] = useState(0)
  const [focused, setFocused] = useState(false)
  const [cursorIdx, setCursorIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sent = history.filter((h) => h.cmd).map((h) => h.cmd as string)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history])

  useLayoutEffect(() => {
    const el = inputRef.current
    if (el && document.activeElement === el && el.selectionStart !== caret) el.setSelectionRange(caret, caret)
  }, [value, caret])

  const sync = (e: React.SyntheticEvent<HTMLInputElement>) => setCaret(e.currentTarget.selectionStart ?? 0)

  const submit = () => {
    onRun(value)
    setValue('')
    setCaret(0)
    setCursorIdx(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!sent.length) return
      const idx = cursorIdx === -1 ? sent.length - 1 : Math.max(0, cursorIdx - 1)
      setCursorIdx(idx)
      setValue(sent[idx])
      setCaret(sent[idx].length)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (cursorIdx === -1) return
      const idx = cursorIdx + 1
      if (idx >= sent.length) {
        setCursorIdx(-1)
        setValue('')
        setCaret(0)
      } else {
        setCursorIdx(idx)
        setValue(sent[idx])
        setCaret(sent[idx].length)
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const next = complete(fs, value)
      setValue(next)
      setCaret(next.length)
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      onClear()
    }
  }

  const before = value.slice(0, caret)
  const at = value.slice(caret, caret + 1)
  const after = value.slice(caret + 1)

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-[#08080b]"
      onClick={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus()
      }}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <div className="flex items-center gap-2">
          <TerminalIcon className="size-3.5 text-zinc-400" />
          <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-400">TERMINAL</span>
          <span className="rounded bg-white/[0.06] px-1.5 py-px font-mono text-[10px] text-zinc-400">bash</span>
        </div>
        <button
          title="Limpar terminal (Ctrl+L)"
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-200"
        >
          <Eraser className="size-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[12.5px] leading-[1.6]">
        {history.map((h) => (
          <div key={h.id}>
            {h.cmd !== undefined && (
              <div className="break-all">
                <span className="text-emerald-400">$</span> <span className="text-zinc-100">{h.cmd}</span>
              </div>
            )}
            {h.lines.map((line, i) => (
              <div key={i} className="break-words whitespace-pre-wrap">
                {line.map((s, j) => (
                  <span key={j} className={TONE[s.tone ?? 'file']}>
                    {s.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-cyan-400">{promptPath(fs)}</span>
          <span className="shrink-0 text-emerald-400">$</span>
          <div className="relative min-w-0 flex-1">
            <div aria-hidden className="break-all whitespace-pre-wrap text-zinc-50">
              {before}
              <span
                className={`${focused ? 'cursor-blink bg-emerald-400 text-black' : 'outline outline-1 -outline-offset-1 outline-emerald-400/60'}`}
              >
                {at || '\u00a0'}
              </span>
              {after}
            </div>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setCursorIdx(-1)
                sync(e)
              }}
              onSelect={sync}
              onKeyUp={sync}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              aria-label="Entrada de comando"
              className="absolute inset-0 w-full bg-transparent text-transparent caret-transparent outline-none"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
