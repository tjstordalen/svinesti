#!/usr/bin/env python3
"""Analyze JavaScript functions: list names, lengths, and usage counts."""

import re
import sys

def analyze_functions(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    functions = []
    current_func = None
    start_line = 0

    for i, line in enumerate(lines):
        match = re.match(r'^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', line)
        if match:
            if current_func:
                functions.append((current_func, i - start_line))
            current_func = match.group(1)
            start_line = i

    if current_func:
        functions.append((current_func, len(lines) - start_line))

    # Count usages
    content = ''.join(lines)
    results = []
    for func_name, length in functions:
        # Count all occurrences, subtract 1 for definition
        count = len(re.findall(r'\b' + func_name + r'\b', content)) - 1
        results.append((func_name, length, count))

    # Sort by length descending
    results.sort(key=lambda x: -x[1])

    for name, length, uses in results:
        print(f"{name:25} {length:3} lines   {uses:2} uses")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.js>")
        sys.exit(1)
    analyze_functions(sys.argv[1])
