importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.1/full/pyodide.js");

let pyodide = null;

async function init() {
	pyodide = await loadPyodide();
	pyodide.setStdout({ batched: (text) => console.log(text) });

	const response = await fetch("./svinesti.py", { cache: 'no-store' });
	if (!response.ok) {
		throw new Error(`Failed to fetch svinesti.py: ${response.status}`);
	}
	const engineCode = await response.text();
	await pyodide.runPython(engineCode);

	self.postMessage({ type: 'ready' });
	self.onmessage = handleMessage;
}

async function handleMessage(event) {
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
		self.postMessage({ type: "execution-failed", errorMessage: e.message });
	} finally {
		if (isolatedNamespace) {
			isolatedNamespace.destroy();
		}
	}
}

function injectUserCode(levelJSON, userCode) {
	const indent = "    ";
	const indentedUserCode = userCode
		.split("\n")
		.map(line => indent + line)
		.join("\n") + "\n";

	// Indentation matters — this is Python
	return `
state = State(json.loads("""${levelJSON}"""))
def submitted_code():
${indentedUserCode}

try:
    submitted_code()
except GracefulExit:
    pass

state.messages`;
}

init().catch(e => console.error("Worker initialization failed:", e));
