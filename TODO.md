# TODO

## Unify pig sprite rendering

Currently pig sprites are rendered three different ways:

| Context | Method |
|---------|--------|
| Main game | `#pig` element inside tile |
| Editor tiles | `.tile.pig-*` background-image |
| Mini-grid | `.tile.pig-*::after` pseudo-element |

Editor tiles and mini-grid could use the same `::after` approach for consistency. Would require JS changes in `editor.js`.
