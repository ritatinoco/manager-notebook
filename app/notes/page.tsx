'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash, FloppyDisk, CheckCircle, WarningCircle, Spinner } from '@phosphor-icons/react'
import type { ActionItem, NoteBlock, NotesData } from '@/lib/data/notes'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

// --- Action Items ---

function ActionItems({
  items,
  onChange,
}: {
  items: ActionItem[]
  onChange: (items: ActionItem[]) => void
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addItem() {
    const text = input.trim()
    if (!text) return
    onChange([
      ...items,
      { id: randomId(), text, done: false, createdAt: new Date().toISOString() },
    ])
    setInput('')
    inputRef.current?.focus()
  }

  function toggleDone(id: string) {
    onChange(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
  }

  function deleteItem(id: string) {
    onChange(items.filter((item) => item.id !== id))
  }

  const open = items.filter((i) => !i.done)
  const done = items.filter((i) => i.done)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
          placeholder="Add an action item…"
          className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-300"
        />
        <button
          onClick={addItem}
          disabled={!input.trim()}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 px-3 py-2 rounded-md transition-colors"
        >
          <Plus size={14} weight="bold" />
          Add
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 italic">No action items yet.</p>
      )}

      {open.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {open.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 group">
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleDone(item.id)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer shrink-0"
              />
              <span className="flex-1 text-sm text-gray-700">{item.text}</span>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <Trash size={14} weight="duotone" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-1.5">Done</p>
          <ul className="space-y-1.5">
            {done.map((item) => (
              <li key={item.id} className="flex items-center gap-2.5 group">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleDone(item.id)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer shrink-0"
                />
                <span className="flex-1 text-sm text-gray-400 line-through">{item.text}</span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash size={14} weight="duotone" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// --- Note Block ---

function NoteBlockRow({
  note,
  onSave,
  onDelete,
}: {
  note: NoteBlock
  onSave: (updated: NoteBlock) => Promise<void>
  onDelete: () => void
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const isDirty = title !== note.title || content !== note.content

  async function save() {
    setSaveState('saving')
    try {
      await onSave({ ...note, title, content })
      note.title = title
      note.content = content
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
    }
  }

  const stateColor = {
    idle: isDirty ? 'text-indigo-600 hover:text-indigo-800' : 'text-gray-300 cursor-default',
    saving: 'text-gray-400',
    saved: 'text-green-600',
    error: 'text-red-500',
  }[saveState]

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSaveState('idle') }}
          placeholder="Note title…"
          className="flex-1 text-sm font-semibold text-gray-800 border-0 border-b border-transparent focus:border-gray-300 focus:outline-none pb-0.5 bg-transparent placeholder-gray-300"
        />
        <button
          onClick={save}
          disabled={saveState === 'saving' || !isDirty}
          title={isDirty ? 'Save' : 'No changes'}
          className={`flex items-center gap-1 text-xs font-medium transition-colors ${stateColor}`}
        >
          {saveState === 'saving' && <Spinner size={14} weight="duotone" className="animate-spin" />}
          {saveState === 'saved' && <CheckCircle size={14} weight="duotone" />}
          {saveState === 'error' && <WarningCircle size={14} weight="duotone" />}
          {saveState === 'idle' && <FloppyDisk size={14} weight="duotone" />}
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Error' : 'Save'}
        </button>
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 transition-colors"
          title="Delete note"
        >
          <Trash size={14} weight="duotone" />
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setSaveState('idle') }}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
        placeholder="Start typing…"
        rows={4}
        className="w-full text-sm text-gray-700 border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-300"
      />
      {isDirty && <p className="text-xs text-gray-400 mt-1">⌘↵ or Ctrl+↵ to save</p>}
    </div>
  )
}

// --- Page ---

export default function NotesPage() {
  const [data, setData] = useState<NotesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notes')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  async function persist(updated: NotesData) {
    await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }

  async function handleActionItemsChange(items: ActionItem[]) {
    if (!data) return
    const updated = { ...data, actionItems: items }
    setData(updated)
    await persist(updated)
  }

  async function handleNoteSave(updated: NoteBlock) {
    if (!data) return
    const notes = data.notes.map((n) => (n.id === updated.id ? updated : n))
    const newData = { ...data, notes }
    setData(newData)
    await persist(newData)
  }

  async function handleNoteDelete(id: string) {
    if (!data) return
    const notes = data.notes.filter((n) => n.id !== id)
    const newData = { ...data, notes }
    setData(newData)
    await persist(newData)
  }

  function addNote() {
    if (!data) return
    const newNote: NoteBlock = {
      id: randomId(),
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
    }
    const newData = { ...data, notes: [newNote, ...data.notes] }
    setData(newData)
    persist(newData)
  }

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>
  if (!data) return null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Notes</h1>
        <p className="text-sm text-gray-500 mt-1">Action items and free-form notes for your own reference.</p>
      </div>

      {/* Action Items */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Action Items</h2>
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <ActionItems items={data.actionItems} onChange={handleActionItemsChange} />
        </div>
      </section>

      {/* Notes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          <button
            onClick={addNote}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Plus size={14} weight="bold" />
            New note
          </button>
        </div>
        {data.notes.length === 0 && (
          <p className="text-sm text-gray-400 italic">No notes yet. Click "New note" to add one.</p>
        )}
        <div className="space-y-3">
          {data.notes.map((note) => (
            <NoteBlockRow
              key={note.id}
              note={note}
              onSave={handleNoteSave}
              onDelete={() => handleNoteDelete(note.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
