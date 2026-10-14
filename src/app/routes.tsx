import type { RouteObject } from 'react-router'
import { App } from './App'
import { CanaryPage } from './CanaryPage'
import { NotFoundPage } from './NotFoundPage'

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
    element: <App />,
    children: [
      { index: true, element: <CanaryPage /> },
      ...devRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
