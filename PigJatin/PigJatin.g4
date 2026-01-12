/*
This grammar encodes a minimal, Java-like programming language "PigJatin" 
intended for instructional purposes. It is derived from another full Java
grammar by reducing it down to the essentials. The license for the original
work follows below. The link to the original  work is:
https://github.com/antlr/grammars-v4/tree/master/java/java

 [The "BSD licence"]
 Copyright (c) 2013 Terence Parr, Sam Harwell
 Copyright (c) 2017 Ivan Kochurkin (upgrade to Java 8)
 Copyright (c) 2021 Michał Lorek (upgrade to Java 11)
 Copyright (c) 2022 Michał Lorek (upgrade to Java 17)
 All rights reserved.

 Portions Copyright (c) 2025 Tord Stordalen (derived the PigJatin
 educational language). All rights reserved.  

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions
 are met:
 1. Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
 2. Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.
 3. The name of the author may not be used to endorse or promote products
    derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
 IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

grammar PigJatin;
options { language = JavaScript; }

program
	: statement* 
	;

statement
	: funcName = FUNCTION_CALL ';'                                      #statementFunctionCall
	| type = ('int' | 'boolean')  id = IDENTIFIER '=' expr ';'          #Declaration
	| id = IDENTIFIER '=' expr ';'                                      #assignment
	| 'if' '(' cond= expr ')' then=statement  ('else' else=statement)?  #conditional
	| 'while' '(' cond=expr ')' do= statement                           #whileLoop
	| '{' statement* '}'                                                #block
	| ';'                                                               #emptyStatement
	;

expr
    : '(' expr ')'								  #exprParenthesized
    | '-'  expr									  #exprNegation
	| '!'  expr									  #exprLogicalNegation
    | expr bop = ('*' | '/' | '%') expr           #exprBinaryOp
    | expr bop = ('+' | '-') expr                 #exprBinaryOp
    | expr bop = ('<=' | '>=' | '>' | '<') expr   #exprBinaryOp
    | expr bop = ('==' | '!=') expr               #exprBinaryOp
    | expr bop = '&&' expr                        #exprBinaryOp
    | expr bop = '||' expr                        #exprBinaryOp
	| literal = (INT_LITERAL | BOOL_LITERAL)	  #exprLiteral
	| id = IDENTIFIER							  #exprVariable
	| funcName = FUNCTION_CALL					  #exprFunctionCall
	; 

/*
KEYWORD 
    : 'abstract' | 'assert' | 'boolean' | 'break' | 'byte'  
    | 'case' | 'catch' | 'char' | 'class' | 'const' | 'continue' 
	| 'default' | 'do' | 'double' | 'else' | 'enum' | 'extends' 
	| 'final' | 'finally' | 'float' | 'for' | 'if' | 'goto' 
	| 'implements' | 'import' | 'instanceof' | 'int' | 'interface' 
	| 'long' | 'native' | 'new' | 'package' | 'private' | 'protected' 
	| 'public' | 'return' | 'short' | 'static' | 'strictfp' | 'super' 
	| 'switch' | 'synchronized' | 'this' | 'throw' | 'throws' | 'transient' 
	| 'try' | 'void' | 'volatile' | 'while' | 'module' | 'open' | 'requires' 
	| 'exports' | 'opens' | 'to' | 'uses' | 'provides' | 'with' | 'transitive' 
	| 'var' | 'yield' | 'record' | 'sealed' | 'permits' | 'non-sealed' 
	;
*/

BOOL_LITERAL: 'true' | 'false';
FUNCTION_CALL: IDENTIFIER '(' [ \t]* ')';
IDENTIFIER: [a-zA-ZæøåÆØÅäöÄÖ] [a-zA-Z0-9æøåÆØÅäöÄÖ]*;
INT_LITERAL:   [0-9]+;
WS: [ \t\r\n]+ -> skip;
LINE_COMMENT: '//' ~[\r\n]* -> skip;
