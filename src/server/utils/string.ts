import { SyntaxNodeRef } from "@lezer/common";
import { TextDocument } from "vscode-languageserver-textdocument";

const HT = 0x09;
const LF = 0x0a;
const VT = 0x0b;
const FF = 0x0c;
const CR = 0x0d;
const SPACE = 0x20;

export function isEmptyCode(code: number) {
  return code === HT || code === LF || code === VT || code === FF || code === CR || code === SPACE;
}

export function nearby(text: string, pos: number): string | undefined {
  let start = pos;
  let end = pos;
  const length = text.length;

  for (let i = pos; i <= length; i++) {
    end = i;
    if (i === length || isEmptyCode(text.charCodeAt(i))) {
      break;
    }
  }

  for (let i = pos - 1; i >= 0; i--) {
    if (isEmptyCode(text.charCodeAt(i))) {
      break;
    }
    start = i;
  }

  if (start < end) {
    return text.substring(start, end);
  }
}

export function getText(document: TextDocument, node: SyntaxNodeRef) {
  return document.getText().substring(node.from, node.to);
}
