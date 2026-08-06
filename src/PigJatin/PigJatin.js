
import antlr4 from "antlr4";
import PigJatinLexer from "./antlr/PigJatinLexer.js";
import PigJatinParser from "./antlr/PigJatinParser.js";
import { StaticAnalysisVisitor, TranspilationVisitor } from "./visitors.js?v=@version-placeholder@";
import { SyntaxErrorListener, UnrecognizedTokenErrorListener } from "./ErrorListeners.js?v=@version-placeholder@";
import { ERRORS, ERROR_TYPES } from "./errors.js?v=@version-placeholder@";

export function generatePythonCode(program){
	
	const tokenizationErrors = new UnrecognizedTokenErrorListener(program);
	const syntacticErrors    = new SyntaxErrorListener(program);
	const semanticErrors     = new StaticAnalysisVisitor();
	const transpiler       = new TranspilationVisitor();

	const chars = new antlr4.InputStream(program);

	const lexer = new PigJatinLexer(chars);
	lexer.removeErrorListeners();
	lexer.addErrorListener(tokenizationErrors);


	const tokens = new antlr4.CommonTokenStream(lexer);

	const parser = new PigJatinParser(tokens);
	parser.removeErrorListeners();
	parser.addErrorListener(syntacticErrors);

	const parseTree = parser.program();

	let error = tokenizationErrors.error;
	if (error.type === ERROR_TYPES.OK) error = syntacticErrors.error;
	if (error.type === ERROR_TYPES.OK) {
		semanticErrors.visit(parseTree);
		error = semanticErrors.error;
	}
	

	const success = error.type === ERROR_TYPES.OK;
	const pythonCode = success ? transpiler.visit(parseTree) : "N/A"; 
	return [success, error, pythonCode];
}

export async function loadTestCases(filePath){
    const response = await fetch(filePath);
	const testData = await response.text();

	// Pre-process the test cases and check for malformed input, etc
	const lines = ( () => {
		const rawLines = testData .split(/\r\n|\r|\n/g);
		
		const illegalDirective = rawLines.findIndex(line => {
			const hasDirective = line.includes("#EXPECT");
			const notAtStart   = !line.startsWith("#EXPECT");
			const notAComment  = !line.startsWith("//");
			return hasDirective && notAtStart && notAComment; 
		});

		if (illegalDirective >= 0) {
			console.error(`ERROR in line ${illegalDirective}: the #EXPECT directive needs to be at the start of the line`);
			return;
		}

		const linesWhereAnonymousTestsAreNamed = rawLines.map((e,i) => {
			if (!e.startsWith("#EXPECT")) return e;
			let words = e.split(" ").filter(w => w !== "");
			
			if (words.length === 1) {
				console.error(`ERROR on line ${i}: the #EXPECT directive is missing the expected error type`);
				return;
			}

			const errorType = words[1];
			if (!ERROR_TYPES[errorType]){
				console.error(`ERROR on line ${i}: '${errorType}' is not a valid error type`);
				return;
			}


			if (words.length === 2) {
				const defaultName = errorType + "_" + (i+1).toString();
				words.push(defaultName);
			}

			
			return words.join(" ");
		});

		const linesWithoutComments = linesWhereAnonymousTestsAreNamed.filter(line => !line.startsWith("//"));

		const firstNonEmptyLineIsDirective = linesWithoutComments.find(line => line.trim() !== "").startsWith("#EXPECT");
		if ( !firstNonEmptyLineIsDirective ) {
			console.error("ERROR: cannot have any text (except comments) before the first #EXPECT directive");
			return;
		}

		return linesWithoutComments;

	})()
	
	const directivePositions = lines.map((e,i) => e.startsWith("#EXPECT") ? i : null).filter(x => x !== null);
	const caseSlices = directivePositions.map( (_,i,ar) => [ar[i], ar[i+1] ?? lines.length])
	
	let testCases = []
	
	for (let slice of caseSlices){
		const [a,b] = slice;
		const [EXPECT_DIRECTIVE,expectedResult,testName] = lines[a].split(" ");
		const program = lines.slice(a+1,b).join("\n");
		testCases.push( {
			name: testName,
			expected: expectedResult,
			program: program,
		});
	}
	return testCases;
}

export function runTests(cases){
	let nSucceeded = 0;
	let nFailed = 0;

    for (let c of cases){
		const [allOk, err, pythonCode]  = generatePythonCode(c.program);
		const result = err.type;
		if (!result || result !== c.expected) {
			console.error(`TEST '${c.name}' FAILED! Expected '${c.expected}' but got '${result}' instead for the program: '${c.program}'`);
			nFailed++;
			console.log(err.msg)
		}
		else {
			nSucceeded++;
		}
	}

	console.log(`Testing complete: ${nSucceeded} tests succeeded, ${nFailed} tests failed`)
}
