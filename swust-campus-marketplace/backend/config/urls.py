from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.permissions import AllowAny

from config.views import health

schema_view = SpectacularAPIView.as_view(
    permission_classes=[AllowAny],
    authentication_classes=[],
)
swagger_view = SpectacularSwaggerView.as_view(
    url_name="schema",
    permission_classes=[AllowAny],
    authentication_classes=[],
)
redoc_view = SpectacularRedocView.as_view(
    url_name="schema",
    permission_classes=[AllowAny],
    authentication_classes=[],
)

api_v1_patterns = [
    path("health/", health, name="health"),
    path("auth/", include("accounts.urls")),
    path("", include("categories.urls")),
    path("", include("listings.urls")),
    path("", include("favorites.urls")),
    path("", include("messaging.urls")),
    path("", include("reports.urls")),
    path("dashboard/", include("dashboard.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", schema_view, name="schema"),
    path("api/docs/", swagger_view, name="swagger-ui"),
    path("api/redoc/", redoc_view, name="redoc"),
    path("api/<str:version>/", include((api_v1_patterns, "api"))),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
