import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { darwinAdapter } from "./darwinAdapter";

describe("darwinAdapter", () => {
	it("identifies as darwin", () => {
		expect(darwinAdapter.id).toBe("darwin");
	});

	describe("ipcEndpoint", () => {
		it("returns a unix-domain socket path under ~/.superset", () => {
			const ep = darwinAdapter.ipcEndpoint("terminal-host");
			expect(ep.kind).toBe("unix");
			expect(ep.path).toMatch(/terminal-host\.sock$/);
		});

		it("listenOptions and connectOptions return the same path", () => {
			const ep = darwinAdapter.ipcEndpoint("foo");
			expect(darwinAdapter.listenOptions(ep)).toEqual({ path: ep.path });
			expect(darwinAdapter.connectOptions(ep)).toEqual({ path: ep.path });
		});

		it("cleanupEndpoint is a no-op when the file does not exist", async () => {
			const ep = darwinAdapter.ipcEndpoint(
				`nonexistent-${Date.now()}-${Math.random()}`,
			);
			await expect(darwinAdapter.cleanupEndpoint(ep)).resolves.toBeUndefined();
		});
	});

	describe("defaultShell", () => {
		it("falls back to /bin/zsh when SHELL is unset", () => {
			const previous = process.env.SHELL;
			delete process.env.SHELL;
			try {
				const spec = darwinAdapter.defaultShell();
				expect(spec.command).toBe("/bin/zsh");
				expect(spec.args).toEqual(["-l"]);
			} finally {
				if (previous !== undefined) process.env.SHELL = previous;
			}
		});

		it("honors SHELL when set", () => {
			const previous = process.env.SHELL;
			process.env.SHELL = "/opt/homebrew/bin/fish";
			try {
				expect(darwinAdapter.defaultShell().command).toBe(
					"/opt/homebrew/bin/fish",
				);
			} finally {
				if (previous === undefined) delete process.env.SHELL;
				else process.env.SHELL = previous;
			}
		});
	});

	describe("processExists", () => {
		it("returns true for the current process", () => {
			expect(darwinAdapter.processExists(process.pid)).toBe(true);
		});

		it("returns false for an invalid pid", () => {
			expect(darwinAdapter.processExists(0)).toBe(false);
			expect(darwinAdapter.processExists(-1)).toBe(false);
			expect(darwinAdapter.processExists(Number.NaN)).toBe(false);
		});

		it("returns false for a pid that almost certainly does not exist", () => {
			// 2^22 is well below the platform max but unlikely to be live.
			expect(darwinAdapter.processExists(4_194_303)).toBe(false);
		});
	});

	describe("generateCliShim", () => {
		it("writes a POSIX shim with shebang and exec line", async () => {
			const dir = mkdtempSync(path.join(tmpdir(), "darwin-shim-"));
			try {
				const result = await darwinAdapter.generateCliShim({
					name: "super",
					shimDir: dir,
					targetBinary: "/Applications/Superset.app/Contents/Resources/bin/super",
				});
				expect(result.primaryPath).toBe(path.join(dir, "super"));
				expect(result.writtenPaths).toEqual([result.primaryPath]);

				const fs = await import("node:fs/promises");
				const contents = await fs.readFile(result.primaryPath, "utf-8");
				expect(contents).toStartWith("#!/bin/sh\n");
				expect(contents).toContain(
					"exec '/Applications/Superset.app/Contents/Resources/bin/super'",
				);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});

		it("escapes single quotes in the target path", async () => {
			const dir = mkdtempSync(path.join(tmpdir(), "darwin-shim-"));
			try {
				const target = "/Applications/Super'set.app/bin/super";
				const result = await darwinAdapter.generateCliShim({
					name: "super",
					shimDir: dir,
					targetBinary: target,
				});
				const fs = await import("node:fs/promises");
				const contents = await fs.readFile(result.primaryPath, "utf-8");
				// `'` becomes `'"'"'`
				expect(contents).toContain(`'"'"'`);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});
	});

	describe("appleEventsPermission", () => {
		it("returns 'unsupported' in the M1 placeholder implementation", async () => {
			expect(await darwinAdapter.appleEventsPermission?.()).toBe("unsupported");
		});
	});
});
