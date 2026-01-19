import sys
import json

# Svinesti is an educational programming game where students control a pig on a
# grid of colored squares. Some squares have stars. The goal is to write code
# that walks the pig over all stars to collect them. Students use move(),
# turnLeft(), turnRight(), isRed(), isGreen(), isBlue(). (turns are 90 degrees)
#
# Level format:
# {
#     "grid": [
#         "....rgbB",       r,g,b = red, green, blue tiles
#         ".....bb.",       R,G,B = tiles with a star on them
#         "....bb..",       . (dot) = empty tile
#         "...bb...",       Stepping on empty or leaving grid = lose
#         "..bb....",       Collecting all stars = win
#         ".bb.....",
#         "bb......"
#     ],
#     "start": [6,0],       starting [row, col]
#     "dir": "right"        "right", "down", "left", or "up"
# }
#
# The game ends immediately on win or loss. Students don't need to handle
# termination — we raise GracefulExit to interrupt their code cleanly.
# The engine traces all events and returns them to JS for animated playback.


class GracefulExit(Exception):
    """Raised to interrupt student code when game ends (win or loss)."""
    pass


# Direction constants
DIR_NAMES = ["right", "down", "left", "up"]
DIR_VECTORS = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # right, down, left, up
TURN_LEFT = -1
TURN_RIGHT = 1
MAX_OPS = 1000  # prevent infinite loops


class State:
    def __init__(self, level):
        self.grid = [list(row) for row in level["grid"]]
        self.pos = tuple(level["start"])
        self.dir = DIR_NAMES.index(level["dir"])
        self.messages = []
        self.op_count = 0

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

        prev = self.messages[-1]
        if prev["type"] == "lineExecuted":
            self.messages.pop()

        msg["lineno"] = prev["lineno"]
        self.messages.append(msg)

    def __getitem__(self, key):
        r, c = key
        out_of_bounds = r < 0 or c < 0 or r >= len(self.grid) or c >= len(self.grid[0])
        return '.' if out_of_bounds else self.grid[r][c]

    def __setitem__(self, key, value):
        r, c = key
        self.grid[r][c] = value

    def count_op(self):
        self.op_count += 1
        if self.op_count > MAX_OPS:
            self.trace({"type": "gameover", "win": False, "reason": "timeout"})
            raise GracefulExit


def _has_stars_remaining(state):
    return any(ch.isupper() for row in state.grid for ch in row)


def _do_move(state):
    dr, dc = DIR_VECTORS[state.dir]
    r, c = state.pos
    state.pos = (r + dr, c + dc)
    state.trace({"type": "move", "pos": state.pos, "dir": DIR_NAMES[state.dir]})

    tile = state[state.pos]
    if tile.isupper():
        state[state.pos] = tile.lower()
        state.trace({"type": "collected", "pos": state.pos, "dir": DIR_NAMES[state.dir]})
        if not _has_stars_remaining(state):
            state.trace({"type": "gameover", "win": True})
            raise GracefulExit
    elif tile == '.':
        state.trace({"type": "gameover", "win": False})
        raise GracefulExit


def _do_turn(state, direction):
    state.dir = (state.dir + direction) % len(DIR_VECTORS)
    state.trace({"type": "turn", "dir": DIR_NAMES[state.dir]})


def _do_is_color(state, color):
    result = state[state.pos].lower() == color[0].lower()
    state.trace({"type": "isColor", "color": color, "result": result})
    return result


# Public API — these reference the global `state` set by the injected code
def move():
    _do_move(state)

def turnRight():
    _do_turn(state, TURN_RIGHT)

def turnLeft():
    _do_turn(state, TURN_LEFT)

def isRed():
    return _do_is_color(state, "red")

def isGreen():
    return _do_is_color(state, "green")

def isBlue():
    return _do_is_color(state, "blue")


def line_tracer(frame, event, arg):
    """
    Python trace function that records which lines of student code execute.
    Only traces lines inside submitted_code(), converting global line numbers
    to student-relative line numbers (line 1 = first line of their code).
    """
    if event == "line" and frame.f_code.co_name == "submitted_code":
        global_line = frame.f_lineno
        function_start = frame.f_code.co_firstlineno
        user_line = global_line - function_start

        # lineMapping is set by PigJatin transpiler to map generated lines
        # back to original source lines so that we highlight the correct
        # lines when tracing the execution
        mapped = globals().get("lineMapping", {}).get(user_line, None)
        if mapped is not None:
            user_line = mapped

        state.trace({"type": "lineExecuted", "lineno": user_line})
        state.count_op()

    return line_tracer


sys.settrace(line_tracer)
