import antlr4 from 'antlr4';
import PigJatinVisitor from "./antlr/PigJatinVisitor.js";
import { ERRORS } from "./errors.js";
import { EDITOR_TAB_SIZE, PIGJATIN_STATEMENT_FUNCTIONS, PIGJATIN_EXPRESSION_FUNCTIONS } from "../config.js";

const Type = {
	INT:   "int",
	BOOL:  "boolean", 
	VOID:  "void", 
}

export class StaticAnalysisVisitor extends PigJatinVisitor {

	constructor() {
		super();
		this.abandonedScopes = [];
		this.scopeStack = [{}];
		this.error = ERRORS.OK;

		this.validStatementFunctions = PIGJATIN_STATEMENT_FUNCTIONS;
		this.validExpressionFunctions = PIGJATIN_EXPRESSION_FUNCTIONS;
	}

	getVarType(id, scopes){
		const scope = scopes.find(scope => !!scope[id])
		return scope?.[id];
	}

	extractFunctionName(str){
		return str.split("(")[0];
	}
	
	visitProgram(ctx) {
		for (let c of ctx.children ?? []) {
			const typeResult = this.visit(c);
			const errorOccured = typeResult === null;
			const errorMsgUnchanged = this.error === ERRORS.OK;
			if (errorOccured) {
				if (errorMsgUnchanged) {
					this.error = ERRORS.unknownError(c.getText());			
				}	
				return false;
			}
		}
		return true;
	}

	visitStatementFunctionCall(ctx) {
		const id = this.extractFunctionName(ctx.funcName.text);
		if (this.validStatementFunctions.includes(id)){
			return Type.VOID;
		}
		else if (this.validExpressionFunctions.includes(id)) {
		    this.error = ERRORS.warnUnusedExpressionFunction(ctx.start.line, id);
			return null;
		}
		else {
			this.error = ERRORS.illegalFunctionName(ctx.start.line, id);
			return null;
		}
	}

	visitDeclaration(ctx) {
		const varType  = ctx.type.text;
		const id       = ctx.id.text;
		const exprType = this.visit(ctx.expr(0));
		if (!exprType) return null;	
		
		const isAlreadyDefined = this.scopeStack.some(scope => !!scope[id]);
		if (isAlreadyDefined){
			this.error = ERRORS.duplicateDeclaration(ctx.start.line, id);
			return null;
		}

		// the parser guarantees that varType is either "int" or "boolean"
		const declType = varType === "int" ? Type.INT : Type.BOOL; 	
		if (declType !== exprType) {
			this.error = ERRORS.incorrectTypeInAssignment(ctx.start.line, id, declType, exprType);
			return null;
		}
		this.scopeStack.at(-1)[id] = exprType; 

		return Type.VOID;
	} 

	visitAssignment(ctx) {
		const id = ctx.id.text; 
		const exprType = this.visit(ctx.expr(0));
		if (!exprType) return null;

		const type = this.getVarType(id, this.scopeStack);

		if (!type) {
			const hasBeenDiscarded = this.getVarType(id, this.abandonedScopes);
			if (hasBeenDiscarded) this.error = ERRORS.outOfScope(ctx.start.line, id);
			else this.error = ERRORS.undeclaredVariable(ctx.start.line, id);
			return null;
		}
		if (type !== exprType){
			this.error = ERRORS.incorrectTypeInAssignment(ctx.start.line, id, type, exprType);
			return null;
		}

		return Type.VOID;
	}

	visitConditional(ctx) {
		const condition = this.visit(ctx.cond);
		if (!condition) return null;
		if (condition !== Type.BOOL) {
			this.error = ERRORS.conditionIsNotBoolean(ctx.start.line, "if-statement"); 
			return null;
		}

		const thenBlock = this.visit(ctx.then);
		if (!thenBlock) return null;

		const elseBlock = ctx.else_ ? this.visit(ctx.else_) : "not applicable";
		if (!elseBlock) return null;

	    return Type.VOID;
	}

	visitWhileLoop(ctx) {
		const condition = this.visit(ctx.cond);
		if (!condition) return null;
		if (condition !== Type.BOOL) {
			this.error = ERRORS.conditionIsNotBoolean(ctx.start.line, "while-loop"); 
			return null;
		}
		const body      = this.visit(ctx.statement(0));
		if (!body) {
			return null;
		}
		return Type.VOID;
	}

	visitBlock(ctx) {
		this.scopeStack.push({});
		// Remove first and last children (the braces)
		const statements = ctx.children.slice(1, -1);
		let anyNull = false;
		for (let c of statements) {
			const x = this.visit(c);
			anyNull ||= x === null;
		}

		const popped = this.scopeStack.pop();
		// We keep old scopes around so we can give more helpful error messages
		this.abandonedScopes.push(popped);
		return anyNull? null : Type.VOID;
	}

	visitExprLogicalNegation(ctx) {
		const expr = this.visit(ctx.expr(0));
		if (!expr) return null;

		if (expr !== Type.BOOL) {
			this.error = ERRORS.invalidOperatorArgument(ctx.start.line, "'!' (logical negation)", "boolean", expr);
			return null;
		}
		return Type.BOOL;
	}

	visitExprVariable(ctx) {
		const id = ctx.id.text;
		const varType = this.getVarType(id, this.scopeStack);
		if (varType) return varType;
		else {
			const outOfScope = this.getVarType(id, this.abandonedScopes);
			if (outOfScope) this.error = ERRORS.outOfScope(ctx.start.line, id);
			else this.error = ERRORS.undeclaredVariable(ctx.start.line, id);
			return null;
		}
	}

	visitExprBinaryOp(ctx) {
		const left  = this.visit(ctx.expr(0));
		if (!left) return null;
		const right = this.visit(ctx.expr(1));
		if (!right) return null;
		const op    = ctx.bop.text;
	

		if (op === "==" || op === "!="){
			if (left === right) return Type.BOOL;
			else {
				this.error = ERRORS.invalidOperatorArgument(
					ctx.start.line,
					`'${op}'`,
					"both arguments to have the same type",	
					`${left} and ${right}`
				);
				return null;
			}
		}
		else {
			let expected = null;
			switch(op) {
				case "<":
				case ">":
				case "<=":
				case ">=":
				case "+":
				case "-":
				case "/":
				case "*":
				case "%":
				expected = [Type.INT, Type.INT];
				break;

				case "&&":
				case "||":
				expected = [Type.BOOL,Type.BOOL]
				break;

				default: 
				console.error("UNHANDLED operator type!")
				break;
			}

			let [a,b] = expected;
			if (a === left && b === right) {
				return ["+","*","-","/","%"].includes(op) ? Type.INT : Type.BOOL;
			}
			else {
				
				this.error = ERRORS.invalidOperatorArgument(
					ctx.start.line,
					`'${op}'`,
					`${a} and ${b}`,	
					`${left} and ${right}`
				);
				return null;
			}
		}
	}

	visitExprParenthesized(ctx) {
	    return this.visit(ctx.expr(0));
	}

	visitExprNegation(ctx) {
		const expr = this.visit(ctx.expr(0));
		if (!expr) return null;

		if (expr === Type.INT) return expr;
		else {
			this.error = ERRORS.invalidOperatorArgument(
				ctx.start.line,
				`'-' (arithmetic negation)`,
				"int",
				`${expr}`
			)
			return null;
		}
	}

	visitExprLiteral(ctx) {
		// The parser guarantees that the literal is a correctly parsed boolean or integer
		const literal = ctx.literal.text;
		if (literal === "true" || literal === "false") return Type.BOOL;
		else return Type.INT;
	}

	visitExprFunctionCall(ctx) {
		const fn = this.extractFunctionName(ctx.funcName.text);
		if (this.validExpressionFunctions.includes(fn)) return Type.BOOL;
		else if (this.validStatementFunctions.includes(fn)){
			this.error = ERRORS.usingStatementFunctionInExpression(ctx.start.line, fn);
			return null;
		}
		else {
			this.error = ERRORS.illegalFunctionName(ctx.start.line, fn);
			return null;
		}
	}
}


export class TranspilationVisitor extends PigJatinVisitor {

	constructor(){
		super();
		this.indentChars      = " ".repeat(EDITOR_TAB_SIZE);
		this.indentationLevel = 0;
		this.indentation      = () => this.indentChars.repeat(this.indentationLevel)
		this.indent           = () => this.indentationLevel++;
		this.outdent          = () => this.indentationLevel--;

		this.lineMapping = [];

		// We start at line 2 instead of line 1 because we will be
		// adding the mapping itself to the python program  at line 1
		this.pythonLine = 2;
	}


	mapLine(lineInJavaSource){
		this.lineMapping.push([this.pythonLine, lineInJavaSource]);
		this.pythonLine++;
	}

	visitProgram(ctx) {
		const program = (ctx.children ?? []).flatMap(c => this.visit(c)).join("\n");
		const pythonMapping = `globals()["lineMapping"] = dict(${JSON.stringify(this.lineMapping)})\n` 
		return pythonMapping + program; 
	}

	visitStatementFunctionCall(ctx) {
        this.mapLine(ctx.start.line);
		const id = ctx.funcName.text;
		return [this.indentation() + id];
	}

	visitDeclaration(ctx) {
        this.mapLine(ctx.start.line);
		const id       = ctx.id.text;
		const expr = this.visit(ctx.expr(0));
		return [this.indentation() + id + " = " + expr];
	} 

	visitAssignment(ctx) {
        this.mapLine(ctx.start.line);
		const id = ctx.id.text; 
		const expr = this.visit(ctx.expr(0));
		return [this.indentation() + id + " = " + expr];
	}

	visitConditional(ctx) {
        this.mapLine(ctx.start.line);
		const condition = this.indentation() + "if " + this.visit(ctx.cond) + ":";
		
		this.indent();
		const thenBlock = this.visit(ctx.then);
		this.outdent();
	
		let elseBlock = [];
		if (ctx["else_"]){
			this.mapLine(ctx["else_"].start.line)
			const tmp = this.indentation() + "else:";
			this.indent();
			elseBlock = [tmp, ...this.visit(ctx["else_"])];
			this.outdent();
		}

		return [condition, ...thenBlock, ...elseBlock];
	}

	visitWhileLoop(ctx) {
        this.mapLine(ctx.start.line);
		const condition = this.indentation() + "while " + this.visit(ctx.cond) + ":";
		this.indent();
		const body = this.visit(ctx.statement(0));
		this.outdent();
		return [condition, ...body];
	}

	visitBlock(ctx) {
		// The slice removes the braces
		const ret = ctx.children.slice(1,-1).flatMap(c => this.visit(c));
		return ret.length > 0 ? ret : [this.indentation() + "pass"]
	}

	visitExprLogicalNegation(ctx) {
		return `not (${this.visit(ctx.expr(0))})`
	}

	visitExprVariable(ctx) {
		return ctx.id.text;
	}

	visitExprBinaryOp(ctx) {
		let op = ctx.bop.text;
		if (op === "||") op = "or";
		if (op === "&&") op = "and";
		if (op === "/" ) op = "//";

		const left  = this.visit(ctx.expr(0));
		const right = this.visit(ctx.expr(1));
		return `(${left} ${op} ${right})`;
	}

	visitExprParenthesized(ctx) {
	    return "(" + this.visit(ctx.expr(0)) + ")";
	}

	visitExprNegation(ctx) {
		return `-(${this.visit(ctx.expr(0))})`;
	}

	visitExprLiteral(ctx) {
		const literal = ctx.literal.text;
		if (literal === "true")  return "True";
		if (literal === "false") return "False";
		return literal;
	}

	visitExprFunctionCall(ctx) {
		return ctx.funcName.text;
	}
}
