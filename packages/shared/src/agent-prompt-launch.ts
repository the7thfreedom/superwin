/**
 * Prompt transports define the small set of ways a CLI can receive prompt
 * payloads. Keep this enum intentionally small and add a new transport only
 * when a real agent requires it. Avoid arbitrary per-agent shell templates.
 */
export const PROMPT_TRANSPORTS = ["argv", "stdin"] as const;

export type PromptTransport = (typeof PROMPT_TRANSPORTS)[number];

/**
 * Target shell for the generated launch command. The command must match the
 * shell the terminal/PTY actually spawns:
 * - `posix`: bash/zsh/sh (macOS, Linux) — uses heredocs + command substitution.
 * - `powershell`: Windows PowerShell — uses single-quoted literals (and
 *   `Get-Content -Raw` for files). `cmd.exe` understands neither, which is why
 *   the SuperWin terminal defaults to PowerShell on Windows.
 */
export const COMMAND_SHELLS = ["posix", "powershell"] as const;

export type CommandShell = (typeof COMMAND_SHELLS)[number];

function resolveDelimiter(prompt: string, randomId: string): string {
	let delimiter = `SUPERSET_PROMPT_${randomId.replaceAll("-", "")}`;
	while (prompt.includes(delimiter)) {
		delimiter = `${delimiter}_X`;
	}
	return delimiter;
}

function quoteSingleShell(value: string): string {
	return value.replaceAll("'", "'\\''");
}

/**
 * Quote a value as a PowerShell single-quoted literal. Inside single quotes
 * PowerShell performs no expansion (no `$`, no backtick escapes), so the only
 * character that needs escaping is the single quote itself, which is doubled.
 * Newlines are preserved literally, so multi-line prompts pass through as one
 * argument with no delimiter-collision risk.
 */
function quoteSinglePowerShell(value: string): string {
	return value.replaceAll("'", "''");
}

function joinCommand(command: string, suffix?: string): string {
	return suffix ? `${command} ${suffix}` : command;
}

export function buildPromptCommandString({
	command,
	suffix,
	transport,
	prompt,
	randomId,
	shell = "posix",
}: {
	command: string;
	suffix?: string;
	transport: PromptTransport;
	prompt: string;
	randomId: string;
	shell?: CommandShell;
}): string {
	const fullCommand = joinCommand(command, suffix);

	if (shell === "powershell") {
		const literal = `'${quoteSinglePowerShell(prompt)}'`;
		if (transport === "stdin") {
			return `${literal} | ${fullCommand}`;
		}
		return `${command} ${literal}${suffix ? ` ${suffix}` : ""}`;
	}

	const delimiter = resolveDelimiter(prompt, randomId);

	if (transport === "stdin") {
		return `${fullCommand} <<'${delimiter}'\n${prompt}\n${delimiter}`;
	}

	return `${command} "$(cat <<'${delimiter}'\n${prompt}\n${delimiter}\n)"${suffix ? ` ${suffix}` : ""}`;
}

export function buildPromptFileCommandString({
	command,
	suffix,
	transport,
	filePath,
	shell = "posix",
}: {
	command: string;
	suffix?: string;
	transport: PromptTransport;
	filePath: string;
	shell?: CommandShell;
}): string {
	const fullCommand = joinCommand(command, suffix);

	if (shell === "powershell") {
		const readFile = `(Get-Content -Raw -LiteralPath '${quoteSinglePowerShell(filePath)}')`;
		if (transport === "stdin") {
			return `Get-Content -Raw -LiteralPath '${quoteSinglePowerShell(filePath)}' | ${fullCommand}`;
		}
		return `${command} ${readFile}${suffix ? ` ${suffix}` : ""}`;
	}

	const escapedPath = quoteSingleShell(filePath);

	if (transport === "stdin") {
		return `${fullCommand} < '${escapedPath}'`;
	}

	return `${command} "$(cat '${escapedPath}')"${suffix ? ` ${suffix}` : ""}`;
}
