import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { GtmDebugSession } from './session';
import * as Net from 'net';

export function activate(context: vscode.ExtensionContext) {

	const provider = new GtmConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('gtm', provider));

	// The following use of a DebugAdapter factory shows how to run the debug adapter inside the extension host (and not as a separate process).
	const factory = new GtmDebugAdapterDescriptorFactory();
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('gtm', factory));
	context.subscriptions.push(factory);
}

export function deactivate() {
	// nothing to do
}

class GtmConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
		// for now do nothing
		return config;
	}
}

class GtmDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {

	private server?: Net.Server;

	createDebugAdapterDescriptor(): vscode.ProviderResult<vscode.DebugAdapterServer> {

		if (!this.server) {
			// start listening on a random port
			this.server = Net.createServer(socket => {
				const session = new GtmDebugSession();
				session.setRunAsServer(true);
				session.start(<NodeJS.ReadableStream>socket, socket);
			}).listen(0);
		}

		// make VS Code connect to debug server
		return new vscode.DebugAdapterServer((<Net.AddressInfo>this.server.address()).port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
		}
	}
}
