import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { GardenNote } from '../../types/garden';

interface GardenNotesPanelProps {
  notes: GardenNote[];
  onAddNote: (content: string) => void;
}

export function GardenNotesPanel({ notes, onAddNote }: GardenNotesPanelProps) {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote('');
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Garden Notes</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note"
        />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      <div className="space-y-2">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="border rounded p-2">
              <p className="text-sm">{note.content}</p>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(note.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
