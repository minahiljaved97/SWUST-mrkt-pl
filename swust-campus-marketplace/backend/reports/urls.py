from rest_framework.routers import DefaultRouter

from .views import AdminReportViewSet, ReportViewSet

router = DefaultRouter()
router.register("reports", ReportViewSet, basename="report")
router.register("admin/reports", AdminReportViewSet, basename="admin-report")
urlpatterns = router.urls
