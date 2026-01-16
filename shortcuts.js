// shortcuts.js - Keyboard shortcut management system

const STORAGE_KEY = 'svinesti-shortcuts-v2';

const shortcuts = [];
let rebindingShortcut = null;  // Track which shortcut is being rebound

/**
 * Register a shortcut with an action and default hotkey
 * @param {string} id - Unique identifier for this shortcut (e.g., "focus-editor")
 * @param {string} name - Human-readable name for display (e.g., "Focus editor")
 * @param {Function} action - The function to call
 * @param {string} defaultKey - Default hotkey (e.g., "ctrl+enter", "?", "h")
 */
export function register(id, name, action, defaultKey) {
    shortcuts.push({
        id,
        name,
        action,
        defaultKey,
        key: defaultKey,
        enabled: true,
    });
}

/**
 * Initialize the shortcuts system and render UI into container
 * @param {HTMLElement} container - Element to render shortcut settings into
 */
export function initialize(container) {
    loadSettings();
    renderUI(container);
    attachKeyboardListener();
}

/**
 * Load shortcut settings from localStorage
 */
function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
 * Render the shortcuts UI
 */
function renderUI(container) {
    // Master toggle
    const masterToggle = document.createElement('div');
    masterToggle.className = 'shortcuts-master-toggle';
    masterToggle.innerHTML = `
        <label class="toggle-switch">
            <input type="checkbox" id="shortcuts-master-toggle" checked>
            <span class="toggle-slider"></span>
        </label>
        <span>Enable shortcuts</span>
        <span class="toggle-hint">or click individual shortcuts below</span>
    `;
    container.appendChild(masterToggle);

    const masterCheckbox = masterToggle.querySelector('input');
    masterCheckbox.checked = shortcuts.some(s => s.enabled);

    const ul = document.createElement('ul');
    ul.className = 'shortcuts-list';

    // Helper to update master checkbox based on individual states
    function updateMasterCheckbox() {
        masterCheckbox.checked = shortcuts.some(s => s.enabled);
    }

    for (const shortcut of shortcuts) {
        const li = document.createElement('li');
        if (!shortcut.enabled) li.classList.add('disabled');

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
            shortcut.li.classList.toggle('disabled', !enabled);
        }
        saveSettings();
    });

    container.appendChild(ul);
}

/**
 * Enter rebinding mode for a shortcut
 */
function startRebinding(shortcut, keySpan) {
    // Cancel any existing rebinding
    if (rebindingShortcut) {
        rebindingShortcut.keySpan.innerHTML = formatKeyDisplay(rebindingShortcut.key);
    }

    rebindingShortcut = shortcut;
    keySpan.innerHTML = '<kbd>...</kbd>';
}

/**
 * Attach global keyboard listener
 */
function attachKeyboardListener() {
    document.addEventListener('keydown', (event) => {
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
                event.preventDefault();
                shortcut.action();
                return;
            }
        }
    });
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
