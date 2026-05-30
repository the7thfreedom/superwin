import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Wraps native-keymap for the renderer (mirrors VSCode's
// keyboardLayoutMainService). Lazy-loads on first read so the native module
// only initializes when actually needed.
//
// On Windows the native module must be rebuilt against Electron's ABI and
// needs the MSVC Spectre-mitigated libraries to compile. If it is missing
// or fails to load (e.g. a contributor without that VS component), every
// entry point below degrades silently to EMPTY and the renderer falls back
// to the static US-ANSI shortcut display in `src/renderer/hotkeys/display.ts`.
// Shortcuts themselves keep working on every layout regardless.

export interface KeyboardLayoutData {
	/** OS-specific layout id, e.g. "com.apple.keylayout.German". Empty if unavailable. */
	layoutId: string;
	/** Localized human-readable name, e.g. "German". Empty if unavailable. */
	layoutName: string;
	/** Map<event.code, unshifted glyph>. Phase 2 may extend with shifted/altgr layers. */
	unshifted: Record<string, string>;
}

const EMPTY: KeyboardLayoutData = {
	layoutId: "",
	layoutName: "",
	unshifted: {},
};

const emitter = new EventEmitter();
let cached: KeyboardLayoutData = EMPTY;
let initialized = false;

type NativeKeymapModule = typeof import("native-keymap");

let nativeKeymap: NativeKeymapModule | null = null;
let nativeProbed = false;

function loadNative(): NativeKeymapModule | null {
	if (nativeProbed) return nativeKeymap;
	nativeProbed = true;
	try {
		// `require("native-keymap")` only loads the JS shim; the native `.node`
		// binding is loaded lazily on the first accessor call. On Electron 40 the
		// binding is not built (native-keymap@3.x won't compile against this ABI).
		// Crucially, native-keymap swallows the load failure internally — each
		// accessor wraps the call in try/catch and `console.error`s the error
		// before returning a fallback ([] / null), so it never throws and a
		// JS-level try/catch here cannot suppress the noise. Every accessor would
		// log once per call (a MODULE_NOT_FOUND plus null-deref TypeErrors leaking
		// out of a tRPC subscription's ReadableStream `start()`). Detect the
		// missing binary up front by probing the filesystem so we never call into
		// the module when it can't work.
		const modDir = dirname(require.resolve("native-keymap"));
		const hasBinary =
			existsSync(join(modDir, "build", "Release", "keymapping.node")) ||
			existsSync(join(modDir, "build", "Debug", "keymapping.node"));
		if (!hasBinary) {
			console.warn(
				"[keyboardLayout] native-keymap binding not built; using US-ANSI fallback",
			);
			nativeKeymap = null;
			return null;
		}
		nativeKeymap = require("native-keymap") as NativeKeymapModule;
	} catch (err) {
		console.warn(
			"[keyboardLayout] native-keymap unavailable; using US-ANSI fallback:",
			err instanceof Error ? err.message : err,
		);
		nativeKeymap = null;
	}
	return nativeKeymap;
}

function read(): KeyboardLayoutData {
	const mod = loadNative();
	if (!mod) return EMPTY;
	try {
		const info = mod.getCurrentKeyboardLayout() as {
			id?: string;
			name?: string;
			localizedName?: string;
			lang?: string;
		} | null;
		const map = mod.getKeyMap() as Record<string, { value?: string }>;
		const unshifted: Record<string, string> = {};
		for (const [code, entry] of Object.entries(map)) {
			if (entry?.value) unshifted[code] = entry.value;
		}
		return {
			layoutId: info?.id ?? info?.name ?? "",
			layoutName: info?.localizedName ?? info?.name ?? "",
			unshifted,
		};
	} catch (err) {
		console.error("[keyboardLayout] read failed:", err);
		return EMPTY;
	}
}

function ensureInitialized(): void {
	if (initialized) return;
	initialized = true;
	const mod = loadNative();
	if (!mod) return;
	cached = read();
	try {
		mod.onDidChangeKeyboardLayout(() => {
			cached = read();
			emitter.emit("change", cached);
		});
	} catch (err) {
		console.error("[keyboardLayout] failed to register listener:", err);
	}
}

/** Current layout snapshot. Initializes native-keymap on first call. */
export function getKeyboardLayoutSnapshot(): KeyboardLayoutData {
	ensureInitialized();
	return cached;
}

/** Subscribe to layout changes. Returns an unsubscribe function. */
export function onKeyboardLayoutChange(
	cb: (data: KeyboardLayoutData) => void,
): () => void {
	ensureInitialized();
	emitter.on("change", cb);
	return () => {
		emitter.off("change", cb);
	};
}
