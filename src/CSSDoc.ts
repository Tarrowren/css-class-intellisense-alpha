import { CompletionItem, TextDocument } from "vscode";
import { Doc, DocAnalysis } from "./Doc";
import Parser = require("tree-sitter");
import CSS = require("tree-sitter-css");

export class CSSDoc extends Doc implements DocAnalysis {
    constructor(document: TextDocument, parser: Parser) {
        super(document, parser);
        this.parser.setLanguage(CSS);
        this.cssTree = this.parser.parse(this.document.getText());
    }

    editTree(delta: Parser.Edit): void {
        this.cssTree?.edit(delta);
        this.parser.setLanguage(CSS);
        this.cssTree = this.parser.parse(this.document.getText(), this.cssTree);
    }

    getCompletionItems(): CompletionItem[] {
        return this.cssClassAnalysis();
    }
}
