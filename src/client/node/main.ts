import { ExtensionContext } from "vscode";
import {
  BaseLanguageClient,
  LanguageClient,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { startClient } from "../client";

let client: BaseLanguageClient | null | undefined;

export async function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath("out/server/node/main.js");

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  client = await startClient(
    context,
    (id, name, clientOptions) => {
      return new LanguageClient(id, name, serverOptions, clientOptions);
    },
    {
      request: {
        getContent: async (_uri) => {
          throw new Error("Unimplemented");
        },
      },
    }
  );
}

export async function deactivate() {
  if (client) {
    await client.stop();
    client = null;
  }
}