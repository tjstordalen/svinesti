`
# This template string is what we use to combine the level to play, the
# submitted code, and the game model into one file. We also add 
# instrumentation to add "debugging" features to their submitted code
# The three variables setupScript (i.e., the code running the checker) 
# levelToPlay and sumittedCode must be defined in the JS file where this
# template is used. Each line in submittedCode must be indented
# by exactly four spaces prior to injection.
import sys
import json

${setupScript}

level = ${levelToPlay}
s = State(json.load(level)) 

def move():
    s.move()

def turnRight():
    s.turn(s.RIGHT)

def turnLeft():
    s.turn(s.LEFT)

def isRed():
    return  s.isColor("r")

def isGreen():
    return  s.isColor("g")

def isBlue():
    return s.isColor("b")

# The submitted code needs to be indented by four spaces prior to injection
def submitted_solution():
${submittedCode}

def line_tracker(frame, event, arg):
    if event == "line":
        # check the line is in the submitted code
        if frame.f_code.co_name == "submitted_solution":
            # convert global line number to line number in
            # the submitted code
            first_line = frame.f_code.co_firstlineno
            relative_line = frame.f_lineno - first_line
            s.trace({"msg": "lineToExecute", "lineno": relative_line})
    return line_tracker
try:
    sys.settrace(line_tracker)
    submitted_solution()
except SystemExit:
    pass
finally: 
    sys.settrace(None)
# The last statement is returned to Pyodide
s.messages
`
