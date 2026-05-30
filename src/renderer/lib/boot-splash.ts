/**
 * Boot splash control.
 *
 * The boot splash (`#boot-splash`) is static markup in `index.html` rendered as
 * a body-level overlay (a sibling of `<app>`), so React mounting into `<app>`
 * does NOT remove it. It stays visible — covering the otherwise-blank/black
 * window — until the app explicitly signals that real UI is on screen (e.g. the
 * worktree is ready to render), at which point we fade it out and remove it.
 */

const SPLASH_ID = "boot-splash";

let dismissed = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

const removeSplashElement = (el: HTMLElement): void => {
	el.remove();
};

/**
 * Fade out and remove the boot splash. Idempotent — safe to call multiple times
 * and from multiple call sites (workspace ready, dashboard ready, boot error,
 * safety fallback). Only the first call has any effect.
 */
export const dismissBootSplash = (): void => {
	if (dismissed) return;
	dismissed = true;

	if (fallbackTimer !== null) {
		clearTimeout(fallbackTimer);
		fallbackTimer = null;
	}

	const el = document.getElementById(SPLASH_ID);
	if (!el) return;

	el.style.transition = "opacity 200ms ease";
	el.style.opacity = "0";
	el.style.pointerEvents = "none";

	el.addEventListener("transitionend", () => removeSplashElement(el), {
		once: true,
	});
	// Fallback removal in case `transitionend` never fires.
	setTimeout(() => removeSplashElement(el), 300);
};

/**
 * Safety net: force-dismiss the splash after `ms` even if no route ever signals
 * ready (e.g. an unexpected route, or an error before a dismissal call). This
 * guarantees the splash can never get stuck on screen permanently.
 */
export const scheduleBootSplashFallback = (ms: number): void => {
	if (dismissed || fallbackTimer !== null) return;
	fallbackTimer = setTimeout(() => {
		fallbackTimer = null;
		dismissBootSplash();
	}, ms);
};
