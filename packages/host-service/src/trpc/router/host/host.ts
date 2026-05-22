import os from "node:os";
import hostServicePackageJson from "@superset/host-service/package.json" with {
	type: "json",
};
import { getHostId, getHostName } from "@superset/shared/host-info";
import { protectedProcedure, router } from "../../index";

// Auto-derived from this package's package.json so callers can report exactly
// which bundled host-service build is currently serving requests.
const HOST_SERVICE_VERSION: string = hostServicePackageJson.version;

export const hostRouter = router({
	info: protectedProcedure.query(async ({ ctx }) => {
		// Cloud org lookup was removed; report local placeholder.
		const organization = {
			id: ctx.organizationId,
			name: "Local",
			slug: "local",
		};

		return {
			hostId: getHostId(),
			hostName: getHostName(),
			version: HOST_SERVICE_VERSION,
			organization,
			platform: os.platform(),
			uptime: process.uptime(),
		};
	}),
});
