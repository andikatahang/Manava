import { EDITOR_CAPACITY } from '../../data/mockData'
import type { Editor } from '../../types'

/** True when the editor is already handling the maximum concurrent projects. */
export function isAtCapacity(editor: Editor): boolean {
  return editor.active_projects >= EDITOR_CAPACITY
}

/** True when the editor is active and still has a free project slot. */
export function isAvailable(editor: Editor): boolean {
  return editor.status === 'active' && !isAtCapacity(editor)
}
