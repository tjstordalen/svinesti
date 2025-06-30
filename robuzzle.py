import asyncio
import sys
import json

running_in_pyodide = "pyodide" in sys.modules
if running_in_pyodide:
    import js

# Brief summary
# Robuzzle is a small program designed to teach people who have never programmed
# before the basics of programming. The student controls a  robot on a grid consisting
# of colored squares. Some squares have stars on them. The goal is to write a program 
# that walks the robot over each of the stars, collecting them. We provide the functions 
# move, turnLeft, turnRight, isRed, isGreen, isBlue, and the student writes a simple
# program using these functions to collect the stars. (turnLeft/Right turns 90 degrees)
# {
#     "grid": [
#         "....rgbB",       r,g,b means red, green, blue tiles
#         ".....bb.",       R,G,B additionally have a star on them
#         "....bb..",       . (dot) is an "empty" tile.
#         "...bb...",       Stepping on an empty tile or leaving the
#         "..bb....",       grid loses the game.
#         ".bb.....",       Collecting all the stars wins the game.
#         "bb......"
#     ],
#     "pos": [6,0],   starting position [row,col] for robot
#     "dir": 0        the direction the bot is facing, 0,1,2,3 = right,down,left,up
# }

class State():
    # We assume the input has been checked and is valid
    def __init__(self, level): 
        # make each entry in the dict into a class member. 
        for key,value in level.items():
            setattr(self, key, value)
        
        self.grid = [list(s) for s in self.grid]
        self.dirs = [(0,1),(1,0),(0,-1),(-1,0)]
        self.pos  = tuple(self.pos) 
        self.RIGHT = 1
        self.LEFT  = -1
        self.game_over = False
        self.won = False

    def __getitem__(self, key):
        r,c = key
        out_of_bounds =  r < 0 or c < 0 or r >= len(self.grid) or c >= len(self.grid[0])
        return '.' if out_of_bounds else self.grid[r][c]
    
    async def gui_update(self, msg):
        obj = {
            "message": msg,
            "grid": ["".join(row) for row in self.grid],
            "pos": list(self.pos),
            "dir": self.dir,
            "game_over": self.game_over,
            "won": self.won,          
        } 
        promise = js.update_game_state(json.dumps(obj))
        should_continue = True if not running_in_pyodide else await promise
        if not should_continue:
            # Pyodide does not seem to suport sys.exit()
            # and trows an exception of its own
            # So we throw an exception, and catch it 
            # below so that we can exit "gracefully"
            raise SystemExit
        
    async def move(self):
        dr,dc = self.dirs[self.dir]
        r,c = self.pos
        r += dr
        c += dc
        self.pos = (r,c)

        ch = self[r,c]
        if ch.isupper():
            self.grid[r][c] = ch.lower()
        elif ch == '.':
            self.game_over = True
            self.won = False
    
        if not any(c.isupper() for lists in self.grid for c in lists):
            self.game_over = True
            self.won = True

        await self.gui_update("move")
        if self.game_over:
            # See above
            raise SystemExit

    # direction is either LEFT or RIGHT
    async def turn(self, direction):
        self.dir += direction
        self.dir %= len(self.dirs)
        await self.gui_update("turn right" if direction > 0 else "turn left")

    async def isColor(self, c):
        result = self[self.pos].lower() == c.lower()
        await self.gui_update("color " + c + "? " + str(result))
        return result
        
# We define these outside the state, and using a global state variable, so
# the student can type move() instead of s.move() or move(s)
s = None 

async def move():
    await s.move()

async def turnRight():
    await s.turn(s.RIGHT)

async def turnLeft():
    await s.turn(s.LEFT)

async def isRed():
    return await s.isColor("r")

async def isGreen():
    return await s.isColor("g")

async def isBlue():
    return await s.isColor("b")

async def test():
    level = {
        "grid"     : [
                        "......rB",
                        ".....rr.",
                        "...grrr.",
                        "...rrr..",
                        "..rr....",
                        "rrrg....",
                        "rr......"
                    ],
        "pos"      : [6,0],
        "dir"      : 0
    } 
    try: 
        global s
        s = State(level)
        while True:
            await move()
            await turnLeft()
            await move()
            await turnRight()
    except SystemExit as e:
        pass
