import * as Editor from "./editor.js";

// --- Delete mode state ---
let deleteMode = false;
let levelsToDelete = new Set();

// --- Dependencies (set via init) ---
let ui = null;
let selectLevel = null;

// --- SVG Icons ---
const TRASH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"/>
</svg>`;

const SHARE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1z"/>
  <path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 1.707V10.5a.5.5 0 0 1-1 0V1.707L5.354 3.854a.5.5 0 1 1-.708-.708z"/>
</svg>`;

// --- Toast notification ---

function showCopiedToast(anchorElement) {
    // Remove any existing toast
    const existing = document.querySelector('.copied-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'copied-toast';
    toast.textContent = 'Link copied to clipboard';
    document.body.appendChild(toast);

    // Position near the anchor element
    const rect = anchorElement.getBoundingClientRect();
    toast.style.top = `${rect.top - 40}px`;
    toast.style.left = `${rect.left + rect.width / 2}px`;

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, 1500);
}

// --- Delete mode functions ---

function toggleDeleteMode() {
    deleteMode = !deleteMode;
    levelsToDelete.clear();
    buildCustomLevelsList();
}

function confirmDelete() {
    if (levelsToDelete.size === 0) {
        toggleDeleteMode();
        return;
    }
    // Delete selected levels (iterate in reverse to avoid index issues)
    const indices = Array.from(levelsToDelete).sort((a, b) => b - a);
    for (const idx of indices) {
        Editor.editorState.customLevels.splice(idx, 1);
    }
    Editor.saveCustomLevels();
    deleteMode = false;
    levelsToDelete.clear();
    buildCustomLevelsList();
}

// --- Build custom levels list ---

export function buildCustomLevelsList() {
    // Remove existing custom levels section if present
    const existingSection = document.getElementById("custom-levels-section");
    if (existingSection) {
        existingSection.remove();
    }

    // Only show if there are custom levels
    if (Editor.editorState.customLevels.length === 0) return;

    // Create custom levels section
    const section = document.createElement("div");
    section.id = "custom-levels-section";

    // Header with trash button
    const header = document.createElement("div");
    header.className = "sidebar-header";
    header.style.cssText = "border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;";

    const title = document.createElement("h2");
    title.textContent = "Custom Levels";

    const trashBtn = document.createElement("button");
    trashBtn.className = "trash-toggle-btn" + (deleteMode ? " active" : "");
    trashBtn.innerHTML = TRASH_ICON_SVG;
    trashBtn.title = deleteMode ? "Confirm delete" : "Delete levels";
    trashBtn.onclick = deleteMode ? confirmDelete : toggleDeleteMode;

    header.appendChild(title);
    header.appendChild(trashBtn);
    section.appendChild(header);

    const list = document.createElement("ul");
    list.id = "custom-level-list";
    list.className = "level-list";
    list.style.cssText = "list-style: none; margin: 0; padding: 8px;";

    Editor.editorState.customLevels.forEach((lvl, idx) => {
        const item = document.createElement("li");
        item.style.marginBottom = "4px";
        item.style.display = "flex";
        item.style.alignItems = "center";

        // Trash icon for this level (only in delete mode)
        if (deleteMode) {
            if (levelsToDelete.has(idx)) {
                item.classList.add("level-item-marked");
            }
            item.style.cursor = "pointer";

            const levelTrash = document.createElement("button");
            levelTrash.className = "level-trash-btn" + (levelsToDelete.has(idx) ? " marked" : "");
            levelTrash.innerHTML = TRASH_ICON_SVG;

            const toggleMark = () => {
                if (levelsToDelete.has(idx)) {
                    levelsToDelete.delete(idx);
                    levelTrash.classList.remove("marked");
                    item.classList.remove("level-item-marked");
                } else {
                    levelsToDelete.add(idx);
                    levelTrash.classList.add("marked");
                    item.classList.add("level-item-marked");
                }
            };

            item.onclick = toggleMark;
            item.appendChild(levelTrash);
        }

        const btn = document.createElement("button");
        btn.textContent = lvl.name;
        btn.style.cssText = `
            display: flex;
            align-items: center;
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 6px;
            background: transparent;
            color: var(--color-text);
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            text-align: left;
        `;

        if (!deleteMode) {
            btn.addEventListener("click", () => {
                // Exit edit mode if active
                if (Editor.editorState.active) {
                    Editor.exitEditMode();
                }
                selectLevel(lvl);
                // Update selection styling
                ui.levelList.querySelectorAll("li button").forEach(b => b.classList.remove("selected"));
                list.querySelectorAll("button:not(.level-trash-btn):not(.level-share-btn)").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
            });

            // Share button
            const shareBtn = document.createElement("button");
            shareBtn.className = "level-share-btn";
            shareBtn.innerHTML = SHARE_ICON_SVG;
            shareBtn.title = "Copy share link";
            shareBtn.onclick = async (e) => {
                e.stopPropagation();
                const url = Editor.exportLevelToURL(lvl);
                try {
                    await navigator.clipboard.writeText(url);
                    shareBtn.classList.add("copied");
                    showCopiedToast(shareBtn);
                    setTimeout(() => shareBtn.classList.remove("copied"), 1500);
                } catch (err) {
                    prompt("Copy this link:", url);
                }
            };
            item.appendChild(btn);
            item.appendChild(shareBtn);
        } else {
            item.appendChild(btn);
        }

        list.appendChild(item);
    });

    // Add Delete button at bottom when in delete mode
    if (deleteMode) {
        const deleteWrapper = document.createElement("div");
        deleteWrapper.className = "delete-confirm-btn";
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = confirmDelete;
        deleteWrapper.appendChild(deleteBtn);
        section.appendChild(deleteWrapper);
    }

    section.appendChild(list);
    ui.levelList.parentElement.appendChild(section);
}

// --- Initialization ---

export function init(uiRef, selectLevelFn) {
    ui = uiRef;
    selectLevel = selectLevelFn;

    // Set callback for when levels are saved
    Editor.setOnLevelSaved(() => {
        buildCustomLevelsList();
    });

    // Build initial custom levels list
    buildCustomLevelsList();

    // Check for level in URL hash (shared level)
    const importedLevel = Editor.importLevelFromURL();
    if (importedLevel) {
        // Give it a temporary name if not present
        if (!importedLevel.name) {
            importedLevel.name = "Shared Level";
        }
        // Add to custom levels list (handles name conflicts)
        Editor.addCustomLevel(importedLevel);
        buildCustomLevelsList();
        // Select the imported level for play
        selectLevel(importedLevel);
        // Clear the hash from URL
        Editor.clearLevelFromURL();
    }
}
