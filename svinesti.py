import sys
import json
import js

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
#     "start": [6,0], starting position [row,col] for robot
#     "dir": 0        the direction the bot is facing, 0,1,2,3 = right,down,left,up
# }
# 
# The game ends immediately on a loss or a win. The student does not have to write
# code to exit an infinite loop, for instance, we take care of that ourselves.
# The program works with arbitrary characters as colors, as long as the dot remains
# an empty tile. The program writes a trace of everything relevant that happens and 
# returns it to pyodide when it finishes executing.


class GracefulExit(Exception):
    """ We do not require that the student's program quits when the game is over.
    However, our code is passively being called by the submitted code. Therefore
    when we detect that the game is over, we raise an exception to interrupt the
    subitted code, catch that exception, and then exit 'gracefully'.... """
    pass

# Direction names for external representation (levels and trace messages)
DIR_NAMES = ["right", "down", "left", "up"]

class State():
    # We assume the input has been checked and is valid
    def __init__(self, level): 


        self.messages = []
        # make each entry in the dict into a class member for convenience
        for key,value in level.items():
            setattr(self, key, value)

        # Convert string direction to integer for internal use
        self.dir = DIR_NAMES.index(self.dir)

        self.grid = [list(s) for s in self.grid]
        self.dirs = [(0,1),(1,0),(0,-1),(-1,0)]
        self.pos  = tuple(self.start)  # current position, initialized from start
        self.LEFT = -1
        self.RIGHT = 1
        self.nOps = 0 

    def trace(self, msg):
        # Line tracing emits lineExecuted BEFORE the line runs, so the trace looks like:
        #   lineExecuted(4), move, lineExecuted(5), turn, ...
        #
        # For animated actions (move, turn, isColor), we want to highlight the line
        # AS the animation plays. So we pop the preceding lineExecuted and attach
        # its line number to the action:
        #   move(line=4), turn(line=5), ...
        #
        # Remaining lineExecuted events (loops, arithmetic) get an artificial delay
        # in the JS playback so students can follow the code flow.
        #
        # Consequences (collected, gameover) inherit the line from the action that
        # caused them, so the entire causal chain knows which line triggered it.

        if msg["type"] == "lineExecuted":
            self.messages.append(msg)
            return

        prev = self.messages[-1];
        if prev["type"] == "lineExecuted":
            self.messages.pop()

        msg["lineno"] = prev["lineno"];
        self.messages.append(msg)

    def __getitem__(self, key):
        r,c = key
        out_of_bounds =  r < 0 or c < 0 or r >= len(self.grid) or c >= len(self.grid[0])
        return '.' if out_of_bounds else self.grid[r][c]

    def __setitem__(self, key, value):
        r,c = key
        self.grid[r][c] = value
    
    def count_op(self):
        self.nOps += 1
        if (self.nOps > 10000):
            raise GracefulExit

def move_aux(s):
    s.count_op()
    dr,dc = s.dirs[s.dir]
    r,c = s.pos
    s.pos = (r+dr, c+dc)
    s.trace({"type": "move", "pos": s.pos, "dir": DIR_NAMES[s.dir]})

    ch = s[s.pos]
    if ch.isupper():
        s[s.pos] = ch.lower()
        s.trace({"type": "collected", "pos": s.pos, "dir": DIR_NAMES[s.dir]})
        if not any(c.isupper() for lists in s.grid for c in lists):
            s.game_won = True
            s.trace({"type": "gameover", "win": True})
            # Pyodide throws an exception on sys exit, so we throw an
            # exception ourselves and catch it to exit "gracefully"
            raise GracefulExit 
    elif ch == '.':
        s.trace({"type": "gameover", "win": False})
        raise GracefulExit

def turn_aux(s,direction):
    s.count_op()
    s.dir += direction
    s.dir %= len(s.dirs)
    s.trace({"type": "turn", "dir": DIR_NAMES[s.dir]})

def is_color_aux(s, c):
    s.count_op()
    result = s[s.pos].lower() == c[0].lower()
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
    return is_color_aux(state, "red")

def isGreen():
    return is_color_aux(state, "green")

def isBlue():
    return is_color_aux(state, "blue")


def traceLineToExecute(lineno):
    state.trace({"type": "lineExecuted", "lineno": lineno})


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
            
            # get the mapped line if it exists
            new_line = globals().get("lineMapping", {}).get(user_line_being_executed, None)
            if new_line != None:
                user_line_being_executed = new_line


            state.trace({"type": "lineExecuted", "lineno": user_line_being_executed})
   
   # The trace function needs to return the next trace function to use
    return line_tracer

sys.settrace(line_tracer)
