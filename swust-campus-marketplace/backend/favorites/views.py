from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from accounts.permissions import IsStudent
from config.openapi import COMMON_ERROR_RESPONSES, ERROR_400, ERROR_401, ERROR_403, PAGE_PARAMS

from .models import Favorite
from .serializers import FavoriteCreateSerializer, FavoriteSerializer


@extend_schema_view(
    list=extend_schema(
        tags=["Favorites"],
        summary="List my favorites",
        parameters=PAGE_PARAMS,
        responses={200: FavoriteSerializer, **COMMON_ERROR_RESPONSES},
    ),
    create=extend_schema(
        tags=["Favorites"],
        summary="Create favorite (by listing id)",
        description="Legacy body `{ listing }`. Prefer POST /listings/{id}/favorite/.",
        request=FavoriteCreateSerializer,
        responses={
            201: FavoriteSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
        },
    ),
    destroy=extend_schema(
        tags=["Favorites"],
        summary="Delete favorite by id",
        responses={
            204: OpenApiResponse(description="Favorite deleted."),
            **COMMON_ERROR_RESPONSES,
        },
    ),
)
class FavoriteViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsStudent]
    lookup_field = "id"

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not getattr(
            user, "is_authenticated", False
        ):
            return Favorite.objects.none()
        return (
            Favorite.objects.filter(user=user)
            .select_related(
                "listing",
                "listing__category",
                "listing__seller",
                "listing__seller__profile",
            )
            .prefetch_related("listing__images")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return FavoriteCreateSerializer
        return FavoriteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        favorite = serializer.save()
        output = FavoriteSerializer(favorite, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)
