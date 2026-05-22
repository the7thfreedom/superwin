// Stub: auth removed in local-only build. No-op surface so consumers compile.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
	authToken = token;
}

export function getAuthToken(): string | null {
	return authToken;
}

let jwt: string | null = null;

export function setJwt(token: string | null) {
	jwt = token;
}

export function getJwt(): string | null {
	return jwt;
}

const emptySessionState = {
	data: null,
	isPending: false,
	error: null,
	refetch: () => {},
};

// Permissive any-typed proxy: every property access returns either an empty-session
// hook result or a no-op async function. Allows wide variety of
// `authClient.x.y()` call sites to still compile after the real client is removed.
function makeStub(): any {
	const target: any = function () {
		return emptySessionState;
	};
	return new Proxy(target, {
		get(_t, prop) {
			if (prop === "useSession") return () => emptySessionState;
			if (prop === "getSession") return async () => ({ data: null, error: null });
			if (prop === "$Infer") return {};
			return makeStub();
		},
		apply() {
			return emptySessionState;
		},
	});
}

export const authClient: any = makeStub();
