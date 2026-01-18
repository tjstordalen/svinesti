# Known Bugs

## 1. Local level list not updating after save

Saving a local level does not update the Local tab's level list until switching away from the tab and back.

**Steps to reproduce:**
1. Open Level Creator
2. Make changes and click Save
3. Switch to sidebar Local tab
4. New/updated level not visible until switching to another tab and back

## 2. Keyboard shortcuts active while typing in editor

Keyboard shortcuts (e.g., `h` for help) trigger even when typing in the code editor, preventing normal text input.

**Steps to reproduce:**
1. Focus the code editor
2. Try to type a word containing 'h' (e.g., "while")
3. Help modal opens instead of typing the letter

**Expected:** Shortcuts should be suppressed when focus is in an input/textarea/CodeMirror.
