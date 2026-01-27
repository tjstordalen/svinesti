// main.gs - API endpoints for community levels
//
// SETUP:
// 1. Create a Google Sheet with columns: Timestamp | UID | Level | Stars
// 2. Extensions > Apps Script
// 3. Create two files: names.gs and main.gs
// 4. Paste the respective code into each
// 5. Deploy > New deployment > Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy URL, update COMMUNITY_URL in the JS codebase

// -----------------------------------------------------------------------------
// LEVEL VALIDATION
// -----------------------------------------------------------------------------

function decodeLevel(base64) {
    try {
        var bytes = Utilities.base64Decode(base64);
        var json = Utilities.newBlob(bytes).getDataAsString();
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

function encodeLevel(level) {
    var json = JSON.stringify(level);
    var bytes = Utilities.newBlob(json).getBytes();
    return Utilities.base64Encode(bytes);
}

function validateLevel(level) {
    if (!level) return 'Invalid base64 or JSON';
    if (typeof level.nRows !== 'number' || level.nRows < 1) return 'Invalid nRows';
    if (typeof level.nCols !== 'number' || level.nCols < 1) return 'Invalid nCols';
    if (!Array.isArray(level.grid)) return 'Invalid grid';
    if (!Array.isArray(level.start) || level.start.length !== 2) return 'Invalid start';
    if (['right', 'down', 'left', 'up'].indexOf(level.dir) === -1) return 'Invalid dir';

    var nCols = level.nCols;
    var grid = level.grid;
    var start = level.start;

    if (!grid.join('').match(/[RGB]/)) {
        return 'Level must have at least one target';
    }

    // Pad each row with '.' sentinels on left and right.
    // This lets us use i+1/i-1 for horizontal neighbors without
    // accidentally wrapping to the adjacent row.
    var cells = grid.map(function(row) { return '.' + row + '.'; }).join('').split('');
    var stride = nCols + 2; // padded row width
    var pigIndex = start[0] * stride + start[1] + 1; // +1 for left padding

    if (cells[pigIndex] === '.') {
        return 'Pig must be on a colored tile';
    }

    // Flood-fill from pig position, marking visited cells as '.'
    function dfs(i) {
        var c = cells[i] || '.';
        if (c === '.') return;
        cells[i] = '.';
        // Horizontal neighbors are safe due to sentinels
        // Vertical neighbors use stride to skip padding
        dfs(i + 1);
        dfs(i - 1);
        dfs(i + stride);
        dfs(i - stride);
    }
    dfs(pigIndex);

    // If any colored tiles remain, they weren't reachable
    if (cells.some(function(c) { return c !== '.'; })) {
        return 'All colored tiles must be reachable from the pig';
    }

    return null;
}

// -----------------------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------------------

// GET: Conditional fetch
// ?v=<num> — if current, returns just version; otherwise version + data
// ?v= or no param — always returns version + data
function doGet(e) {
    try {
        var props = PropertiesService.getScriptProperties();
        var currentVersion = props.getProperty('version') || '0';
        var clientVersion = e.parameter.v;

        // Client is up to date — return just version
        if (clientVersion === currentVersion) {
            return ContentService.createTextOutput(currentVersion);
        }

        // Client needs data — return version + levels
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var data = sheet.getDataRange().getValues();
        var lines = [];
        for (var i = 1; i < data.length; i++) {
            var level = data[i][2];
            if (!level) continue;
            var rawStars = data[i][3];
            var stars = (typeof rawStars === 'number') ? rawStars : 0;
            lines.push(level + '\t' + stars);
        }

        return ContentService.createTextOutput(currentVersion + '\n' + lines.join('\n'));
    } catch (err) {
        return ContentService.createTextOutput('Error: ' + err.message);
    }
}

// POST: Submit a new level or star/unstar
// Submit: { level: "base64-encoded-json" }
// Star:   { action: "star", uid: "...", starred: true/false }
function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        // --- Star/unstar action ---
        if (data.action === 'star') {
            if (!data.uid) {
                return ContentService.createTextOutput(JSON.stringify({ error: 'Missing uid' }));
            }

            var finder = sheet.getRange('B:B').createTextFinder(data.uid).matchEntireCell(true);
            var cell = finder.findNext();
            if (!cell) {
                return ContentService.createTextOutput(JSON.stringify({ error: 'Level not found' }));
            }

            var row = cell.getRow();
            var starsCell = sheet.getRange(row, 4);  // Column D
            var current = starsCell.getValue() || 0;
            var newValue = data.starred ? current + 1 : Math.max(0, current - 1);
            starsCell.setValue(newValue);

            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                stars: newValue
            }));
        }

        // --- Submit new level ---
        if (!data.level) {
            return ContentService.createTextOutput(JSON.stringify({ error: 'Missing level data' }));
        }

        var level = decodeLevel(data.level);
        var validationError = validateLevel(level);
        if (validationError) {
            return ContentService.createTextOutput(JSON.stringify({ error: validationError }));
        }

        // Check/fix name (uses functions from names.gs)
        var nameChanged = false;
        if (!isValidLevelName(level.name)) {
            level.name = generateLevelName();
            nameChanged = true;
        }

        // Check/generate UID
        if (!level.uid || typeof level.uid !== 'string' || level.uid.length < 4) {
            level.uid = generateUID(8);
        }

        // Append: Timestamp | UID | Level | Stars
        sheet.appendRow([
            new Date(),
            level.uid,
            encodeLevel(level),
            0
        ]);

        // Increment version for polling
        var props = PropertiesService.getScriptProperties();
        var version = parseInt(props.getProperty('version') || '0', 10);
        props.setProperty('version', String(version + 1));

        var result = {
            success: true,
            name: level.name,
            uid: level.uid
        };
        if (nameChanged) {
            result.nameChanged = true;
        }

        return ContentService.createTextOutput(JSON.stringify(result));
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.message }));
    }
}

