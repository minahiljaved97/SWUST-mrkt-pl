from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsOwner, IsOwnerOrReadOnly
from favorites.models import Favorite

from .filters import ListingFilter
from .models import Listing, ListingImage, ListingStatus
from .serializers import (
    ListingCreateUpdateSerializer,
    ListingDetailSerializer,
    ListingImageSerializer,
    ListingListSerializer,
)


class ListingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filterset_class = ListingFilter
    search_fields = ("title", "description")
    ordering_fields = ("created_at", "price", "title")
    ordering = ("-created_at",)
    lookup_field = "id"
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return (
            Listing.objects.select_related(
                "category",
                "seller",
                "seller__profile",
            )
            .prefetch_related(
                Prefetch(
                    "images",
                    queryset=ListingImage.objects.order_by("-is_primary", "created_at"),
                )
            )
        )

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        if self.action == "list":
            if self.request.query_params.get("mine") == "1":
                return queryset.filter(seller=self.request.user)
            if not self.request.query_params.get("status"):
                return queryset.filter(status=ListingStatus.ACTIVE)
        return queryset

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if obj.status == ListingStatus.REMOVED and obj.seller_id != user.id and not (
            getattr(user, "is_admin_role", False) or user.is_superuser
        ):
            raise NotFound()
        return obj

    def get_serializer_class(self):
        if self.action in {"create", "partial_update", "update"}:
            return ListingCreateUpdateSerializer
        if self.action == "retrieve":
            return ListingDetailSerializer
        return ListingListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user.is_authenticated:
            context["favorited_ids"] = set(
                Favorite.objects.filter(user=user).values_list("listing_id", flat=True)
            )
        return context

    def perform_destroy(self, instance):
        instance.soft_remove(reason="Closed by owner")

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request, *args, **kwargs):
        queryset = self.filter_queryset(
            self.get_queryset().filter(seller=request.user)
        )
        page = self.paginate_queryset(queryset)
        serializer = ListingListSerializer(
            page if page is not None else queryset,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsAuthenticated, IsOwner],
    )
    def upload_image(self, request, id=None, **kwargs):
        listing = self.get_object()
        self.check_object_permissions(request, listing)
        serializer = ListingImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if listing.images.count() >= 6:
            return Response(
                {"detail": "A listing may have at most 6 images."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        is_primary = serializer.validated_data.get("is_primary", False)
        if is_primary or not listing.images.exists():
            listing.images.filter(is_primary=True).update(is_primary=False)
            serializer.validated_data["is_primary"] = True
        serializer.save(listing=listing)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
