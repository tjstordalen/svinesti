// Web Worker that runs student code in Pyodide (Python in WebAssembly).
// Loads once, then executes each submission in an isolated namespace.

import { MSG } from '../src/constants.js?v=@version-placeholder@';
import { PYODIDE_WORKER_URL, SVINESTI_PY_NO_CACHE } from '../src/config.js?v=@version-placeholder@';

let pyodide = null;
let engineCode = null;

async function init() {
	console.time("[worker] loadPyodide");
	const { loadPyodide } = await import(PYODIDE_WORKER_URL);
	pyodide = await loadPyodide();
	console.timeEnd("[worker] loadPyodide");

	pyodide.setStdout({ batched: (text) => console.log("[py stdout]", text) });
	pyodide.setStderr({ batched: (text) => console.error("[py stderr]", text) });

	console.time("[worker] fetch svinesti.py");
	const fetchOptions = SVINESTI_PY_NO_CACHE ? { cache: 'no-store' } : {};
	const response = await fetch("./svinesti.py", fetchOptions);
	if (!response.ok) {
		throw new Error(`Failed to fetch svinesti.py: ${response.status}`);
	}
	engineCode = await response.text();
	console.timeEnd("[worker] fetch svinesti.py");

	console.log("[worker] ready");
	self.postMessage({ type: MSG.READY });
	self.onmessage = handleMessage;
}

async function handleMessage(event) {
	// Each execution gets a fresh namespace with its own line_tracer and state,
	// so student code can't pollute globals or affect subsequent runs.
	let isolatedNamespace = null;
	try {
		isolatedNamespace = pyodide.globals.copy();
		pyodide.runPython(engineCode, { globals: isolatedNamespace });

	    const codeIsEmpty = event.data.code.replace(/\s+/g, '').length === 0; 
		if (codeIsEmpty) {
			self.postMessage({ type: MSG.FAILED, errorMessage: "No program was provided" });
			return
		}

		const userCode = injectUserCode(event.data.level, event.data.code);



		const result = pyodide.runPython(userCode, { globals: isolatedNamespace });
		self.postMessage({
			type: MSG.TRACE,
			trace: result.toJs({ dict_converter: Object.fromEntries })
		});
	} catch (e) {
		console.error("[worker] Execution failed:", e);
		self.postMessage({ type: MSG.FAILED, errorMessage: e.message });
	} finally {
		if (isolatedNamespace) {
			isolatedNamespace.destroy();
		}
	}
}

function injectUserCode(levelJSON, userCode) {
	// we are injecting their code into a function, so we have to indent
	// We're also being generous and replacing tabs with spaces 
	const indentedUserCode = userCode
		.split("\n")
		.map(line => "    " + line.replace(/\t/g, "    ")) 
		.join("\n");               

	return [
		`state = State(json.loads(${JSON.stringify(levelJSON)}))`,
		"def submitted_code():",  // we put the students code inside a function so
		indentedUserCode,         // that we can recover their line numbers.
		"",                       // line in function == line in student code
		"try:",
		"    submitted_code()",
		"except GracefulExit:",   // student program has control, so we "gracefully"
		"    pass",               // exit by throwing an exception
		"",
		"state.messages"          // the last statement is returned by pyodide to JS
	].join("\n");
}

init().catch(e => console.error("Worker initialization failed:", e));
