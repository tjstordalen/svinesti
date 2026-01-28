
const errorTypes = [
	"OK",                               // no error occured 
	"UNKNOWN_ERROR",                    // should not happen. Might have missed a case 
	"UNUSED_EXPRESSION_FUNCTION",       // calling e.g. isBlue() without using the result
	"ILLEGAL_FUNCTION_NAME",            // legal: move(), turnLeft/Right(), isBlue/Green/Red() 
	"DUPLICATE_DECLARATION",            // declaring already declared variable, or any attempt at shadowing
	                                    // a variable. We disallow shadowing to prevent confusion among the students.
	"INCORRECT_ASSIGNMENT_TYPE",        // the right hand side has the wrong type
	"OUT_OF_SCOPE",                     // using a variable which was declared at some point, but has gone out of scope
	"UNDECLARED_VARIABLE",              // the var was never declared 
	"NON_BOOLEAN_CONDITION",            // an if/while condition that is not boolean
	"INVALID_ARGUMENT_TYPE",            // e.g., 3 + true 
	"VOID_FUNCTION_IN_EXPRESSION",      // e.g., 1 + move() 

	"SYNTAX_ERROR",                     // any error that cause the program not to parse
	"UNRECOGNIZED_TOKEN",               // any token that does not appear in the grammar
]

// After this, ERROR_TYPES.<some_error_type> = "<some_error_type>" so we can read 
// the enum values as strings from files as well
export const ERROR_TYPES = Object.fromEntries(errorTypes.map(err => [err,err])); 

export const ERRORS = {

	OK: {msg: "no error", line: "N/A", type: ERROR_TYPES.OK},

	unknownError: (codeThrowingAnError) => {
		const err = {};
		err.line = "N/A";
		err.msg  = `ERROR: An unknown error occurred in the code '${codeThrowingAnError}'. Talk to a teaching assistant.`;
		err.type = ERROR_TYPES.UNKNOWN_ERROR;
		return err;
	},
	warnUnusedExpressionFunction: (line, id) => {
		const err = {};
		err.line = line;
		err.msg  =  `WARNING (line ${line}): You are calling '${id}' without doing anything with the result. Did you forget an if-statement, or did you want to use another function? `;
		err.type = ERROR_TYPES.UNUSED_EXPRESSION_FUNCTION;
		return err;
	},

	illegalFunctionName: (line,name) => {
		const err = {};
		err.line = line;
		err.msg  = `ERROR (line ${line}): the function '${name}' is not defined. If you think it should be, check the capitalization of the letters in the function name. Identifiers are case-sensitive.`;  
		err.type = ERROR_TYPES.ILLEGAL_FUNCTION_NAME;
		return err;
	},

	duplicateDeclaration: (line, id) => {
		const err = {};
		err.line = line;
		err.msg =  `ERROR (line ${line}):  Double declaration of variable '${id}'. In Java, this is sometimes legal (it is referred to as 'shadowing') but it can be confusing, so its a good idea to stay clear of it to begin with.`;
		err.type = ERROR_TYPES.DUPLICATE_DECLARATION;
		return err;
	},

	incorrectTypeInAssignment: (line, varId,varType, exprType) => {
		const err = {};
		err.line = line;
		err.msg = `ERROR (line ${line}): Assigning an expression of type ${exprType} to the variable '${varId}' which has type ${varType}.` 
		err.type = ERROR_TYPES.INCORRECT_ASSIGNMENT_TYPE;
		return err;
	},

	outOfScope: (line, id) => {
		const err = {}; 
		err.line = line;
		err.msg  = `ERROR (line ${line}): The variable '${id}' is not declared. It did exist at some point, but has gone out of scope. If you declare '${id}' inside a block (between '{' and '}') you cannot use it outside the block. without declaring it again.`;
		err.type = ERROR_TYPES.OUT_OF_SCOPE;
		return err;
	},

	undeclaredVariable: (line, id) => {
		const err = {}; 
		err.line = line;
		err.msg  = `ERROR (line ${line}): The variable '${id}' has not been declared.`;
		err.type = ERROR_TYPES.UNDECLARED_VARIABLE;
		return err;
	},

	conditionIsNotBoolean: (line, constructWhereErrorAppeared) => {
		const err = {};
		err.line = line;
		err.msg = `ERROR (line ${line}): The condition in the ${constructWhereErrorAppeared} is not a boolean (a true-or-false value)`;
		err.type = ERROR_TYPES.NON_BOOLEAN_CONDITION;
		return err;
	},

	invalidOperatorArgument: (line, operator, expectedType, actualType) => {
		const err = {};
		err.line = line;
		err.msg = `ERROR (line ${line}): Invalid type of an argument to the operator ${operator}. Expected ${expectedType} but got ${actualType}.`
		err.type = ERROR_TYPES.INVALID_ARGUMENT_TYPE;
		return err;

	},

	usingStatementFunctionInExpression: (line, id) => {
		const err = {};
		err.line = line;
		err.msg = `ERROR (line ${line}): Using the function '${id}' in an expression. This function does not have a return value (it does not evaluate to a value, it just does something).`
		err.type = ERROR_TYPES.VOID_FUNCTION_IN_EXPRESSION;
		return err;
	},

	unrecognizedTokenError: (lineNumber, lineText, positionInLine) => {
		const err = {};
		err.line = lineNumber;
		err.msg = `Encountered an unrecognized symbol. Did you make a typo?\n`
		              + lineText  + "\n"
					  + " ".repeat(positionInLine) + "^\n";
		err.type = ERROR_TYPES.UNRECOGNIZED_TOKEN;
		return err;
	}
}
