import { PLATFORM } from "renderer/hotkeys";
import { waitForTerminalSessionReady } from "./session-readiness";

interface TerminalCreateOrAttachInput {
	paneId: string;
	tabId: string;
	workspaceId: string;
	cwd?: string;
	joinPending?: boolean;
}

interface TerminalWriteInput {
	paneId: string;
	data: string;
	throwOnError?: boolean;
}

interface LaunchCommandInPaneOptions {
	paneId: string;
	tabId: string;
	workspaceId: string;
	command: string;
	cwd?: string;
	createOrAttach: (input: TerminalCreateOrAttachInput) => Promise<unknown>;
	write: (input: TerminalWriteInput) => Promise<unknown>;
	noExecute?: boolean;
	/**
	 * Only use this for panes that will mount immediately in the active tab.
	 * Background tabs must use the helper-side attach path instead.
	 */
	waitForMountedSession?: boolean;
}

function normalizeTerminalCommand(command: string): string {
	// A terminal "Enter" keypress is a carriage return (\r) — that is what
	// xterm.js sends on Enter. On Unix the tty line discipline (ICRNL) maps a
	// bare \n to a line submit, so \n happens to work. Windows ConPTY has no
	// such line discipline: a bare \n is inserted literally and the command is
	// never executed (it sits waiting for the user to press Enter). Use \r on
	// Windows so the launch command auto-executes like it does on macOS.
	const submit = PLATFORM === "windows" ? "\r" : "\n";
	if (command.endsWith("\r") || command.endsWith("\n")) return command;
	return `${command}${submit}`;
}

interface WriteCommandInPaneOptions {
	paneId: string;
	command: string;
	write: (input: TerminalWriteInput) => Promise<unknown>;
	noExecute?: boolean;
}

interface WriteCommandsInPaneOptions {
	paneId: string;
	commands: string[] | null | undefined;
	write: (input: TerminalWriteInput) => Promise<unknown>;
}

export function buildTerminalCommand(
	commands: string[] | null | undefined,
): string | null {
	if (!Array.isArray(commands) || commands.length === 0) return null;
	return commands.join(" && ");
}

export async function writeCommandInPane({
	paneId,
	command,
	write,
	noExecute,
}: WriteCommandInPaneOptions): Promise<void> {
	const data = noExecute ? command : normalizeTerminalCommand(command);
	await write({
		paneId,
		data,
		throwOnError: true,
	});
}

export async function writeCommandsInPane({
	paneId,
	commands,
	write,
}: WriteCommandsInPaneOptions): Promise<void> {
	const command = buildTerminalCommand(commands);
	if (!command) return;
	await writeCommandInPane({ paneId, command, write });
}

export async function launchCommandInPane({
	paneId,
	tabId,
	workspaceId,
	command,
	cwd,
	createOrAttach,
	write,
	noExecute,
	waitForMountedSession,
}: LaunchCommandInPaneOptions): Promise<void> {
	if (waitForMountedSession) {
		await waitForTerminalSessionReady(paneId);
		await writeCommandInPane({ paneId, command, write, noExecute });
		return;
	}

	await ensureTerminalAttached({
		paneId,
		tabId,
		workspaceId,
		cwd,
		createOrAttach,
	});

	await writeCommandInPane({ paneId, command, write, noExecute });
}

export async function ensureTerminalAttached({
	paneId,
	tabId,
	workspaceId,
	cwd,
	createOrAttach,
}: {
	paneId: string;
	tabId: string;
	workspaceId: string;
	cwd?: string;
	createOrAttach: (input: TerminalCreateOrAttachInput) => Promise<unknown>;
}): Promise<void> {
	await createOrAttach({
		paneId,
		tabId,
		workspaceId,
		cwd,
		joinPending: true,
	});
}
