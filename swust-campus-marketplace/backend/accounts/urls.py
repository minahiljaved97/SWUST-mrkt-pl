from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminUserViewSet,
    LoginView,
    LogoutView,
    MeView,
    RefreshTokenView,
    RegisterView,
)

router = DefaultRouter()
router.register("users", AdminUserViewSet, basename="auth-users")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("token/refresh/", RefreshTokenView.as_view(), name="auth-token-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("", include(router.urls)),
]
