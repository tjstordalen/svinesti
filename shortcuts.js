// shortcuts.js - Keyboard shortcut management system

/**
 * Create a shortcuts manager instance
 * @param {string} storageKey - localStorage key for persisting settings
 * @returns {{ register, init, enable, disable }}
 */
function createShortcuts(storageKey) {
    const shortcuts = [];
    let rebindingShortcut = null;  // Track which shortcut is being rebound
    let keydownHandler = null;     // Track listener for enable/disable

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
    }

    /**
     * Enable keyboard shortcuts (attach listener)
     */
    function enable() {
        if (keydownHandler) return;  // Already enabled
        keydownHandler = handleKeydown;
        document.addEventListener('keydown', keydownHandler);
    }

    /**
     * Disable keyboard shortcuts (detach listener)
     */
    function disable() {
        if (!keydownHandler) return;  // Already disabled
        document.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
        // Cancel any active rebinding
        if (rebindingShortcut) {
            rebindingShortcut.keySpan.innerHTML = formatKeyDisplay(rebindingShortcut.key);
            rebindingShortcut = null;
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
    function formatKeyDisplay(keyString) {
        return keyString
            .split('+')
            .map(part => {
                // Capitalize first letter
                const label = part.charAt(0).toUpperCase() + part.slice(1);
                return `<kbd>${label}</kbd>`;
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
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/>
                </svg>
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

        for (const shortcut of shortcuts) {
            // Skip hidden shortcuts (e.g., auto-registered Ctrl+ versions)
            if (shortcut.hidden) continue;

            const li = document.createElement('li');
            if (!shortcut.enabled) li.classList.add('disabled');

            // Add lock icon for non-rebindable shortcuts
            let lockIcon = null;
            if (!shortcut.rebindable) {
                lockIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                lockIcon.setAttribute('viewBox', '0 0 16 16');
                lockIcon.setAttribute('fill', 'currentColor');
                lockIcon.className.baseVal = 'shortcut-lock';
                lockIcon.innerHTML = '<path d="M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4m0 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3"/>';
                li.appendChild(lockIcon);
            }

            const keySpan = document.createElement('span');
            keySpan.className = 'shortcut-key';
            keySpan.innerHTML = formatKeyDisplay(shortcut.key);
            keySpan.addEventListener('click', (e) => {
                e.stopPropagation();  // Don't toggle enabled state
                startRebinding(shortcut, keySpan);
            });

            const nameSpan = document.createElement('span');
            nameSpan.textContent = ` - ${shortcut.name}`;

            // Click li to toggle enabled/disabled
            li.addEventListener('click', () => {
                shortcut.enabled = !shortcut.enabled;
                li.classList.toggle('disabled', !shortcut.enabled);
                saveSettings();
                updateMasterCheckbox();
            });

            // Store references for updating later
            shortcut.keySpan = keySpan;
            shortcut.lockIcon = lockIcon;
            shortcut.li = li;

            li.appendChild(keySpan);
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
        if (!shortcut.rebindable && shortcut.lockIcon) {
            shortcut.lockIcon.classList.add('shake');
            setTimeout(() => shortcut.lockIcon.classList.remove('shake'), 300);
            return;
        }

        // Cancel any existing rebinding
        if (rebindingShortcut) {
            rebindingShortcut.keySpan.innerHTML = formatKeyDisplay(rebindingShortcut.key);
        }

        rebindingShortcut = shortcut;
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
            const newKey = getKeyString(event);
            rebindingShortcut.key = newKey;
            rebindingShortcut.keySpan.innerHTML = formatKeyDisplay(newKey);
            saveSettings();
            rebindingShortcut = null;
            return;
        }

        const pressedKey = getKeyString(event);

        for (const shortcut of shortcuts) {
            if (!shortcut.enabled) continue;
            if (shortcut.key === pressedKey) {
                shortcut.action();
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
