from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()

urlpatterns = [
    path(
        "token/",
        TokenObtainPairView.as_view(
            permission_classes=[AllowAny],
            authentication_classes=[],
        ),
        name="token_obtain_pair",
    ),
    path(
        "token/refresh/",
        TokenRefreshView.as_view(
            permission_classes=[AllowAny],
            authentication_classes=[],
        ),
        name="token_refresh",
    ),
    *router.urls,
]
