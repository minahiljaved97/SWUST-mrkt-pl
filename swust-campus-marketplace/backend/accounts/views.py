from django.contrib.auth import get_user_model
from drf_spectacular.utils import (
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from config.openapi import (
    AUTH_ERRORS,
    COMMON_ERROR_RESPONSES,
    ERROR_400,
    ERROR_401,
    ERROR_403,
    ERROR_429,
    PAGE_PARAMS,
    SEARCH_PARAM,
)

from .permissions import IsAdmin, IsAuthenticatedAndActive, IsOwner
from .serializers import (
    AdminManagedUserSerializer,
    AdminUserUpdateSerializer,
    EmailTokenObtainPairSerializer,
    LoginResponseSerializer,
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

    @extend_schema(
        tags=["Authentication"],
        summary="Register student",
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(response=UserSerializer),
            **AUTH_ERRORS,
        },
        auth=[],
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Authentication"],
    summary="Login",
    request=EmailTokenObtainPairSerializer,
    responses={
        200: OpenApiResponse(response=LoginResponseSerializer),
        **AUTH_ERRORS,
    },
    auth=[],
)
class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthBurstAnonThrottle, AuthSustainedAnonThrottle]


@extend_schema(
    tags=["Authentication"],
    summary="Refresh access token",
    responses={
        200: OpenApiResponse(description="New access token."),
        **AUTH_ERRORS,
    },
    auth=[],
)
class RefreshTokenView(TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthBurstAnonThrottle, AuthBurstUserThrottle]


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthBurstUserThrottle]
    serializer_class = LogoutSerializer

    @extend_schema(
        tags=["Authentication"],
        summary="Logout",
        request=LogoutSerializer,
        responses={
            205: OpenApiResponse(description="Refresh token blacklisted."),
            400: ERROR_400,
            401: ERROR_401,
            429: ERROR_429,
        },
    )
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

    @extend_schema(
        tags=["Users & Profiles"],
        summary="Get my profile",
        responses={
            200: UserSerializer,
            401: ERROR_401,
            403: ERROR_403,
        },
    )
    def get(self, request, *args, **kwargs):
        self.check_object_permissions(request, request.user)
        return Response(UserSerializer(request.user).data)

    @extend_schema(
        tags=["Users & Profiles"],
        summary="Update my profile",
        description="Partial update of name and profile fields. Does not change email, role, or student_id.",
        request=MeUpdateSerializer,
        responses={
            200: UserSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
        },
    )
    def patch(self, request, *args, **kwargs):
        self.check_object_permissions(request, request.user)
        serializer = MeUpdateSerializer(
            instance=request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)


@extend_schema_view(
    list=extend_schema(
        tags=["Users & Profiles"],
        summary="List users (admin)",
        description="Phone numbers are omitted.",
        parameters=[*PAGE_PARAMS, SEARCH_PARAM],
        responses={200: AdminManagedUserSerializer, **COMMON_ERROR_RESPONSES},
    ),
    retrieve=extend_schema(
        tags=["Users & Profiles"],
        summary="Retrieve user (admin)",
        responses={200: AdminManagedUserSerializer, **COMMON_ERROR_RESPONSES},
    ),
    partial_update=extend_schema(
        tags=["Users & Profiles"],
        summary="Update user (admin)",
        request=AdminUserUpdateSerializer,
        responses={200: AdminManagedUserSerializer, **COMMON_ERROR_RESPONSES},
    ),
)
class AdminUserViewSet(viewsets.ModelViewSet):
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
        return AdminManagedUserSerializer
