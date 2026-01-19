// Web Worker that runs student code in Pyodide (Python in WebAssembly).
// Loads once, then executes each submission in an isolated namespace.

importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.1/full/pyodide.js");

let pyodide = null;

async function init() {
	console.time("[worker] loadPyodide");
	pyodide = await loadPyodide();
	console.timeEnd("[worker] loadPyodide");

	pyodide.setStdout({ batched: (text) => console.log("[py stdout]", text) });
	pyodide.setStderr({ batched: (text) => console.error("[py stderr]", text) });

	// no-store: avoid stale code during development
	console.time("[worker] fetch svinesti.py");
	const response = await fetch("./svinesti.py", { cache: 'no-store' });
	if (!response.ok) {
		throw new Error(`Failed to fetch svinesti.py: ${response.status}`);
	}
	const engineCode = await response.text();
	console.timeEnd("[worker] fetch svinesti.py");

	console.time("[worker] run svinesti.py");
	await pyodide.runPython(engineCode);
	console.timeEnd("[worker] run svinesti.py");

	console.log("[worker] ready");
	self.postMessage({ type: 'ready' });
	self.onmessage = handleMessage;
}

async function handleMessage(event) {
	// Each execution gets a fresh namespace copy so student code can't
	// pollute globals or affect subsequent runs
	let isolatedNamespace = null;
	try {
		isolatedNamespace = pyodide.globals.copy();
		const userCode = injectUserCode(event.data.level, event.data.code);
		const result = pyodide.runPython(userCode, { globals: isolatedNamespace });
		self.postMessage({
			type: "execution-trace",
			trace: result.toJs({ dict_converter: Object.fromEntries })
		});
	} catch (e) {
		console.error("[worker] Execution failed:", e);
		self.postMessage({ type: "execution-failed", errorMessage: e.message });
	} finally {
		if (isolatedNamespace) {
			isolatedNamespace.destroy();  // prevent memory leak
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
