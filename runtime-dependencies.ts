type PackagedNodeModuleCopy = {
	filter: string[];
	from: string;
	to: string;
};

type ExternalizedRuntimeModule = {
	asarUnpackGlobs: string[];
	materialize: string[];
	packagedCopies: PackagedNodeModuleCopy[];
	specifier: string;
	/**
	 * When set, the module is only materialized / copied / unpacked when
	 * `process.env.TARGET_PLATFORM` (or `process.platform` if unset) matches
	 * one of the listed values. Used to keep e.g. macOS-only native modules
	 * out of Windows / Linux builds.
	 */
	platforms?: NodeJS.Platform[];
};

function copyWholeModule(moduleName: string): PackagedNodeModuleCopy {
	return {
		from: `node_modules/${moduleName}`,
		to: `node_modules/${moduleName}`,
		filter: ["**/*"],
	};
}

function copyModuleSubtree(
	moduleName: string,
	filter: string[],
): PackagedNodeModuleCopy {
	return {
		from: `node_modules/${moduleName}`,
		to: `node_modules/${moduleName}`,
		filter,
	};
}

const externalizedRuntimeModules: ExternalizedRuntimeModule[] = [
	{
		specifier: "better-sqlite3",
		materialize: ["better-sqlite3"],
		packagedCopies: [copyWholeModule("better-sqlite3")],
		asarUnpackGlobs: ["**/node_modules/better-sqlite3/**/*"],
	},
	{
		specifier: "node-pty",
		materialize: ["node-pty"],
		packagedCopies: [copyWholeModule("node-pty")],
		asarUnpackGlobs: ["**/node_modules/node-pty/**/*"],
	},
	{
		specifier: "native-keymap",
		materialize: ["native-keymap"],
		packagedCopies: [copyWholeModule("native-keymap")],
		asarUnpackGlobs: ["**/node_modules/native-keymap/**/*"],
	},
	{
		specifier: "@superset/macos-process-metrics",
		materialize: ["@superset/macos-process-metrics"],
		packagedCopies: [copyWholeModule("@superset/macos-process-metrics")],
		asarUnpackGlobs: ["**/node_modules/@superset/macos-process-metrics/**/*"],
		platforms: ["darwin"],
	},
	{
		specifier: "@ast-grep/napi",
		materialize: ["@ast-grep/napi"],
		packagedCopies: [copyWholeModule("@ast-grep")],
		asarUnpackGlobs: ["**/node_modules/@ast-grep/napi*/**/*"],
	},
	{
		specifier: "@parcel/watcher",
		materialize: ["@parcel/watcher"],
		packagedCopies: [
			copyModuleSubtree("@parcel", ["watcher/**/*", "watcher-*/**/*"]),
		],
		asarUnpackGlobs: ["**/node_modules/@parcel/watcher*/**/*"],
	},
	{
		specifier: "libsql",
		materialize: ["libsql"],
		packagedCopies: [
			copyWholeModule("libsql"),
			copyWholeModule("@libsql"),
			copyWholeModule("@neon-rs"),
		],
		asarUnpackGlobs: ["**/node_modules/@libsql/**/*"],
	},
];

const packagedSupportModules = [
	copyWholeModule("bindings"),
	copyWholeModule("file-uri-to-path"),
	copyWholeModule("detect-libc"),
	copyWholeModule("is-glob"),
	copyWholeModule("is-extglob"),
	copyWholeModule("picomatch"),
	copyWholeModule("node-addon-api"),
];

export const mainExternalizedDependencies = [
	...externalizedRuntimeModules.map((module) => module.specifier),
	"pg-native",
	// mastracode transitively loads @mastra/fastembed → onnxruntime-node, whose
	// native binding is loaded via a dynamic `require` that @rollup/plugin-commonjs
	// can't resolve at bundle time. Externalizing lets Node handle the require at
	// runtime from node_modules. Also keeps the bundle size sane (~20 MB chunk).
	"mastracode",
];

const targetPlatform = (process.env.TARGET_PLATFORM ??
	process.platform) as NodeJS.Platform;

function moduleAppliesToTarget(module: ExternalizedRuntimeModule): boolean {
	return !module.platforms || module.platforms.includes(targetPlatform);
}

const applicableRuntimeModules = externalizedRuntimeModules.filter(
	moduleAppliesToTarget,
);

export const packagedNodeModuleCopies = [
	...applicableRuntimeModules.flatMap((module) => module.packagedCopies),
	...packagedSupportModules,
];

export const packagedAsarUnpackGlobs = [
	...applicableRuntimeModules.flatMap((module) => module.asarUnpackGlobs),
	"**/node_modules/bindings/**/*",
	"**/node_modules/file-uri-to-path/**/*",
];

export const requiredMaterializedNodeModules = [
	...applicableRuntimeModules.flatMap((module) => module.materialize),
	"bindings",
	"file-uri-to-path",
	"detect-libc",
	"is-glob",
	"is-extglob",
	"picomatch",
	"node-addon-api",
];
