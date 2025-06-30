// Import Pyodide - Adjust path as needed if self-hosting
try {
	importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js");

    let pyodide = null;

    async function loadAndRunPyodide() {
        console.log("Worker: Loading Pyodide...");
        pyodide = await loadPyodide();
        console.log("Worker: Pyodide loaded.");

        // Capture Python stdout and send it back to main thread
        pyodide.setStdout({
            batched: (str) => {
                self.postMessage({ type: 'stdout', data: str });
            }
        });
         pyodide.setStderr({ // Capture stderr too
            batched: (str) => {
                self.postMessage({ type: 'error', data: `STDERR: ${str}` });
            }
        });


        // Signal main thread that Pyodide is ready
        self.postMessage({ type: 'ready' });

        self.onmessage = async (event) => {
            const pythonCode = event.data.pythonCode;
            console.log("Worker: Received Python code. Executing...");
            try {
                // runPythonAsync allows top-level await in the Python code
                // and integrates with the event loop for yielding.
                let results = await pyodide.runPythonAsync(pythonCode);
                console.log("Worker: Python execution finished. Result:", results);
                // Convert result to string if it's not easily serializable, or handle specific types
                let resultData = results;
                if (results && typeof results.toString === 'function') {
                    resultData = results.toString();
                } else if (results === undefined) {
                    resultData = "undefined (Check stdout/stderr for output)";
                }
                self.postMessage({ type: 'result', data: resultData });
            } catch (error) {
                console.error("Worker: Error executing Python code:", error);
                self.postMessage({ type: 'error', data: error.message });
            }
        };
    }

    loadAndRunPyodide();

} catch (e) {
     console.error("Worker: Failed to load Pyodide or initial setup error:", e);
     self.postMessage({ type: 'error', data: `Worker setup failed: ${e.message}` });
}

