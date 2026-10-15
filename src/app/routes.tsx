import type { RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { ErrorPage } from './ErrorPage'
import { NotFoundPage } from './NotFoundPage'
import { RouteSkeleton } from './RouteSkeleton'

// Dev-only routes: statically false in production builds, so their chunks are never emitted.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'design',
        lazy: async () => ({
          Component: (await import('@/features/design/DesignPage')).DesignPage,
        }),
      },
    ]
  : []

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    HydrateFallback: RouteSkeleton,
    children: [
      {
        // Pathless layout so route errors render inside the shell (tab bar stays usable).
        errorElement: <ErrorPage />,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/features/map/MapPage')).MapPage }),
          },
          {
            path: 'fil',
            lazy: async () => ({ Component: (await import('@/features/feed/FeedPage')).FeedPage }),
          },
          {
            path: 'm/:storeId',
            lazy: async () => ({
              Component: (await import('@/features/store/StorePage')).StorePage,
            }),
          },
          {
            path: 'signaler',
            lazy: async () => ({
              Component: (await import('@/features/report/ReportPage')).ReportPage,
            }),
          },
          {
            path: 'compte',
            lazy: async () => ({
              Component: (await import('@/features/account/AccountPage')).AccountPage,
            }),
          },
          {
            path: 'connexion',
            lazy: async () => ({
              Component: (await import('@/features/auth/LoginPage')).LoginPage,
            }),
          },
          {
            path: 'auth/callback',
            lazy: async () => ({
              Component: (await import('@/features/auth/AuthCallbackPage')).AuthCallbackPage,
            }),
          },
          ...devRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
