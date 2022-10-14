import { parseMixed, SyntaxNodeRef } from "@lezer/common";
import * as LEZER_CSS from "@lezer/css";
import * as LEZER_HTML from "@lezer/html";
import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI, Utils } from "vscode-uri";
import {
  CssNodeType,
  HtmlNodeType,
  LEZER_CSS_NODE_TYPES,
  LEZER_HTML_NODE_TYPES,
} from "../nodetype";
import { getLanguageModelCache } from "./cache";
import { CssStore } from "./cssStore";
import { LanguageMode } from "./languageModes";

const HTML_CSS_PARSER = LEZER_HTML.parser.configure({
  wrap: parseMixed((node) => {
    if (node.type === LEZER_HTML_NODE_TYPES[HtmlNodeType.StyleText]) {
      return { parser: LEZER_CSS.parser };
    }

    return null;
  }),
});

export function getHTMLMode(cssStore: CssStore): LanguageMode {
  const trees = getLanguageModelCache(10, 60, (textDocument) =>
    HTML_CSS_PARSER.parse(textDocument.getText())
  );

  return {
    getId() {
      return "html";
    },
    async doComplete(document, position) {
      const tree = trees.get(document);

      const cursor = tree.cursorAt(document.offsetAt(position));

      if (
        cursor.type !== LEZER_HTML_NODE_TYPES[HtmlNodeType.AttributeValue] ||
        !cursor.prevSibling() ||
        cursor.type !== LEZER_HTML_NODE_TYPES[HtmlNodeType.Is] ||
        !cursor.prevSibling() ||
        cursor.type !== LEZER_HTML_NODE_TYPES[HtmlNodeType.AttributeName] ||
        getText(document, cursor) !== "class"
      ) {
        return null;
      }

      let urls = new Set<string>();
      let items = new Map<string, CompletionItem>();

      tree.cursor().iterate((ref) => {
        if (ref.type === LEZER_HTML_NODE_TYPES[HtmlNodeType.SelfClosingTag]) {
          getUrlForLinks(document, ref, urls);
          return false;
        } else if (ref.type === LEZER_CSS_NODE_TYPES[CssNodeType.ClassName]) {
          const label = getText(document, ref);
          if (label) {
            if (items.has(label)) {
              // TODO
            } else {
              items.set(label, {
                label,
                kind: CompletionItemKind.Class,
              });
            }
          }
        }
      });

      const documentUri = URI.parse(document.uri);

      let isIncomplete = false;

      const uris: URI[] = [];
      for (const url of urls) {
        const uri = URI.parse(url);
        if (uri.scheme === "file") {
          const uri = Utils.joinPath(documentUri, "..", url);
          uris.push(uri);
        } else if (uri.scheme === "http" || uri.scheme === "https") {
          uris.push(uri);
        }
      }

      const results = await cssStore.getCompletionLists(uris, document.uri);
      for (const result of results) {
        if (result.isIncomplete) {
          isIncomplete = true;
        } else {
          result.items.forEach((item) => {
            const label = item.label;
            if (items.has(label)) {
              // TODO
            } else {
              items.set(label, item);
            }
          });
        }
      }

      return CompletionList.create([...items.values()], isIncomplete);
    },
    async doResolve(document, item) {
      item.detail = item.label;
      return item;
    },
    onDocumentRemoved(document) {
      trees.onDocumentRemoved(document.uri);
    },
    dispose() {
      trees.dispose();
    },
  };
}

function getText(document: TextDocument, node: SyntaxNodeRef) {
  return document.getText().substring(node.from, node.to);
}

function getUrlForLinks(
  document: TextDocument,
  ref: SyntaxNodeRef,
  urls: Set<string>
) {
  const node = ref.node;
  const tagNameNode = node.getChild(HtmlNodeType.TagName);
  if (!tagNameNode || getText(document, tagNameNode) !== "link") {
    return;
  }

  const attrs = node.getChildren(HtmlNodeType.Attribute);

  for (const attr of attrs) {
    if (
      attr.firstChild &&
      attr.firstChild.type ===
        LEZER_HTML_NODE_TYPES[HtmlNodeType.AttributeName] &&
      attr.lastChild &&
      attr.lastChild.type === LEZER_HTML_NODE_TYPES[HtmlNodeType.AttributeValue]
    ) {
      if (
        getText(document, attr.firstChild) === "rel" &&
        getText(document, attr.lastChild).slice(1, -1) !== "stylesheet"
      ) {
        return;
      }

      if (getText(document, attr.firstChild) === "href") {
        const href = getText(document, attr.lastChild).slice(1, -1);
        if (href) {
          urls.add(href);
        }
      }
    }
  }
}
