import type { RouteObject } from 'react-router'
import { App } from './App'
import { CanaryPage } from './CanaryPage'
import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <CanaryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
