import antlr4 from 'https://cdn.jsdelivr.net/npm/antlr4@4.13.2/+esm';
import PigJatinLexer from "./antlr/PigJatinLexer.js";
import PigJatinParser from "./antlr/PigJatinParser.js";
import { StaticAnalysisVisitor, TranspilationVisitor } from "./visitors.js";
import { SyntaxErrorListener,  UnrecognizedTokenErrorLister } from "./ErrorListeners.js";
import { ERROR_TYPES } from "./errors.js";
import { Token } from "antlr4";

const input = document.getElementById("input");
const code = document.getElementById("code");
code.innerText = "";


const runProgram = (program) => {

	// TODO: FIX THIS. THIS IS AN UGLY HACK. UPDATE THE GRAMMAR INSTEAD
	// TODO: make another ugly hack for comments...
	program = program.replace(/\( +/g,"(");
	
	const tokenizationErrors = new UnrecognizedTokenErrorLister(program);
	const syntacticErrors    = new SyntaxErrorListener(program);
	const semanticErrors     = new StaticAnalysisVisitor();
	const transpilator       = new TranspilationVisitor();

	const chars = new antlr4.InputStream(program);

	const lexer = new PigJatinLexer(chars);
	lexer.removeErrorListeners();
	lexer.addErrorListener(tokenizationErrors);

	const tokens = new antlr4.CommonTokenStream(lexer);

	const parser = new PigJatinParser(tokens);
	parser.removeErrorListeners();
	parser.addErrorListener(syntacticErrors);

	const parseTree = parser.program();

	

	let error = tokenizationErrors.error ?? syntacticErrors.error;
	if (error) return error;
	else {
		semanticErrors.visit(parseTree);
		error = semanticErrors.error;
	}

	error.parseTree = parseTree.toStringTree();
	error.pythonCode = transpilator.visit(parseTree); 

	return error;
}


let counter = 0;
document.addEventListener('keydown', function(event) {
  if (event.ctrlKey && event.keyCode === 13) {
    counter += 1;
	code.innerText = `Iteration ${counter}\n\n\n` 
	const program = input.value;
	runProgram(program);
  }
});



async function generateTestCases(){
    const response = await fetch("./testcases.txt");
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

function logTwoColumns(left, right, gap = 2) {
  left = left ?? "MISSING"
  right = right ?? "MISSING"
  const lLines = left.split('\n');
  const rLines = right.split('\n');
  let maxLen = Math.max(...lLines.map(s => s.length));
  maxLen = 50;
  const lines = Math.max(lLines.length, rLines.length);
  const out = [];

  for (let i = 0; i < lines; i++) {
    const l = (lLines[i] || '').padEnd(maxLen + gap);
    const r = rLines[i] || '';
    out.push(l + r);
  }

  return out.join('\n');
}

function runTests(cases){
	let nSucceeded = 0;
	let nFailed = 0;

	const results = [];

    for (let c of cases){
		const err = runProgram(c.program);
		const result = err.type;
		if (!result || result !== c.expected) {
			console.error(`TEST '${c.name}' FAILED! Expected '${c.expected}' but got '${result}' instead for the program: '${c.program}'`);
			nFailed++;
		}
		else {
			nSucceeded++;
		}
		if (err.type !== ERROR_TYPES.SYNTAX_ERROR && err.type !== ERROR_TYPES.UNRECOGNIZED_TOKEN) {
			results.push(logTwoColumns(err.pythonCode, c.program))
		}
	}


	code.innerText = results.join("\n------------------\n");
	
	console.log(`Testing complete: ${nSucceeded} tests succeeded, ${nFailed} tests failed`)
}


generateTestCases().then(runTests);
