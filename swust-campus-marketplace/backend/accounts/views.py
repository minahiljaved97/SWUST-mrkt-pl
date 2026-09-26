from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .permissions import IsAdmin, IsAuthenticatedAndActive, IsOwner
from .serializers import (
    AdminUserUpdateSerializer,
    EmailTokenObtainPairSerializer,
    LogoutSerializer,
    MeUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .throttles import (
    AuthBurstAnonThrottle,
    AuthBurstUserThrottle,
    AuthSustainedAnonThrottle,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = RegisterSerializer
    throttle_classes = [AuthBurstAnonThrottle, AuthSustainedAnonThrottle]

    @extend_schema(tags=["auth"], responses={201: UserSerializer})
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthBurstAnonThrottle, AuthSustainedAnonThrottle]


class RefreshTokenView(TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthBurstAnonThrottle, AuthBurstUserThrottle]


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthBurstUserThrottle]
    serializer_class = LogoutSerializer

    @extend_schema(tags=["auth"], request=LogoutSerializer, responses={205: None})
    def post(self, request, *args, **kwargs):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticatedAndActive, IsOwner]
    throttle_classes = [AuthBurstUserThrottle]

    def get_object(self):
        return self.request.user

    @extend_schema(tags=["auth"], responses={200: UserSerializer})
    def get(self, request, *args, **kwargs):
        self.check_object_permissions(request, request.user)
        return Response(UserSerializer(request.user).data)

    @extend_schema(tags=["auth"], request=MeUpdateSerializer, responses={200: UserSerializer})
    def patch(self, request, *args, **kwargs):
        self.check_object_permissions(request, request.user)
        serializer = MeUpdateSerializer(
            instance=request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)


class AdminUserViewSet(viewsets.ModelViewSet):
    """Admin-only user management (list/retrieve/update; no create/destroy)."""

    permission_classes = [IsAdmin]
    queryset = User.objects.select_related("profile").all()
    http_method_names = ["get", "patch", "head", "options"]
    lookup_field = "id"
    search_fields = ("email", "first_name", "last_name", "profile__student_id")
    filterset_fields = ("role", "is_active")
    ordering_fields = ("date_joined", "email")

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return AdminUserUpdateSerializer
        return UserSerializer
