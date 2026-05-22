import { describe, expect, it } from "bun:test";
import { darwinAdapter } from "./darwinAdapter";
import { linuxAdapter } from "./linuxAdapter";
import { platform, setPlatformForTesting } from "./platform";
import { win32Adapter } from "./win32Adapter";

describe("platform singleton", () => {
	it("exposes the active adapter's id", () => {
		expect(typeof platform.id).toBe("string");
		expect(["darwin", "linux", "win32"]).toContain(platform.id);
	});

	it("can be swapped via setPlatformForTesting (by id)", () => {
		const restore = setPlatformForTesting("win32");
		try {
			expect(platform.id).toBe("win32");
			expect(platform.ipcEndpoint("foo").kind).toBe("pipe");
		} finally {
			restore();
		}
	});

	it("can be swapped via setPlatformForTesting (by adapter instance)", () => {
		const restore = setPlatformForTesting(darwinAdapter);
		try {
			expect(platform.id).toBe("darwin");
			expect(platform.ipcEndpoint("foo").kind).toBe("unix");
		} finally {
			restore();
		}
	});

	it("restore returns to the previous adapter", () => {
		const beforeId = platform.id;
		const restore = setPlatformForTesting(
			beforeId === "linux" ? "darwin" : "linux",
		);
		expect(platform.id).not.toBe(beforeId);
		restore();
		expect(platform.id).toBe(beforeId);
	});

	it("all three adapters expose the required PlatformAdapter surface", () => {
		// Required (non-optional) members of `PlatformAdapter`. Optional members
		// (`attachToJobObject`, `appleEventsPermission`) intentionally vary
		// across adapters.
		const required = [
			"id",
			"ipcEndpoint",
			"listenOptions",
			"connectOptions",
			"cleanupEndpoint",
			"defaultShell",
			"resolveExecutable",
			"killTree",
			"processExists",
			"playSound",
			"generateCliShim",
		];
		for (const adapter of [darwinAdapter, linuxAdapter, win32Adapter]) {
			for (const key of required) {
				expect(adapter).toHaveProperty(key);
			}
		}
	});
});
