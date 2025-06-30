import sys
import json

# Brief summary
# Robuzzle is a small program designed to teach people who have never programmed
# before the basics of programming. The student controls a  robot on a grid consisting
# of colored squares. Some squares have stars on them. The goal is to write a program 
# that walks the robot over each of the stars, collecting them. We provide the functions 
# move, turnLeft, turnRight, isRed, isGreen, isBlue, and the student writes a simple
# program using these functions to collect the stars. (turnLeft/Right turns 90 degrees)
#
# The below JSON object describes the input format for the levels
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
# 
# The game ends immediately on a loss or a win. The student does not have to write
# code to exit an infinite loop, for instance, we take care of that ourselves.
# The program works with arbitrary characters as colors, as long as the dot remains
# an empty tile. The program writes a trace of everything relevant that happens and 
# returns it to pyodide when it finishes executing.

class State():
    # We assume the input has been checked and is valid
    def __init__(self, level): 
        self.messages = []
        # make each entry in the dict into a class member for convenience
        for key,value in level.items():
            setattr(self, key, value)
        
        self.grid = [list(s) for s in self.grid]
        self.dirs = [(0,1),(1,0),(0,-1),(-1,0)]
        self.dirs_to_string = ["right", "down", "left", "up"]
        self.pos  = tuple(self.pos) 
        self.LEFT = -1
        self.RIGHT = 1

        self.trace({"type": "initial_configuration", "data": json.dumps(level)}) 

    def trace(self, msg):
       self.messages.append(json.dumps(msg))

    def __getitem__(self, key):
        r,c = key
        out_of_bounds =  r < 0 or c < 0 or r >= len(self.grid) or c >= len(self.grid[0])
        return '.' if out_of_bounds else self.grid[r][c]

    def __setitem__(self, key, value):
        r,c = key
        self.grid[r][c] = value

def move_aux(s):
    dr,dc = s.dirs[s.dir]
    r,c = s.pos
    s.pos = (r+dr, c+dc)
    s.trace({"type": "move", "newPos": s.pos})

    ch = s[s.pos]
    if ch.isupper():
        s[s.pos] = ch.lower()
        s.trace({"type": "collected", "pos": s.pos})
        if not any(c.isupper() for lists in s.grid for c in lists):
            s.game_won = True
            s.trace({"type": "gameover", "win": True})
            # Pyodide throws an exception on sys exit, so we throw an
            # exception ourselves and catch it to exit "gracefully"
            raise SystemExit 
    elif ch == '.':
        s.trace({"type": "gameover", "win": False})
        raise SystemExit

def turn_aux(s,direction):
    s.dir += direction
    s.dir %= len(s.dirs)
    s.trace({"type": "turn", "new_direction": s.dirs_to_string[s.dir]})

def is_color_aux(s, c):
    result = s[s.pos].lower() == c.lower()
    s.trace({"type": "isColor", "color": c, "result": result});
    return result

# In the following functions, we refer to 'state'. When we call the user code,
# we will do state = State(level) so these functions work correctly
def move():
    move_aux(state)

def turnRight():
    turn_aux(state, state.RIGHT)

def turnLeft():
    turn_aux(state, state.LEFT)

def isRed():
    return is_color_aux(state, "r")

def isGreen():
    return is_color_aux(state, "g")

def isBlue():
    return is_color_aux(state, "b")


# when we do sys.settrace(line_tracer) below, this function will execute for every
# line of python code that executes.
def line_tracer(frame, event, arg):
    # From pydocs: "co_name: name with which this code object was defined".  As far
    # as I can tell, if the thing being executed is inside a function, 'co_name'
    # is the function name. Otherwise, the thing being executed is a statement in the 
    # 'global' (i.e., module)  scope, in which case it gets the module name.
    current_function_or_module = frame.f_code.co_name 

    # a line is being executed
    if event == "line":
        # name of the function we wrap the submitted code in
        if current_function_or_module == "submitted_code":
            current_global_line      = frame.f_lineno
            first_line_of_function   = frame.f_code.co_firstlineno
            user_line_being_executed = current_global_line - first_line_of_function
            state.trace({"type": "lineExecuted", "lineno": user_line_being_executed})
   
   # The trace function needs to return the next trace function to use
    return line_tracer

sys.settrace(line_tracer)
