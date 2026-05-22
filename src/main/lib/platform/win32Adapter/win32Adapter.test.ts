import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { __testing, win32Adapter } from "./win32Adapter";

describe("win32Adapter", () => {
	it("identifies as win32", () => {
		expect(win32Adapter.id).toBe("win32");
	});

	describe("ipcEndpoint", () => {
		it("returns a Named Pipe path under \\\\.\\pipe\\superset-", () => {
			const ep = win32Adapter.ipcEndpoint("terminal-host");
			expect(ep.kind).toBe("pipe");
			expect(ep.path).toBe("\\\\.\\pipe\\superset-terminal-host");
		});

		it("does not append .sock", () => {
			const ep = win32Adapter.ipcEndpoint("foo");
			expect(ep.path).not.toMatch(/\.sock$/);
		});

		it("listenOptions and connectOptions both pass the pipe path through", () => {
			const ep = win32Adapter.ipcEndpoint("foo");
			expect(win32Adapter.listenOptions(ep)).toEqual({ path: ep.path });
			expect(win32Adapter.connectOptions(ep)).toEqual({ path: ep.path });
		});

		it("cleanupEndpoint is a no-op (pipes have no filesystem entry)", async () => {
			const ep = win32Adapter.ipcEndpoint("nope");
			await expect(win32Adapter.cleanupEndpoint(ep)).resolves.toBeUndefined();
		});
	});

	describe("defaultShell", () => {
		it("returns a usable command", () => {
			const spec = win32Adapter.defaultShell();
			expect(spec.command.length).toBeGreaterThan(0);
			expect(Array.isArray(spec.args)).toBe(true);
		});

		it("unsets SHELL via envOverrides", () => {
			const spec = win32Adapter.defaultShell();
			expect(spec.envOverrides.SHELL).toBeUndefined();
			expect("SHELL" in spec.envOverrides).toBe(true);
		});
	});

	describe("processExists", () => {
		it("rejects non-positive and non-integer pids", () => {
			expect(win32Adapter.processExists(0)).toBe(false);
			expect(win32Adapter.processExists(-1)).toBe(false);
			expect(win32Adapter.processExists(Number.NaN)).toBe(false);
			expect(win32Adapter.processExists(1.5)).toBe(false);
		});
	});

	describe("killTree", () => {
		it("rejects invalid pids before shelling out", async () => {
			const result = await win32Adapter.killTree(0, "kill");
			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid pid");
		});
	});

	describe("generateCliShim", () => {
		it("writes a .cmd and a .ps1 shim", async () => {
			const dir = mkdtempSync(path.join(tmpdir(), "win32-shim-"));
			try {
				const target = "C:\\Program Files\\Superset\\resources\\bin\\super.exe";
				const result = await win32Adapter.generateCliShim({
					name: "super",
					shimDir: dir,
					targetBinary: target,
				});
				expect(result.primaryPath).toBe(path.join(dir, "super.cmd"));
				expect(result.writtenPaths).toContain(path.join(dir, "super.cmd"));
				expect(result.writtenPaths).toContain(path.join(dir, "super.ps1"));

				const fs = await import("node:fs/promises");
				const cmd = await fs.readFile(path.join(dir, "super.cmd"), "utf-8");
				expect(cmd).toContain("@echo off");
				expect(cmd).toContain(`@call "${target}" %*`);
				expect(cmd).toContain("@exit /b %ERRORLEVEL%");
				// Windows line endings preserved
				expect(cmd).toContain("\r\n");

				const ps1 = await fs.readFile(path.join(dir, "super.ps1"), "utf-8");
				expect(ps1).toContain(`& "${target}" @Args`);
				expect(ps1).toContain("exit $LASTEXITCODE");
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});
	});

	describe("resolveWindowsExecutable", () => {
		it("returns null when nothing matches on PATH", async () => {
			const result = await __testing.resolveWindowsExecutable(
				`__definitely_not_real_${Date.now()}__`,
			);
			expect(result).toBeNull();
		});
	});
});
