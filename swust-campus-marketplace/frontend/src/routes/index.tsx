import { createBrowserRouter } from "react-router-dom";

import { RootLayout } from "../layouts/RootLayout";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RegisterPage } from "../pages/RegisterPage";
import { AdminRoute, GuestRoute, ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <GuestRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [{ path: "profile", element: <ProfilePage /> }],
      },
      {
        element: <AdminRoute />,
        children: [{ path: "admin/users", element: <AdminUsersPage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
