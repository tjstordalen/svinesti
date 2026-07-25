import { ErrorListener } from 'antlr4';
import { ERRORS } from "./errors.js?v=@version-placeholder@";

export class SyntaxErrorListener extends ErrorListener {

	constructor(program){
		super();
		this.programLines = program.split(/\r\n|\r|\n/g);
	    this.error = ERRORS.OK;
	}

    syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {

		let expectedTokens = [];
		const literals = recognizer.literalNames;
		const symbolics = recognizer.symbolicNames;
		for (let interval of recognizer.getExpectedTokens().intervals) { 
			for (let i = interval.start; i < interval.stop; i++) {
				const token = literals[i] || symbolics[i];
				if (token) expectedTokens.push(token);
			}
		}

		let explanation = null;
		const justOne = expectedTokens.length === 1;
		if (justOne){
			const expected = expectedTokens[0];
			if (expected === "';'"){
				explanation = `Expected a ${expectedTokens[0]}. Did you remember to end each line with a semicolon?`;
			}
			else if (expected === "'('" || expected === "')'"){
				explanation = `You're either missing a parenthesis, or you have one too much, or you have forgotten to put an if- or while-condition inside parentheses.`;
			}
			else {
				explanation = `Expected ${expected}.`;
			}
		}	
		else if (expectedTokens.includes("'{'") ||  expectedTokens.includes("'}'")){
				explanation = `It looks like you have forgotten a brace (i.e., a '{' or a '}') in a block. Remember that every '{' must be matched with a '}', and vice-versa`;
		}
		else {
			const currentRule = recognizer.ruleNames[recognizer._ctx.ruleIndex];
			if (currentRule === "expr") {
				
				explanation = "Incomplete or missing expression. Make sure that you don't have any extra operators (like +, -, *, &&) that are missing arguments (for instance, 3 + ???)."
			}	
			else {
			explanation = `Expected one of the following: ${expectedTokens}. Try to find out what's wrong! Ask a teacher if you can't.`  
			}
		}

		const errorMarker = " ".repeat(charPositionInLine) + "^";
		const message = `Syntax error on line ${line}\n${this.programLines[line-1]}\n${errorMarker}\n${explanation}`;
		this.error = ERRORS.syntaxError(line, message);
    }
}

// This is registered only to the lexer, which mostly only throws errors on unrecognized tokens.
export class UnrecognizedTokenErrorListener extends ErrorListener {
	
	constructor(program){
		super();
		this.programLines = program.split(/\r\n|\r|\n/g);
		this.error = ERRORS.OK;
	}

    syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
			this.error = ERRORS.unrecognizedTokenError(line, this.programLines[line-1], charPositionInLine);
	}
}
