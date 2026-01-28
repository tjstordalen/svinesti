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


#Sidebar
Being in custom levels in editor mode and switching to game mode persists the delete button



## Sidebar
After clicking the button to enable community levels, the info message does not disappear until the levels have actually been loaded


BUG??? when typing ? in the code editor, it opes the help menu and surpresses the keystroke

in animaitons.js, inline the pigspriteurl function into makeWalkKeyframes with a closure that captures the dir, and takes only the number 

- I notice that the default keyboard shortcuts for the editor do not appear in config.js ? 

- What do the storage keys STORAGE_KEY_EDITOR_EDIT/PAINT do ? I don't think we use them? 

Never mind, I see it now. append SHORTCUTS or similar. 

- I notice that the icon paths are not in the config file. Maybe they should be?

It looks like the code editor doesn't read the variables for tab indent etc)

