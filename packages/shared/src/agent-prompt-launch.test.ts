import { describe, expect, it } from "bun:test";
import {
	buildPromptCommandString,
	buildPromptFileCommandString,
} from "./agent-prompt-launch";

const RANDOM_ID = "1234-5678";

describe("buildPromptCommandString — powershell", () => {
	it("passes an argv prompt as a single-quoted literal", () => {
		const command = buildPromptCommandString({
			command: "claude",
			suffix: "--permission-mode acceptEdits",
			transport: "argv",
			prompt: "hello",
			randomId: RANDOM_ID,
			shell: "powershell",
		});

		expect(command).toBe("claude 'hello' --permission-mode acceptEdits");
	});

	it("pipes a stdin prompt into the command", () => {
		const command = buildPromptCommandString({
			command: "amp",
			transport: "stdin",
			prompt: "hello",
			randomId: RANDOM_ID,
			shell: "powershell",
		});

		expect(command).toBe("'hello' | amp");
	});

	it("escapes single quotes by doubling them", () => {
		const command = buildPromptCommandString({
			command: "amp",
			transport: "argv",
			prompt: "it's a test",
			randomId: RANDOM_ID,
			shell: "powershell",
		});

		expect(command).toBe("amp 'it''s a test'");
	});

	it("preserves newlines literally without a heredoc delimiter", () => {
		const command = buildPromptCommandString({
			command: "amp",
			transport: "argv",
			prompt: "line one\nline two",
			randomId: RANDOM_ID,
			shell: "powershell",
		});

		expect(command).toBe("amp 'line one\nline two'");
		expect(command).not.toContain("SUPERSET_PROMPT");
	});
});

describe("buildPromptCommandString — posix (default)", () => {
	it("defaults to a heredoc when no shell is given", () => {
		const command = buildPromptCommandString({
			command: "amp",
			transport: "argv",
			prompt: "hello",
			randomId: RANDOM_ID,
		});

		expect(command).toContain("<<'SUPERSET_PROMPT_12345678'");
		expect(command).toContain('"$(cat');
	});
});

describe("buildPromptFileCommandString — powershell", () => {
	it("reads the file with Get-Content for an argv command", () => {
		const command = buildPromptFileCommandString({
			command: "claude",
			transport: "argv",
			filePath: ".superset/task-foo.md",
			shell: "powershell",
		});

		expect(command).toBe(
			"claude (Get-Content -Raw -LiteralPath '.superset/task-foo.md')",
		);
	});

	it("pipes file contents into a stdin command", () => {
		const command = buildPromptFileCommandString({
			command: "amp",
			transport: "stdin",
			filePath: ".superset/task-foo.md",
			shell: "powershell",
		});

		expect(command).toBe(
			"Get-Content -Raw -LiteralPath '.superset/task-foo.md' | amp",
		);
	});
});

describe("buildPromptFileCommandString — posix (default)", () => {
	it("defaults to cat for an argv command", () => {
		const command = buildPromptFileCommandString({
			command: "amp",
			transport: "argv",
			filePath: ".superset/task-foo.md",
		});

		expect(command).toBe("amp \"$(cat '.superset/task-foo.md')\"");
	});
});
