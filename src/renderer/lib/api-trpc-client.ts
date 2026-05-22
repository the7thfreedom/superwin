// Stub: cloud API tRPC client removed. Any access throws at runtime.
const handler: ProxyHandler<any> = {
	get() {
		throw new Error("apiTrpcClient: cloud API removed");
	},
};
export const apiTrpcClient: any = new Proxy({}, handler);
