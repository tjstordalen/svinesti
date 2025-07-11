const log = (msg) => console.log("Worker:", msg)
const err = (msg) => console.error("Worker:",msg)

try {
	importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js");
	let pyodide = null;
	
	(async () => {
		log("Loading Pyodide");
		pyodide = await loadPyodide();
		log("Pyodide loaded");
		
		log("Running svinesti.py"); 
		log("    Fetching file.");

		const pythonScriptPath = "./svinesti.py";
		const response = await fetch(pythonScriptPath);
		log("    File fetched.");
		const code = await response.text()
		await pyodide.runPython(code);
		log("Done");

		
		


		pyodide.setStdout({ batched: (str) => log("Python stdout:", str) });
		pyodide.setStderr({ batched: (str) => err("Python stderr:", str) });
		
		log("Ready");
		self.postMessage({type: 'ready'})

		
		self.onmessage = async (event) => {
		
		const level = `{
			"grid": [
				"......bB",
				".....bb.",
				"....bb..",
				"...bb...",
				"..bb....",
				".bb.....",
				"bb......"
			],
			"pos": [6,0],
			"dir": 0
		}`

		log("Message received");
		let isolated_namespace = null;
		try {
				log("Setting up temporary namespace");
				// This lets us do the setup above only once, since we don't
				// pollute the namespace. 
				isolated_namespace = pyodide.globals.copy();

				const code = injectUserCode(level, event.data.code);

				log("Executing python script in isolated namespace")
				const result = pyodide.runPython(code, {globals: isolated_namespace});
				log("Script terminated") 
				self.postMessage({type: "execution-trace", trace: result.toJs({dict_converter: Object.fromEntries})});	
				
			} catch (e) {
				err("Script execution failed with message:", e.message);
				console.log(e)
			}
			finally {
				log("Destroying isolated namespace");
				isolated_namespace.destroy();	
			}
		}
	})()
} catch (e) {
	err("Pyodide setup failed:", e.message);
	console.log(e);
}

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
except SystemExit:
    pass
finally:
    sys.settrace(None)

state.messages` // the last statement gets returned to pyodide
}
