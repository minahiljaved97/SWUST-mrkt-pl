from django.db.models import Prefetch
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsOwner, IsOwnerOrReadOnly, IsStudent
from config.openapi import (
    COMMON_ERROR_RESPONSES,
    ERROR_400,
    ERROR_401,
    ERROR_403,
    ERROR_404,
    ORDERING_PARAM,
    PAGE_PARAMS,
    SEARCH_PARAM,
)
from favorites.models import Favorite
from favorites.serializers import FavoriteSerializer

from .filters import ListingFilter
from .models import Listing, ListingImage, ListingStatus
from .serializers import (
    ListingCreateUpdateSerializer,
    ListingDetailSerializer,
    ListingImageSerializer,
    ListingListSerializer,
)

LISTING_FILTER_PARAMS = [
    *PAGE_PARAMS,
    SEARCH_PARAM,
    ORDERING_PARAM,
    OpenApiParameter(
        name="category",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        description="Category slug or UUID.",
    ),
    OpenApiParameter(
        name="transaction_type",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        description="SELL | BORROW | EXCHANGE",
    ),
    OpenApiParameter(
        name="condition",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        description="NEW | LIKE_NEW | GOOD | FAIR | POOR",
    ),
    OpenApiParameter(
        name="status",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        description="Listing status filter. Defaults to ACTIVE on public list.",
    ),
    OpenApiParameter(
        name="price_min",
        type=OpenApiTypes.NUMBER,
        location=OpenApiParameter.QUERY,
    ),
    OpenApiParameter(
        name="price_max",
        type=OpenApiTypes.NUMBER,
        location=OpenApiParameter.QUERY,
    ),
    OpenApiParameter(
        name="mine",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        description="Set to `1` to list only the authenticated user's listings.",
    ),
    OpenApiParameter(
        name="location",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
    ),
]

IMAGE_ID_PARAM = OpenApiParameter(
    name="image_id",
    type=OpenApiTypes.UUID,
    location=OpenApiParameter.PATH,
    description="Listing image UUID.",
)


@extend_schema_view(
    list=extend_schema(
        tags=["Listings"],
        summary="List listings",
        description=(
            "Requires authentication. Defaults to ACTIVE listings unless `status` or `mine=1` is set. "
            "Owners can see their own non-public statuses via filters/`mine`."
        ),
        parameters=LISTING_FILTER_PARAMS,
        responses={200: ListingListSerializer, **COMMON_ERROR_RESPONSES},
    ),
    retrieve=extend_schema(
        tags=["Listings"],
        summary="Retrieve listing",
        description=(
            "Requires authentication. REMOVED listings are hidden except to the owner/admin."
        ),
        responses={200: ListingDetailSerializer, **COMMON_ERROR_RESPONSES},
    ),
    create=extend_schema(
        tags=["Listings"],
        summary="Create listing",
        description="Requires authentication. Seller is set to the current user.",
        request=ListingCreateUpdateSerializer,
        responses={
            201: ListingDetailSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
        },
    ),
    partial_update=extend_schema(
        tags=["Listings"],
        summary="Update listing",
        description="Requires authentication + ownership (or admin).",
        request=ListingCreateUpdateSerializer,
        responses={200: ListingDetailSerializer, **COMMON_ERROR_RESPONSES},
    ),
    destroy=extend_schema(
        tags=["Listings"],
        summary="Soft-remove listing",
        description="Requires ownership. Marks listing REMOVED rather than hard-deleting.",
        responses={204: OpenApiResponse(description="Listing removed."), **COMMON_ERROR_RESPONSES},
    ),
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

    @extend_schema(
        tags=["Listings"],
        summary="List my listings",
        description="Requires authentication. Returns listings owned by the current user.",
        parameters=PAGE_PARAMS,
        responses={200: ListingListSerializer, **COMMON_ERROR_RESPONSES},
    )
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

    @extend_schema(
        tags=["Listing Images"],
        summary="Upload listing image",
        description=(
            "Requires authentication + ownership. Multipart form: `image` (required), "
            "`alt_text`, `is_primary`. Max 6 images; max 5 MiB; JPEG/PNG/WebP/GIF."
        ),
        request={"multipart/form-data": ListingImageSerializer},
        responses={
            201: ListingImageSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
            404: ERROR_404,
        },
    )
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
        serializer = ListingImageSerializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        if listing.images.count() >= 6:
            return Response(
                {"detail": "A listing may have at most 6 images."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        is_primary = bool(serializer.validated_data.get("is_primary", False))
        if is_primary or not listing.images.exists():
            listing.images.filter(is_primary=True).update(is_primary=False)
            serializer.validated_data["is_primary"] = True
        serializer.save(listing=listing)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Listing Images"],
        summary="Delete listing image",
        description="Requires authentication + ownership.",
        parameters=[IMAGE_ID_PARAM],
        responses={204: OpenApiResponse(description="Image deleted."), **COMMON_ERROR_RESPONSES},
    )
    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>[^/.]+)",
        permission_classes=[IsAuthenticated, IsOwner],
    )
    def delete_image(self, request, id=None, image_id=None, **kwargs):
        listing = self.get_object()
        self.check_object_permissions(request, listing)
        try:
            image = listing.images.get(id=image_id)
        except ListingImage.DoesNotExist as exc:
            raise NotFound("Image not found.") from exc
        was_primary = image.is_primary
        image.image.delete(save=False)
        image.delete()
        if was_primary:
            next_image = listing.images.order_by("created_at").first()
            if next_image:
                next_image.is_primary = True
                next_image.save(update_fields=["is_primary"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        tags=["Listing Images"],
        summary="Set primary listing image",
        description="Requires authentication + ownership.",
        parameters=[IMAGE_ID_PARAM],
        responses={200: ListingImageSerializer, **COMMON_ERROR_RESPONSES},
    )
    @action(
        detail=True,
        methods=["post"],
        url_path=r"images/(?P<image_id>[^/.]+)/primary",
        permission_classes=[IsAuthenticated, IsOwner],
    )
    def set_primary_image(self, request, id=None, image_id=None, **kwargs):
        listing = self.get_object()
        self.check_object_permissions(request, listing)
        try:
            image = listing.images.get(id=image_id)
        except ListingImage.DoesNotExist as exc:
            raise NotFound("Image not found.") from exc
        listing.images.filter(is_primary=True).update(is_primary=False)
        image.is_primary = True
        image.save(update_fields=["is_primary"])
        serializer = ListingImageSerializer(
            image, context=self.get_serializer_context()
        )
        return Response(serializer.data)

    @extend_schema(
        methods=["POST"],
        tags=["Favorites"],
        summary="Favorite a listing",
        description=(
            "Student only. Cannot favorite own listing. Duplicate open favorites return 400. "
            "Prefer this over POST /favorites/."
        ),
        responses={
            201: FavoriteSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
            404: ERROR_404,
        },
    )
    @extend_schema(
        methods=["DELETE"],
        tags=["Favorites"],
        summary="Unfavorite a listing",
        description="Student only. Removes the current user's favorite for this listing.",
        responses={204: OpenApiResponse(description="Favorite removed."), **COMMON_ERROR_RESPONSES},
    )
    @action(
        detail=True,
        methods=["post", "delete"],
        url_path="favorite",
        permission_classes=[IsStudent],
    )
    def favorite(self, request, id=None, **kwargs):
        listing = self.get_object()
        user = request.user

        if listing.seller_id == user.id:
            raise ValidationError({"detail": "You cannot favorite your own listing."})
        if listing.status == ListingStatus.REMOVED:
            raise NotFound("Listing not found.")

        if request.method == "POST":
            favorite, created = Favorite.objects.get_or_create(
                user=user,
                listing=listing,
            )
            if not created:
                return Response(
                    {
                        "detail": "Validation failed.",
                        "errors": {"listing": ["You already favorited this listing."]},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            data = FavoriteSerializer(
                favorite, context=self.get_serializer_context()
            ).data
            return Response(data, status=status.HTTP_201_CREATED)

        deleted, _ = Favorite.objects.filter(user=user, listing=listing).delete()
        if not deleted:
            raise NotFound("Favorite not found.")
        return Response(status=status.HTTP_204_NO_CONTENT)
