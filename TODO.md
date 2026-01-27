# TODO

## Unify pig sprite rendering

Currently pig sprites are rendered three different ways:

| Context | Method |
|---------|--------|
| Main game | `#pig` element inside tile |
| Editor tiles | `.tile.pig-*` background-image |
| Mini-grid | `.tile.pig-*::after` pseudo-element |

Editor tiles and mini-grid could use the same `::after` approach for consistency. Would require JS changes in `editor.js`.

## Security

Link-shared levels bypass server validation and could contain malicious data.
Consider sanitizing at import time rather than at render time.

## API consistency

Rename Game.selectLevel to Game.load for API consistency with Editor.load.

## Community levels

- Compact the level before sending
- Import levels into local list

## Delete from custom list

Add functionality to delete from the custom list. This should work as follows: there should be a trash icon, which, when clicked, adds a trash icon to all the levels. The students can then select the levels to delete (maybe add a trash icon on all of them to illustrate) and confirm by clicking the delete button.

## UI

Color the playback icon white
