try {
	importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.1/full/pyodide.js");
	let pyodide = null;
	
	(async () => {
		console.log("Loading Pyodide");
		pyodide = await loadPyodide();
		console.log("Pyodide loaded");
		
		console.log("Running svinesti.py"); 
		console.log("    Fetching file.");

		const pythonScriptPath = "./svinesti.py";
		const response = await fetch(pythonScriptPath);
		console.log("    File fetched.");
		const code = await response.text()
		await pyodide.runPython(code);
		console.log("Done");

		pyodide.setStdout({ batched: (text) => console.log(text) });		
		

		console.log("Ready");
		self.postMessage({type: 'ready'})

		
		self.onmessage = async (event) => {

		console.log("Message received");
		let isolated_namespace = null;
		try {
				console.log("Setting up temporary namespace");
				// This lets us do the setup above only once, since we don't
				// pollute the namespace. 
				isolated_namespace = pyodide.globals.copy();

				const code = injectUserCode(event.data.level, event.data.code);

				console.log("Executing python script in isolated namespace")
				const result = pyodide.runPython(code, {globals: isolated_namespace});
				console.log("Script terminated") 
				self.postMessage({type: "execution-trace", trace: result.toJs({dict_converter: Object.fromEntries})});	
				
			} catch (e) {
				self.postMessage({type: "execution-failed", errorMessage: e.message});
			}
			finally {
				console.log("Destroying isolated namespace");
				isolated_namespace.destroy();	
			}
		}
	})()
} catch (e) {
	err("Pyodide setup failed:", e.message);
	console.log(e);
}


// TODO: this is maybe the reason I don't get error feedback. Every exception is "pass"? maybe.

function injectUserCode(levelJSON, userCode){
	const linesInUserCode = userCode.split("\n");
	const indent = "    "; // four spaces
	const indentedUserCode  = linesInUserCode
								.map(line => indent + line)
								.join("\n") + "\n" // terminate the last line also

// The indentation is important since we're dealing with pyhton code
// If you change any indentation below, it might not work.
return `
state = State(json.loads("""${levelJSON}"""))
def submitted_code():
${indentedUserCode}

try:
    submitted_code()
except GracefulExit:
    pass



state.messages` // the last statement gets returned to pyodide
}
