import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', 'dashboard-modelo/vista_personal(.*)', '/dashboard-wallet(.*)', '/dashboard-wallet(.*)', '/dashboard-publicidad(.*)',  '/dashboard-pautas(.*)', '/dashboard-modelo(.*)', '/dashboard-campana(.*)' ]);

export const onRequest = clerkMiddleware((auth, context) => {
	const {  userId } = auth();

if (!userId && isProtectedRoute(context.request)) {
		
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/' 
			}
		});
	}
});
