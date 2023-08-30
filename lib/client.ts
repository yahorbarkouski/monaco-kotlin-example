import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import * as vscode from 'vscode';
import 'vscode/default-extensions/theme-defaults';
import { updateUserConfiguration } from 'vscode/service-override/configuration';
import { LogLevel } from 'vscode/services';
import { createConfiguredEditor, createModelReference } from 'vscode/monaco';
import { ExtensionHostKind, registerExtension } from 'vscode/extensions';
import { initServices, MonacoLanguageClient } from 'monaco-languageclient';
import { CloseAction, ErrorAction, MessageTransports } from 'vscode-languageclient';
import { WebSocketMessageReader, WebSocketMessageWriter, toSocket } from 'vscode-ws-jsonrpc';

const languageId = 'kotlin';
let languageClient: MonacoLanguageClient;

const createWebSocket = (url: string): WebSocket => {
    const webSocket = new WebSocket(url);
    webSocket.onopen = async () => {
        const socket = toSocket(webSocket);
        const reader = new WebSocketMessageReader(socket);
        const writer = new WebSocketMessageWriter(socket);
        languageClient = createLanguageClient({
            reader,
            writer
        });
        await languageClient.start();
        reader.onClose(() => languageClient.stop());
    };
    return webSocket;
};

const createLanguageClient = (transports: MessageTransports): MonacoLanguageClient => {
    return new MonacoLanguageClient({
        name: 'Kotlin Language Client', // Change the name
        clientOptions: {
            documentSelector: [languageId],
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart })
            },
            workspaceFolder: {
                index: 0,
                name: 'workspace',
                uri: monaco.Uri.parse('/tmp')
            },
            synchronize: {
                fileEvents: [vscode.workspace.createFileSystemWatcher('**')]
            }
        },
        connectionProvider: {
            get: () => {
                return Promise.resolve(transports);
            }
        }
    });
};

export const run = async () => {
    await initServices({
        enableModelService: true,
        enableThemeService: true,
        enableTextmateService: true,
        configureConfigurationService: {
            defaultWorkspaceUri: '/tmp'
        },
        enableLanguagesService: true,
        enableKeybindingsService: true,
        debugLogging: true,
        logLevel: LogLevel.Debug
    });

    const extension = {
        name: 'kotlin-client', // Change the name
        publisher: 'monaco-languageclient-project',
        version: '1.0.0',
        engines: {
            vscode: '^1.81.0'
        },
        contributes: {
            languages: [{
                id: languageId,
                aliases: [
                    'Kotlin'
                ],
                extensions: [
                    '.kt',
                    '.kts'
                ]
            }],
            commands: [{
                command: 'kotlin.restartserver', // Change the command
                title: 'Kotlin: Restart Server',
                category: 'Kotlin' // Change the category
            },
            {
                command: 'kotlin.organizeimports', // Change the command
                title: 'Kotlin: Organize Imports',
                category: 'Kotlin' // Change the category
            }],
            keybindings: [{
                key: 'ctrl+k',
                command: 'kotlin.restartserver', // Change the command
                when: 'editorTextFocus'
            }]
        }
    };
    // @ts-ignore
    registerExtension(extension, ExtensionHostKind.LocalProcess);

    updateUserConfiguration(`{
        "editor.fontSize": 14,
        "workbench.colorTheme": "Default Dark Modern"
    }`);

    createWebSocket('ws://localhost:30000/kotlin'); // Change the path

    const registerCommand = async (cmdName: string, handler: (...args: unknown[]) => void) => {
        const commands = await vscode.commands.getCommands(true);
        if (!commands.includes(cmdName)) {
            vscode.commands.registerCommand(cmdName, handler);
        }
    };

    await registerCommand('kotlin.restartserver', (...args) => {
        languageClient.sendRequest('workspace/executeCommand', { command: 'kotlin.restartserver', arguments: args }); // Change the command
    });

    await registerCommand('kotlin.organizeimports', (...args) => {
        languageClient.sendRequest('workspace/executeCommand', { command: 'kotlin.organizeimports', arguments: args }); // Change the command
    });

    // use the file create before
    const modelRef = await createModelReference(monaco.Uri.file('/tmp/hello.kt'), 'hello');
    modelRef.object.setLanguageId(languageId);

    createConfiguredEditor(document.getElementById('container')!, {
        model: modelRef.object.textEditorModel,
        automaticLayout: true
    });
};
