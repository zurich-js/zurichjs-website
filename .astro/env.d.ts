declare module 'astro:env/client' {
	export const PUBLIC_CLERK_PUBLISHABLE_KEY: string;	
	export const PUBLIC_CLERK_SIGN_IN_URL: string | undefined;	
	export const PUBLIC_CLERK_SIGN_UP_URL: string | undefined;	
	export const PUBLIC_CLERK_IS_SATELLITE: boolean | undefined;	
	export const PUBLIC_CLERK_PROXY_URL: string | undefined;	
	export const PUBLIC_CLERK_DOMAIN: string | undefined;	
	export const PUBLIC_CLERK_JS_URL: string | undefined;	
	export const PUBLIC_CLERK_JS_VARIANT: 'headless' | undefined;	
	export const PUBLIC_CLERK_JS_VERSION: string | undefined;	
	export const PUBLIC_CLERK_TELEMETRY_DISABLED: boolean | undefined;	
	export const PUBLIC_CLERK_TELEMETRY_DEBUG: boolean | undefined;	
}declare module 'astro:env/server' {
	export const CLERK_SECRET_KEY: string;	
	export const CLERK_MACHINE_SECRET_KEY: string | undefined;	
	export const CLERK_JWT_KEY: string | undefined;	
}