import js
import asyncio


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

        should_continue = await js.update_game_state(obj)
        if not should_continue:
            exit()
        
    def move(self):
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

        self.gui_update("move")
        if self.game_over:
            exit()
        

    # direction is either LEFT or RIGHT
    def turn(self, direction):
        self.dir += direction
        self.dir %= len(self.dirs)
        self.gui_update("turn right" if direction > 0 else "turn left")

    def isColor(self, c):
        result = self[self.pos].lower() == c.lower()
        self.gui_update("color " + c + "? " + str(result))
        return result
        
# We define these outside the state, and using a global state variable, so
# the student can type move() instead of s.move() or move(s)
# s = State(get_lvl())

def move():
    s.move()
        
def turnRight():
    s.turn(s.RIGHT)

def turnLeft():
    s.turn(s.LEFT)
    pass

def isRed():
    return s.isColor("r")

def isGreen():
    return s.isColor("g")

def isBlue():
    return s.isColor("b")



def get_lvl():
    return {
        "grid"     : [
                        "......bB",
                        ".....bb.",
                        "....bb..",
                        "...bb...",
                        "..bb....",
                        ".bb.....",
                        "bb......"
                    ],
        "pos"      : [6,0],
        "dir"      : 0
    } 
