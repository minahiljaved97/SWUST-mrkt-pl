from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.utils.module_loading import import_string
from django.views.static import serve
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from config.views import health

_schema_permission_classes = [
    import_string(path)
    for path in settings.SPECTACULAR_SETTINGS.get(
        "SERVE_PERMISSIONS",
        ["rest_framework.permissions.AllowAny"],
    )
]

schema_view = SpectacularAPIView.as_view(
    permission_classes=_schema_permission_classes,
)
swagger_view = SpectacularSwaggerView.as_view(
    url_name="schema",
    permission_classes=_schema_permission_classes,
)
redoc_view = SpectacularRedocView.as_view(
    url_name="schema",
    permission_classes=_schema_permission_classes,
)

api_v1_patterns = [
    path("health/", health, name="health"),
    path("auth/", include("accounts.urls")),
    path("", include("categories.urls")),
    path("", include("listings.urls")),
    path("", include("favorites.urls")),
    path("", include("messaging.urls")),
    path("", include("reports.urls")),
    path("", include("dashboard.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", schema_view, name="schema"),
    path("api/docs/", swagger_view, name="swagger-ui"),
    path("api/redoc/", redoc_view, name="redoc"),
    path("api/<str:version>/", include((api_v1_patterns, "api"))),
]

if settings.DEBUG or getattr(settings, "SERVE_MEDIA", False):
    urlpatterns += [
        path(
            "media/<path:path>",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
