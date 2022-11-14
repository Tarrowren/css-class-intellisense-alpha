import { CancellationToken, Disposable, ExtensionContext, FilePermission, FileType } from "vscode";
import { convertToHttpScheme } from "../file-system";
import { RuntimeEnvironment } from "../runner";
import { createLanguageServer, LanguageServer } from "../server";

let server: LanguageServer | null;

export function activate(context: ExtensionContext) {
  const runtime: RuntimeEnvironment = {
    request: {
      async readFile(uri, token) {
        uri = convertToHttpScheme(uri);

        const signal = toSignal(token);

        const res = await fetch(uri.toString(), { method: "GET", mode: "cors", signal });

        if (res.ok) {
          return new Uint8Array(await res.arrayBuffer());
        } else {
          throw new Error(`Error: ${res.statusText}`);
        }
      },
      async stat(uri, token) {
        uri = convertToHttpScheme(uri);

        const signal = toSignal(token);

        const res = await fetch(uri.toString(), { method: "HEAD", mode: "cors", signal });

        if (res.ok) {
          const lastModified = res.headers.get("last-modified");
          const contentLength = res.headers.get("content-length");

          return {
            type: FileType.File,
            ctime: 0,
            mtime: lastModified ? Date.parse(lastModified) : 0,
            size: contentLength ? Number.parseInt(contentLength) : 0,
            permissions: FilePermission.Readonly,
          };
        } else {
          throw new Error(`Error: ${res.statusText}`);
        }
      },
    },
    timer: {
      setImmediate(callback, ...args) {
        const handle = setTimeout(callback, 0, ...args);
        return new Disposable(() => clearTimeout(handle));
      },
      setInterval(callback, ms, ...args) {
        const handle = setTimeout(callback, ms, ...args);
        return new Disposable(() => clearTimeout(handle));
      },
      setTimeout(callback, ms, ...args) {
        const handle = setInterval(callback, ms, ...args);
        return new Disposable(() => clearInterval(handle));
      },
    },
    util: {
      decode(input, encoding) {
        return new TextDecoder(encoding).decode(input);
      },
    },
  };

  server = createLanguageServer(context, runtime);
}

export function deactivate() {
  if (server) {
    server = null;
  }
}

function toSignal(token?: CancellationToken): AbortSignal | undefined {
  if (!token) {
    return;
  }

  const controller = new AbortController();

  if (token.isCancellationRequested) {
    (controller as any).abort();
  } else {
    token.onCancellationRequested(() => {
      (controller as any).abort();
    });
  }

  return controller.signal;
}
