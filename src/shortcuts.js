// shortcuts.js - Keyboard shortcut management system

import { ICON } from './config.js?v=@version-placeholder@';

// Module-level flag: true if ANY shortcuts instance is currently rebinding
// All instances check this before executing shortcuts
let globalRebinding = false;

/**
 * Create a shortcuts manager instance
 * @param {string} storageKey - localStorage key for persisting settings
 * @returns {{ register, init, enable, disable }}
 */
function createShortcuts(storageKey) {
    const shortcuts = [];
    let rebindingShortcut = null;  // Track which shortcut is being rebound
    let enabled = false;           // Whether shortcuts are active

    /**
     * Register a shortcut with an action and default hotkey
     * @param {Object} opts
     * @param {string} opts.id - Unique identifier for this shortcut
     * @param {string} opts.name - Human-readable name for display
     * @param {Function} opts.action - The function to call
     * @param {string} opts.key - Default hotkey (e.g., "ctrl+enter", "?", "h")
     * @param {boolean} opts.rebindable - Whether the shortcut can be rebound (default: true)
     */
    function register({ id, name, action, key, rebindable = true }) {
        shortcuts.push({
            id,
            name,
            action,
            defaultKey: key,
            key,
            enabled: true,
            rebindable,
        });
    }

    /**
     * Initialize the shortcuts system and render UI into container
     * @param {HTMLElement} container - Element to render shortcut settings into
     */
    function initialize(container) {
        loadSettings();
        renderUI(container);
        // Always listen for keydown (for rebinding), but only execute when enabled
        // Use capture phase to run before other listeners
        document.addEventListener('keydown', handleKeydown, true);
    }

    /**
     * Enable keyboard shortcuts
     */
    function enable() {
        enabled = true;
    }

    /**
     * Disable keyboard shortcuts
     */
    function disable() {
        enabled = false;
        // Cancel any active rebinding
        if (rebindingShortcut) {
            rebindingShortcut.keySpan.innerHTML = formatKeyDisplay(rebindingShortcut.key);
            rebindingShortcut = null;
            globalRebinding = false;
        }
    }

    /**
     * Load shortcut settings from localStorage
     */
    function loadSettings() {
        try {
            const saved = localStorage.getItem(storageKey);
            if (!saved) return;

            const settings = JSON.parse(saved);
            // Match saved settings to registered shortcuts by id
            for (const shortcut of shortcuts) {
                if (settings[shortcut.id]) {
                    shortcut.enabled = settings[shortcut.id].enabled ?? true;
                    shortcut.key = settings[shortcut.id].key ?? shortcut.defaultKey;
                }
            }
        } catch (e) {
            console.warn('Failed to load shortcut settings:', e);
        }
    }

    /**
     * Save shortcut settings to localStorage
     */
    function saveSettings() {
        const settings = {};
        for (const shortcut of shortcuts) {
            settings[shortcut.id] = {
                enabled: shortcut.enabled,
                key: shortcut.key,
            };
        }
        localStorage.setItem(storageKey, JSON.stringify(settings));
    }

    /**
     * Format a key string into kbd elements (e.g., "ctrl+enter" → "<kbd>Ctrl</kbd> + <kbd>Enter</kbd>")
     */
    const KEY_DISPLAY = {
        ' ': 'Space',
        'arrowup': '↑',
        'arrowdown': '↓',
        'arrowleft': '←',
        'arrowright': '→',
    };

    const ARROW_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

    function formatKeyDisplay(keyString) {
        return keyString
            .split('+')
            .map(part => {
                const label = KEY_DISPLAY[part] ?? part.charAt(0).toUpperCase() + part.slice(1);
                const cls = ARROW_KEYS.has(part) ? 'arrow' : '';
                return `<kbd class="${cls}">${label}</kbd>`;
            })
            .join(' + ');
    }

    /**
     * Reset all shortcuts to their default keys
     */
    function resetToDefaults() {
        for (const shortcut of shortcuts) {
            shortcut.key = shortcut.defaultKey;
            shortcut.enabled = true;
            if (shortcut.keySpan) {
                shortcut.keySpan.innerHTML = formatKeyDisplay(shortcut.key);
            }
            if (shortcut.li) {
                shortcut.li.classList.remove('disabled');
            }
        }
        saveSettings();
    }

    /**
     * Render the shortcuts UI
     */
    function renderUI(container) {
        // Master toggle row
        const masterToggle = document.createElement('div');
        masterToggle.className = 'shortcuts-master-toggle';
        masterToggle.innerHTML = `
            <label class="toggle-switch">
                <input type="checkbox" id="shortcuts-master-toggle" checked>
                <span class="toggle-slider"></span>
            </label>
            <span>Enable shortcuts</span>
            <span class="hint">Click to toggle, click key to change</span>
            <button class="shortcuts-reset" title="Reset to defaults">
                <img src="${ICON.REFRESH}" alt="" width="16" height="16">
                Reset
            </button>
        `;
        container.appendChild(masterToggle);

        // Reset button handler
        const resetButton = masterToggle.querySelector('.shortcuts-reset');
        resetButton.addEventListener('click', (e) => {
            e.stopPropagation();
            resetToDefaults();
            masterToggle.querySelector('input').checked = true;
        });

        const masterCheckbox = masterToggle.querySelector('input');
        masterCheckbox.checked = shortcuts.some(s => s.enabled);

        const ul = document.createElement('ul');
        ul.className = 'shortcuts-list';

        // Helper to update master checkbox based on individual states
        function updateMasterCheckbox() {
            masterCheckbox.checked = shortcuts.some(s => s.enabled);
        }

        // Group shortcuts by name (preserving order of first occurrence)
        const groups = [];
        const groupMap = new Map();
        for (const shortcut of shortcuts) {
            if (shortcut.hidden) continue;
            if (groupMap.has(shortcut.name)) {
                groupMap.get(shortcut.name).push(shortcut);
            } else {
                const group = [shortcut];
                groups.push(group);
                groupMap.set(shortcut.name, group);
            }
        }

        for (const group of groups) {
            const li = document.createElement('li');
            const allDisabled = group.every(s => !s.enabled);
            if (allDisabled) li.classList.add('disabled');

            // Create key spans for each shortcut in group
            const keysContainer = document.createElement('span');
            keysContainer.className = 'shortcut-keys';

            group.forEach((shortcut, i) => {
                if (i > 0) keysContainer.appendChild(document.createTextNode(' '));

                // Lock icon for non-rebindable shortcuts
                if (!shortcut.rebindable) {
                    const lockIcon = document.createElement('img');
                    lockIcon.src = ICON.LOCK;
                    lockIcon.alt = '';
                    lockIcon.className = 'shortcut-lock';
                    shortcut.lockIcon = lockIcon;
                    keysContainer.appendChild(lockIcon);
                }

                const keySpan = document.createElement('span');
                keySpan.className = 'shortcut-key';
                keySpan.innerHTML = formatKeyDisplay(shortcut.key);
                keySpan.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startRebinding(shortcut, keySpan);
                });

                shortcut.keySpan = keySpan;
                shortcut.li = li;
                keysContainer.appendChild(keySpan);
            });

            const nameSpan = document.createElement('span');
            nameSpan.textContent = ` - ${group[0].name}`;

            // Click li to toggle all shortcuts in group
            li.addEventListener('click', () => {
                const newEnabled = !group.every(s => s.enabled);
                for (const shortcut of group) {
                    shortcut.enabled = newEnabled;
                }
                li.classList.toggle('disabled', !newEnabled);
                saveSettings();
                updateMasterCheckbox();
            });

            li.appendChild(keysContainer);
            li.appendChild(nameSpan);
            ul.appendChild(li);
        }

        // Master toggle enables/disables all shortcuts
        masterCheckbox.addEventListener('change', () => {
            const enabled = masterCheckbox.checked;
            for (const shortcut of shortcuts) {
                shortcut.enabled = enabled;
                if (shortcut.li) {
                    shortcut.li.classList.toggle('disabled', !enabled);
                }
            }
            saveSettings();
        });

        container.appendChild(ul);
    }

    /**
     * Enter rebinding mode for a shortcut
     */
    function startRebinding(shortcut, keySpan) {
        // Non-rebindable shortcuts show shake animation on lock icon
        if (!shortcut.rebindable) {
            if (shortcut.lockIcon) {
                shortcut.lockIcon.classList.add('shake');
                setTimeout(() => shortcut.lockIcon.classList.remove('shake'), 300);
            }
            return;
        }

        // Cancel any existing rebinding
        if (rebindingShortcut) {
            rebindingShortcut.keySpan.innerHTML = formatKeyDisplay(rebindingShortcut.key);
        }

        rebindingShortcut = shortcut;
        globalRebinding = true;
        keySpan.innerHTML = '<kbd>...</kbd>';
    }

    /**
     * Handle keydown events
     */
    function handleKeydown(event) {
        // Handle rebinding mode
        if (rebindingShortcut) {
            // Ignore modifier-only keypresses (ctrl, alt, shift, meta).
            // Browser inconsistency: some fire keydown immediately when a modifier
            // is pressed alone, others wait until a non-modifier key is also pressed.
            // This check ensures consistent rebinding behavior across all browsers.
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            const newKey = getKeyString(event);
            rebindingShortcut.key = newKey;
            rebindingShortcut.keySpan.innerHTML = formatKeyDisplay(newKey);
            saveSettings();
            rebindingShortcut = null;
            globalRebinding = false;
            return;
        }

        // Only execute shortcuts when enabled and no instance is rebinding
        if (!enabled || globalRebinding) return;

        const pressedKey = getKeyString(event);

        for (const shortcut of shortcuts) {
            if (!shortcut.enabled) continue;
            if (shortcut.key === pressedKey) {
                const handled = shortcut.action(event);
                if (handled !== false) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
                return;
            }
        }
    }

    /**
     * Convert a keyboard event to a key string (e.g., "ctrl+enter", "shift+a")
     *
     * Shift handling:
     * - Letters: include shift (e.g., "shift+a") so we can distinguish A from Shift+A
     * - Symbols: don't include shift (e.g., "?" not "shift+/") since the symbol already reflects it
     * - Special keys: include shift (e.g., "shift+enter", "shift+arrowup")
     *
     * Note: Meta key (Cmd/Windows) is not supported - OS captures it before the browser.
     */
    function getKeyString(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('ctrl');
        if (event.altKey) parts.push('alt');
        const isLetter = /^[a-z]$/i.test(event.key);
        const isSpecialKey = event.key.length > 1;
        if (event.shiftKey && (isLetter || isSpecialKey)) parts.push('shift');
        parts.push(event.key.toLowerCase());
        return parts.join('+');
    }

    return { register, init: initialize, enable, disable };
}

export { createShortcuts as new };
