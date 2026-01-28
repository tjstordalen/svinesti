// Generated from PigJatin.g4 by ANTLR 4.13.2
// jshint ignore: start
import antlr4 from 'antlr4';
import PigJatinListener from './PigJatinListener.js';
import PigJatinVisitor from './PigJatinVisitor.js';

const serializedATN = [4,1,31,89,2,0,7,0,2,1,7,1,2,2,7,2,1,0,5,0,8,8,0,10,
0,12,0,11,9,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
1,1,1,1,1,1,1,1,1,1,1,3,1,33,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,43,
8,1,10,1,12,1,46,9,1,1,1,1,1,3,1,50,8,1,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,
1,2,1,2,1,2,1,2,3,2,64,8,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,
2,1,2,1,2,1,2,1,2,1,2,1,2,5,2,84,8,2,10,2,12,2,87,9,2,1,2,0,1,4,3,0,2,4,
0,6,1,0,2,3,2,0,26,26,29,29,1,0,14,16,2,0,12,12,17,17,1,0,18,21,1,0,22,23,
105,0,9,1,0,0,0,2,49,1,0,0,0,4,63,1,0,0,0,6,8,3,2,1,0,7,6,1,0,0,0,8,11,1,
0,0,0,9,7,1,0,0,0,9,10,1,0,0,0,10,1,1,0,0,0,11,9,1,0,0,0,12,13,5,27,0,0,
13,50,5,1,0,0,14,15,7,0,0,0,15,16,5,28,0,0,16,17,5,4,0,0,17,18,3,4,2,0,18,
19,5,1,0,0,19,50,1,0,0,0,20,21,5,28,0,0,21,22,5,4,0,0,22,23,3,4,2,0,23,24,
5,1,0,0,24,50,1,0,0,0,25,26,5,5,0,0,26,27,5,6,0,0,27,28,3,4,2,0,28,29,5,
7,0,0,29,32,3,2,1,0,30,31,5,8,0,0,31,33,3,2,1,0,32,30,1,0,0,0,32,33,1,0,
0,0,33,50,1,0,0,0,34,35,5,9,0,0,35,36,5,6,0,0,36,37,3,4,2,0,37,38,5,7,0,
0,38,39,3,2,1,0,39,50,1,0,0,0,40,44,5,10,0,0,41,43,3,2,1,0,42,41,1,0,0,0,
43,46,1,0,0,0,44,42,1,0,0,0,44,45,1,0,0,0,45,47,1,0,0,0,46,44,1,0,0,0,47,
50,5,11,0,0,48,50,5,1,0,0,49,12,1,0,0,0,49,14,1,0,0,0,49,20,1,0,0,0,49,25,
1,0,0,0,49,34,1,0,0,0,49,40,1,0,0,0,49,48,1,0,0,0,50,3,1,0,0,0,51,52,6,2,
-1,0,52,53,5,6,0,0,53,54,3,4,2,0,54,55,5,7,0,0,55,64,1,0,0,0,56,57,5,12,
0,0,57,64,3,4,2,11,58,59,5,13,0,0,59,64,3,4,2,10,60,64,7,1,0,0,61,64,5,28,
0,0,62,64,5,27,0,0,63,51,1,0,0,0,63,56,1,0,0,0,63,58,1,0,0,0,63,60,1,0,0,
0,63,61,1,0,0,0,63,62,1,0,0,0,64,85,1,0,0,0,65,66,10,9,0,0,66,67,7,2,0,0,
67,84,3,4,2,10,68,69,10,8,0,0,69,70,7,3,0,0,70,84,3,4,2,9,71,72,10,7,0,0,
72,73,7,4,0,0,73,84,3,4,2,8,74,75,10,6,0,0,75,76,7,5,0,0,76,84,3,4,2,7,77,
78,10,5,0,0,78,79,5,24,0,0,79,84,3,4,2,6,80,81,10,4,0,0,81,82,5,25,0,0,82,
84,3,4,2,5,83,65,1,0,0,0,83,68,1,0,0,0,83,71,1,0,0,0,83,74,1,0,0,0,83,77,
1,0,0,0,83,80,1,0,0,0,84,87,1,0,0,0,85,83,1,0,0,0,85,86,1,0,0,0,86,5,1,0,
0,0,87,85,1,0,0,0,7,9,32,44,49,63,83,85];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

export default class PigJatinParser extends antlr4.Parser {

    static grammarFileName = "PigJatin.g4";
    static literalNames = [ null, "';'", "'int'", "'boolean'", "'='", "'if'", 
                            "'('", "')'", "'else'", "'while'", "'{'", "'}'", 
                            "'-'", "'!'", "'*'", "'/'", "'%'", "'+'", "'<='", 
                            "'>='", "'>'", "'<'", "'=='", "'!='", "'&&'", 
                            "'||'" ];
    static symbolicNames = [ null, null, null, null, null, null, null, null, 
                             null, null, null, null, null, null, null, null, 
                             null, null, null, null, null, null, null, null, 
                             null, null, "BOOL_LITERAL", "FUNCTION_CALL", 
                             "IDENTIFIER", "INT_LITERAL", "WS", "LINE_COMMENT" ];
    static ruleNames = [ "program", "statement", "expr" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = PigJatinParser.ruleNames;
        this.literalNames = PigJatinParser.literalNames;
        this.symbolicNames = PigJatinParser.symbolicNames;
    }

    sempred(localctx, ruleIndex, predIndex) {
    	switch(ruleIndex) {
    	case 2:
    	    		return this.expr_sempred(localctx, predIndex);
        default:
            throw "No predicate with index:" + ruleIndex;
       }
    }

    expr_sempred(localctx, predIndex) {
    	switch(predIndex) {
    		case 0:
    			return this.precpred(this._ctx, 9);
    		case 1:
    			return this.precpred(this._ctx, 8);
    		case 2:
    			return this.precpred(this._ctx, 7);
    		case 3:
    			return this.precpred(this._ctx, 6);
    		case 4:
    			return this.precpred(this._ctx, 5);
    		case 5:
    			return this.precpred(this._ctx, 4);
    		default:
    			throw "No predicate with index:" + predIndex;
    	}
    };




	program() {
	    let localctx = new ProgramContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, PigJatinParser.RULE_program);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 9;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while((((_la) & ~0x1f) === 0 && ((1 << _la) & 402654766) !== 0)) {
	            this.state = 6;
	            this.statement();
	            this.state = 11;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	statement() {
	    let localctx = new StatementContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, PigJatinParser.RULE_statement);
	    var _la = 0;
	    try {
	        this.state = 49;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 27:
	            localctx = new StatementFunctionCallContext(this, localctx);
	            this.enterOuterAlt(localctx, 1);
	            this.state = 12;
	            localctx.funcName = this.match(PigJatinParser.FUNCTION_CALL);
	            this.state = 13;
	            this.match(PigJatinParser.T__0);
	            break;
	        case 2:
	        case 3:
	            localctx = new DeclarationContext(this, localctx);
	            this.enterOuterAlt(localctx, 2);
	            this.state = 14;
	            localctx.type = this._input.LT(1);
	            _la = this._input.LA(1);
	            if(!(_la===2 || _la===3)) {
	                localctx.type = this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            this.state = 15;
	            localctx.id = this.match(PigJatinParser.IDENTIFIER);
	            this.state = 16;
	            this.match(PigJatinParser.T__3);
	            this.state = 17;
	            this.expr(0);
	            this.state = 18;
	            this.match(PigJatinParser.T__0);
	            break;
	        case 28:
	            localctx = new AssignmentContext(this, localctx);
	            this.enterOuterAlt(localctx, 3);
	            this.state = 20;
	            localctx.id = this.match(PigJatinParser.IDENTIFIER);
	            this.state = 21;
	            this.match(PigJatinParser.T__3);
	            this.state = 22;
	            this.expr(0);
	            this.state = 23;
	            this.match(PigJatinParser.T__0);
	            break;
	        case 5:
	            localctx = new ConditionalContext(this, localctx);
	            this.enterOuterAlt(localctx, 4);
	            this.state = 25;
	            this.match(PigJatinParser.T__4);
	            this.state = 26;
	            this.match(PigJatinParser.T__5);
	            this.state = 27;
	            localctx.cond = this.expr(0);
	            this.state = 28;
	            this.match(PigJatinParser.T__6);
	            this.state = 29;
	            localctx.then = this.statement();
	            this.state = 32;
	            this._errHandler.sync(this);
	            var la_ = this._interp.adaptivePredict(this._input,1,this._ctx);
	            if(la_===1) {
	                this.state = 30;
	                this.match(PigJatinParser.T__7);
	                this.state = 31;
	                localctx.else_ = this.statement();

	            }
	            break;
	        case 9:
	            localctx = new WhileLoopContext(this, localctx);
	            this.enterOuterAlt(localctx, 5);
	            this.state = 34;
	            this.match(PigJatinParser.T__8);
	            this.state = 35;
	            this.match(PigJatinParser.T__5);
	            this.state = 36;
	            localctx.cond = this.expr(0);
	            this.state = 37;
	            this.match(PigJatinParser.T__6);
	            this.state = 38;
	            localctx.do_ = this.statement();
	            break;
	        case 10:
	            localctx = new BlockContext(this, localctx);
	            this.enterOuterAlt(localctx, 6);
	            this.state = 40;
	            this.match(PigJatinParser.T__9);
	            this.state = 44;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            while((((_la) & ~0x1f) === 0 && ((1 << _la) & 402654766) !== 0)) {
	                this.state = 41;
	                this.statement();
	                this.state = 46;
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            }
	            this.state = 47;
	            this.match(PigJatinParser.T__10);
	            break;
	        case 1:
	            localctx = new EmptyStatementContext(this, localctx);
	            this.enterOuterAlt(localctx, 7);
	            this.state = 48;
	            this.match(PigJatinParser.T__0);
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


	expr(_p) {
		if(_p===undefined) {
		    _p = 0;
		}
	    const _parentctx = this._ctx;
	    const _parentState = this.state;
	    let localctx = new ExprContext(this, this._ctx, _parentState);
	    let _prevctx = localctx;
	    const _startState = 4;
	    this.enterRecursionRule(localctx, 4, PigJatinParser.RULE_expr, _p);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 63;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 6:
	            localctx = new ExprParenthesizedContext(this, localctx);
	            this._ctx = localctx;
	            _prevctx = localctx;

	            this.state = 52;
	            this.match(PigJatinParser.T__5);
	            this.state = 53;
	            this.expr(0);
	            this.state = 54;
	            this.match(PigJatinParser.T__6);
	            break;
	        case 12:
	            localctx = new ExprNegationContext(this, localctx);
	            this._ctx = localctx;
	            _prevctx = localctx;
	            this.state = 56;
	            this.match(PigJatinParser.T__11);
	            this.state = 57;
	            this.expr(11);
	            break;
	        case 13:
	            localctx = new ExprLogicalNegationContext(this, localctx);
	            this._ctx = localctx;
	            _prevctx = localctx;
	            this.state = 58;
	            this.match(PigJatinParser.T__12);
	            this.state = 59;
	            this.expr(10);
	            break;
	        case 26:
	        case 29:
	            localctx = new ExprLiteralContext(this, localctx);
	            this._ctx = localctx;
	            _prevctx = localctx;
	            this.state = 60;
	            localctx.literal = this._input.LT(1);
	            _la = this._input.LA(1);
	            if(!(_la===26 || _la===29)) {
	                localctx.literal = this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            break;
	        case 28:
	            localctx = new ExprVariableContext(this, localctx);
	            this._ctx = localctx;
	            _prevctx = localctx;
	            this.state = 61;
	            localctx.id = this.match(PigJatinParser.IDENTIFIER);
	            break;
	        case 27:
	            localctx = new ExprFunctionCallContext(this, localctx);
	            this._ctx = localctx;
	            _prevctx = localctx;
	            this.state = 62;
	            localctx.funcName = this.match(PigJatinParser.FUNCTION_CALL);
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	        this._ctx.stop = this._input.LT(-1);
	        this.state = 85;
	        this._errHandler.sync(this);
	        var _alt = this._interp.adaptivePredict(this._input,6,this._ctx)
	        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
	            if(_alt===1) {
	                if(this._parseListeners!==null) {
	                    this.triggerExitRuleEvent();
	                }
	                _prevctx = localctx;
	                this.state = 83;
	                this._errHandler.sync(this);
	                var la_ = this._interp.adaptivePredict(this._input,5,this._ctx);
	                switch(la_) {
	                case 1:
	                    localctx = new ExprBinaryOpContext(this, new ExprContext(this, _parentctx, _parentState));
	                    this.pushNewRecursionContext(localctx, _startState, PigJatinParser.RULE_expr);
	                    this.state = 65;
	                    if (!( this.precpred(this._ctx, 9))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 9)");
	                    }
	                    this.state = 66;
	                    localctx.bop = this._input.LT(1);
	                    _la = this._input.LA(1);
	                    if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 114688) !== 0))) {
	                        localctx.bop = this._errHandler.recoverInline(this);
	                    }
	                    else {
	                    	this._errHandler.reportMatch(this);
	                        this.consume();
	                    }
	                    this.state = 67;
	                    this.expr(10);
	                    break;

	                case 2:
	                    localctx = new ExprBinaryOpContext(this, new ExprContext(this, _parentctx, _parentState));
	                    this.pushNewRecursionContext(localctx, _startState, PigJatinParser.RULE_expr);
	                    this.state = 68;
	                    if (!( this.precpred(this._ctx, 8))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 8)");
	                    }
	                    this.state = 69;
	                    localctx.bop = this._input.LT(1);
	                    _la = this._input.LA(1);
	                    if(!(_la===12 || _la===17)) {
	                        localctx.bop = this._errHandler.recoverInline(this);
	                    }
	                    else {
	                    	this._errHandler.reportMatch(this);
	                        this.consume();
	                    }
	                    this.state = 70;
	                    this.expr(9);
	                    break;

	                case 3:
	                    localctx = new ExprBinaryOpContext(this, new ExprContext(this, _parentctx, _parentState));
	                    this.pushNewRecursionContext(localctx, _startState, PigJatinParser.RULE_expr);
	                    this.state = 71;
	                    if (!( this.precpred(this._ctx, 7))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 7)");
	                    }
	                    this.state = 72;
	                    localctx.bop = this._input.LT(1);
	                    _la = this._input.LA(1);
	                    if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 3932160) !== 0))) {
	                        localctx.bop = this._errHandler.recoverInline(this);
	                    }
	                    else {
	                    	this._errHandler.reportMatch(this);
	                        this.consume();
	                    }
	                    this.state = 73;
	                    this.expr(8);
	                    break;

	                case 4:
	                    localctx = new ExprBinaryOpContext(this, new ExprContext(this, _parentctx, _parentState));
	                    this.pushNewRecursionContext(localctx, _startState, PigJatinParser.RULE_expr);
	                    this.state = 74;
	                    if (!( this.precpred(this._ctx, 6))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 6)");
	                    }
	                    this.state = 75;
	                    localctx.bop = this._input.LT(1);
	                    _la = this._input.LA(1);
	                    if(!(_la===22 || _la===23)) {
	                        localctx.bop = this._errHandler.recoverInline(this);
	                    }
	                    else {
	                    	this._errHandler.reportMatch(this);
	                        this.consume();
	                    }
	                    this.state = 76;
	                    this.expr(7);
	                    break;

	                case 5:
	                    localctx = new ExprBinaryOpContext(this, new ExprContext(this, _parentctx, _parentState));
	                    this.pushNewRecursionContext(localctx, _startState, PigJatinParser.RULE_expr);
	                    this.state = 77;
	                    if (!( this.precpred(this._ctx, 5))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 5)");
	                    }
	                    this.state = 78;
	                    localctx.bop = this.match(PigJatinParser.T__23);
	                    this.state = 79;
	                    this.expr(6);
	                    break;

	                case 6:
	                    localctx = new ExprBinaryOpContext(this, new ExprContext(this, _parentctx, _parentState));
	                    this.pushNewRecursionContext(localctx, _startState, PigJatinParser.RULE_expr);
	                    this.state = 80;
	                    if (!( this.precpred(this._ctx, 4))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 4)");
	                    }
	                    this.state = 81;
	                    localctx.bop = this.match(PigJatinParser.T__24);
	                    this.state = 82;
	                    this.expr(5);
	                    break;

	                } 
	            }
	            this.state = 87;
	            this._errHandler.sync(this);
	            _alt = this._interp.adaptivePredict(this._input,6,this._ctx);
	        }

	    } catch( error) {
	        if(error instanceof antlr4.error.RecognitionException) {
		        localctx.exception = error;
		        this._errHandler.reportError(this, error);
		        this._errHandler.recover(this, error);
		    } else {
		    	throw error;
		    }
	    } finally {
	        this.unrollRecursionContexts(_parentctx)
	    }
	    return localctx;
	}


}

PigJatinParser.EOF = antlr4.Token.EOF;
PigJatinParser.T__0 = 1;
PigJatinParser.T__1 = 2;
PigJatinParser.T__2 = 3;
PigJatinParser.T__3 = 4;
PigJatinParser.T__4 = 5;
PigJatinParser.T__5 = 6;
PigJatinParser.T__6 = 7;
PigJatinParser.T__7 = 8;
PigJatinParser.T__8 = 9;
PigJatinParser.T__9 = 10;
PigJatinParser.T__10 = 11;
PigJatinParser.T__11 = 12;
PigJatinParser.T__12 = 13;
PigJatinParser.T__13 = 14;
PigJatinParser.T__14 = 15;
PigJatinParser.T__15 = 16;
PigJatinParser.T__16 = 17;
PigJatinParser.T__17 = 18;
PigJatinParser.T__18 = 19;
PigJatinParser.T__19 = 20;
PigJatinParser.T__20 = 21;
PigJatinParser.T__21 = 22;
PigJatinParser.T__22 = 23;
PigJatinParser.T__23 = 24;
PigJatinParser.T__24 = 25;
PigJatinParser.BOOL_LITERAL = 26;
PigJatinParser.FUNCTION_CALL = 27;
PigJatinParser.IDENTIFIER = 28;
PigJatinParser.INT_LITERAL = 29;
PigJatinParser.WS = 30;
PigJatinParser.LINE_COMMENT = 31;

PigJatinParser.RULE_program = 0;
PigJatinParser.RULE_statement = 1;
PigJatinParser.RULE_expr = 2;

class ProgramContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = PigJatinParser.RULE_program;
    }

	statement = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(StatementContext);
	    } else {
	        return this.getTypedRuleContext(StatementContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterProgram(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitProgram(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitProgram(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class StatementContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = PigJatinParser.RULE_statement;
    }


	 
		copyFrom(ctx) {
			super.copyFrom(ctx);
		}

}


class EmptyStatementContext extends StatementContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }


	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterEmptyStatement(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitEmptyStatement(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitEmptyStatement(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.EmptyStatementContext = EmptyStatementContext;

class WhileLoopContext extends StatementContext {

    constructor(parser, ctx) {
        super(parser);
        this.cond = null;;
        this.do_ = null;;
        super.copyFrom(ctx);
    }

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	statement() {
	    return this.getTypedRuleContext(StatementContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterWhileLoop(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitWhileLoop(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitWhileLoop(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.WhileLoopContext = WhileLoopContext;

class ConditionalContext extends StatementContext {

    constructor(parser, ctx) {
        super(parser);
        this.cond = null;;
        this.then = null;;
        this.else_ = null;;
        super.copyFrom(ctx);
    }

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	statement = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(StatementContext);
	    } else {
	        return this.getTypedRuleContext(StatementContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterConditional(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitConditional(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitConditional(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.ConditionalContext = ConditionalContext;

class AssignmentContext extends StatementContext {

    constructor(parser, ctx) {
        super(parser);
        this.id = null;;
        super.copyFrom(ctx);
    }

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	IDENTIFIER() {
	    return this.getToken(PigJatinParser.IDENTIFIER, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterAssignment(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitAssignment(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitAssignment(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.AssignmentContext = AssignmentContext;

class BlockContext extends StatementContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	statement = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(StatementContext);
	    } else {
	        return this.getTypedRuleContext(StatementContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterBlock(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitBlock(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitBlock(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.BlockContext = BlockContext;

class StatementFunctionCallContext extends StatementContext {

    constructor(parser, ctx) {
        super(parser);
        this.funcName = null;;
        super.copyFrom(ctx);
    }

	FUNCTION_CALL() {
	    return this.getToken(PigJatinParser.FUNCTION_CALL, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterStatementFunctionCall(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitStatementFunctionCall(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitStatementFunctionCall(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.StatementFunctionCallContext = StatementFunctionCallContext;

class DeclarationContext extends StatementContext {

    constructor(parser, ctx) {
        super(parser);
        this.type = null;;
        this.id = null;;
        super.copyFrom(ctx);
    }

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	IDENTIFIER() {
	    return this.getToken(PigJatinParser.IDENTIFIER, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterDeclaration(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitDeclaration(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitDeclaration(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.DeclarationContext = DeclarationContext;

class ExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = PigJatinParser.RULE_expr;
    }


	 
		copyFrom(ctx) {
			super.copyFrom(ctx);
		}

}


class ExprLogicalNegationContext extends ExprContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterExprLogicalNegation(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitExprLogicalNegation(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitExprLogicalNegation(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.ExprLogicalNegationContext = ExprLogicalNegationContext;

class ExprVariableContext extends ExprContext {

    constructor(parser, ctx) {
        super(parser);
        this.id = null;;
        super.copyFrom(ctx);
    }

	IDENTIFIER() {
	    return this.getToken(PigJatinParser.IDENTIFIER, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterExprVariable(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitExprVariable(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitExprVariable(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.ExprVariableContext = ExprVariableContext;

class ExprBinaryOpContext extends ExprContext {

    constructor(parser, ctx) {
        super(parser);
        this.bop = null;;
        super.copyFrom(ctx);
    }

	expr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExprContext);
	    } else {
	        return this.getTypedRuleContext(ExprContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterExprBinaryOp(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitExprBinaryOp(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitExprBinaryOp(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.ExprBinaryOpContext = ExprBinaryOpContext;

class ExprParenthesizedContext extends ExprContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterExprParenthesized(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitExprParenthesized(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitExprParenthesized(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.ExprParenthesizedContext = ExprParenthesizedContext;

class ExprNegationContext extends ExprContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterExprNegation(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitExprNegation(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitExprNegation(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.ExprNegationContext = ExprNegationContext;

class ExprLiteralContext extends ExprContext {

    constructor(parser, ctx) {
        super(parser);
        this.literal = null;;
        super.copyFrom(ctx);
    }

	INT_LITERAL() {
	    return this.getToken(PigJatinParser.INT_LITERAL, 0);
	};

	BOOL_LITERAL() {
	    return this.getToken(PigJatinParser.BOOL_LITERAL, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterExprLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitExprLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitExprLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.ExprLiteralContext = ExprLiteralContext;

class ExprFunctionCallContext extends ExprContext {

    constructor(parser, ctx) {
        super(parser);
        this.funcName = null;;
        super.copyFrom(ctx);
    }

	FUNCTION_CALL() {
	    return this.getToken(PigJatinParser.FUNCTION_CALL, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.enterExprFunctionCall(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PigJatinListener ) {
	        listener.exitExprFunctionCall(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof PigJatinVisitor ) {
	        return visitor.visitExprFunctionCall(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

PigJatinParser.ExprFunctionCallContext = ExprFunctionCallContext;


PigJatinParser.ProgramContext = ProgramContext; 
PigJatinParser.StatementContext = StatementContext; 
PigJatinParser.ExprContext = ExprContext; 
