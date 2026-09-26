from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminCategoryViewSet,
    AdminDashboardStatisticsView,
    AdminDashboardSummaryView,
    AdminListingViewSet,
    AdminUserViewSet,
)

router = DefaultRouter()
router.register("admin/users", AdminUserViewSet, basename="admin-user")
router.register("admin/listings", AdminListingViewSet, basename="admin-listing")
router.register("admin/categories", AdminCategoryViewSet, basename="admin-category")

urlpatterns = [
    path(
        "admin/dashboard/summary/",
        AdminDashboardSummaryView.as_view(),
        name="admin-dashboard-summary",
    ),
    path(
        "admin/dashboard/statistics/",
        AdminDashboardStatisticsView.as_view(),
        name="admin-dashboard-statistics",
    ),
    *router.urls,
]
