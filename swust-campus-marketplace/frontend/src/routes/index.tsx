import { createBrowserRouter } from "react-router-dom";

import { RootLayout } from "../layouts/RootLayout";
import { CreateListingPage } from "../pages/CreateListingPage";
import { EditListingPage } from "../pages/EditListingPage";
import { FavoritesPage } from "../pages/FavoritesPage";
import { HomePage } from "../pages/HomePage";
import { ListingDetailPage } from "../pages/ListingDetailPage";
import { LoginPage } from "../pages/LoginPage";
import { MarketplacePage } from "../pages/MarketplacePage";
import {
  ConversationThreadPage,
  MessagesIndexPage,
  MessagesLayout,
} from "../pages/MessagesPage";
import { MyListingsPage } from "../pages/MyListingsPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RegisterPage } from "../pages/RegisterPage";
import { AdminLayout } from "../pages/admin/AdminLayout";
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage";
import { AdminUsersSection } from "../pages/admin/AdminUsersSection";
import { AdminListingsSection } from "../pages/admin/AdminListingsSection";
import { AdminCategoriesSection } from "../pages/admin/AdminCategoriesSection";
import { AdminStatisticsSection } from "../pages/admin/AdminStatisticsSection";
import { AdminReportsPage } from "../pages/AdminReportsPage";
import { RouteErrorPage } from "../pages/RouteErrorPage";
import { AdminRoute, GuestRoute, ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
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
        children: [
          { path: "marketplace", element: <MarketplacePage /> },
          { path: "marketplace/:id", element: <ListingDetailPage /> },
          { path: "listings/new", element: <CreateListingPage /> },
          { path: "listings/:id/edit", element: <EditListingPage /> },
          { path: "listings/mine", element: <MyListingsPage /> },
          { path: "favorites", element: <FavoritesPage /> },
          {
            path: "messages",
            element: <MessagesLayout />,
            children: [
              { index: true, element: <MessagesIndexPage /> },
              {
                path: ":conversationId",
                element: <ConversationThreadPage />,
              },
            ],
          },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          {
            path: "admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminOverviewPage /> },
              { path: "users", element: <AdminUsersSection /> },
              { path: "listings", element: <AdminListingsSection /> },
              { path: "categories", element: <AdminCategoriesSection /> },
              { path: "reports", element: <AdminReportsPage /> },
              { path: "statistics", element: <AdminStatisticsSection /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
