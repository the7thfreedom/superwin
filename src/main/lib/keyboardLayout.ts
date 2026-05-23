import { EventEmitter } from "node:events";

// Layout-aware keyboard support (formerly backed by `native-keymap`) was
// removed for SuperWin: it required a native module that needs MSVC
// Spectre-mitigated libraries to rebuild on Windows, and the only benefit
// was making shortcut labels follow non-US-ANSI layouts (Dvorak / AZERTY
// / QWERTZ / German / ...). Shortcuts themselves still work on every
// layout — they fall back to the static US-ANSI display in
// `src/renderer/hotkeys/display.ts`.
//
// This module is kept as a thin no-op so the tRPC router and renderer
// store keep compiling without conditional imports. `getKeyboardLayoutSnapshot`
// always returns EMPTY and `onKeyboardLayoutChange` is a no-op subscribe.
// If layout-awareness is wanted back, restore the native-keymap wrapper
// from git history (commit 5e7519d or earlier).

export interface KeyboardLayoutData {
	/** OS-specific layout id, e.g. "com.apple.keylayout.German". Empty if unavailable. */
	layoutId: string;
	/** Localized human-readable name, e.g. "German". Empty if unavailable. */
	layoutName: string;
	/** Map<event.code, unshifted glyph>. Empty in SuperWin (no layout source). */
	unshifted: Record<string, string>;
}

const EMPTY: KeyboardLayoutData = {
	layoutId: "",
	layoutName: "",
	unshifted: {},
};

const emitter = new EventEmitter();

/** Current layout snapshot. Always EMPTY in SuperWin (renderer falls back to US-ANSI). */
export function getKeyboardLayoutSnapshot(): KeyboardLayoutData {
	return EMPTY;
}

/** No-op subscribe — layout never changes here. Returns an unsubscribe function. */
export function onKeyboardLayoutChange(
	cb: (data: KeyboardLayoutData) => void,
): () => void {
	emitter.on("change", cb);
	return () => {
		emitter.off("change", cb);
	};
}
