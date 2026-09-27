from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
)
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserRole
from accounts.permissions import IsAdmin
from categories.models import Category
from config.openapi import (
    COMMON_ERROR_RESPONSES,
    ERROR_400,
    ERROR_401,
    ERROR_403,
    ORDERING_PARAM,
    PAGE_PARAMS,
    SEARCH_PARAM,
)
from listings.models import Listing, ListingStatus
from listings.serializers import ListingListSerializer
from reports.models import Report, ReportStatus

User = get_user_model()


class AdminUserSummarySerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(
        source="profile.student_id", read_only=True, default=""
    )
    campus_location = serializers.CharField(
        source="profile.campus_location", read_only=True, default=""
    )
    listings_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
            "student_id",
            "campus_location",
            "listings_count",
        )
        read_only_fields = fields


class AdminUserDetailSerializer(AdminUserSummarySerializer):
    bio = serializers.CharField(source="profile.bio", read_only=True, default="")

    class Meta(AdminUserSummarySerializer.Meta):
        fields = AdminUserSummarySerializer.Meta.fields + ("bio", "updated_at")


class AdminUserStatusSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()

    def update(self, instance, validated_data):
        instance.is_active = validated_data["is_active"]
        instance.save(update_fields=["is_active", "updated_at"])
        return instance


class AdminListingSerializer(ListingListSerializer):
    removed_reason = serializers.CharField(read_only=True)

    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + ("removed_reason",)


class AdminListingUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ListingStatus.choices, required=False)
    remove = serializers.BooleanField(required=False, default=False)
    restore = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not any(key in attrs for key in ("status", "remove", "restore")):
            raise serializers.ValidationError("Provide status, remove, or restore.")
        if attrs.get("remove") and attrs.get("restore"):
            raise serializers.ValidationError("Cannot remove and restore together.")
        return attrs

    def update(self, instance: Listing, validated_data):
        if validated_data.get("remove"):
            instance.soft_remove(reason="Removed by administrator")
            return instance
        if validated_data.get("restore"):
            if instance.status != ListingStatus.REMOVED:
                raise serializers.ValidationError(
                    {"restore": ["Only removed listings can be restored."]}
                )
            instance.status = ListingStatus.ACTIVE
            instance.removed_reason = ""
            instance.save(update_fields=["status", "removed_reason", "updated_at"])
            return instance
        if "status" in validated_data:
            instance.status = validated_data["status"]
            if validated_data["status"] != ListingStatus.REMOVED:
                instance.removed_reason = ""
            instance.save(update_fields=["status", "removed_reason", "updated_at"])
        return instance


class AdminCategorySerializer(serializers.ModelSerializer):
    listings_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "is_active",
            "sort_order",
            "listings_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "listings_count",
            "created_at",
            "updated_at",
        )


class AdminCategoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("name", "description", "sort_order", "is_active")

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Name is required.")
        qs = Category.objects.filter(name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A category with this name exists.")
        return name


class DashboardSummarySerializer(serializers.Serializer):
    total_students = serializers.IntegerField()
    active_listings = serializers.IntegerField()
    sold_listings = serializers.IntegerField()
    borrowed_listings = serializers.IntegerField()
    exchanged_listings = serializers.IntegerField()
    pending_reports = serializers.IntegerField()


class StatBucketSerializer(serializers.Serializer):
    label = serializers.CharField()
    count = serializers.IntegerField()


class DashboardStatisticsSerializer(serializers.Serializer):
    listings_by_category = StatBucketSerializer(many=True)
    listings_by_transaction_type = StatBucketSerializer(many=True)
    listing_status_distribution = StatBucketSerializer(many=True)
    listings_created_over_time = StatBucketSerializer(many=True)


ADMIN_USER_PARAMS = [
    *PAGE_PARAMS,
    SEARCH_PARAM,
    ORDERING_PARAM,
    OpenApiParameter(
        name="role",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        description="STUDENT | ADMIN",
    ),
    OpenApiParameter(
        name="is_active",
        type=OpenApiTypes.BOOL,
        location=OpenApiParameter.QUERY,
    ),
]

ADMIN_LISTING_PARAMS = [
    *PAGE_PARAMS,
    SEARCH_PARAM,
    ORDERING_PARAM,
    OpenApiParameter(
        name="status",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
    ),
    OpenApiParameter(
        name="transaction_type",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
    ),
    OpenApiParameter(
        name="condition",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
    ),
    OpenApiParameter(
        name="category",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        description="Category UUID.",
    ),
]


@extend_schema_view(
    list=extend_schema(
        tags=["Admin Dashboard"],
        summary="List users (admin dashboard)",
        description="Phone numbers are omitted.",
        parameters=ADMIN_USER_PARAMS,
        responses={200: AdminUserSummarySerializer, **COMMON_ERROR_RESPONSES},
    ),
    retrieve=extend_schema(
        tags=["Admin Dashboard"],
        summary="Retrieve user (admin dashboard)",
        responses={200: AdminUserDetailSerializer, **COMMON_ERROR_RESPONSES},
    ),
    partial_update=extend_schema(
        tags=["Admin Dashboard"],
        summary="Activate/deactivate user",
        request=AdminUserStatusSerializer,
        responses={200: AdminUserDetailSerializer, **COMMON_ERROR_RESPONSES},
    ),
)
class AdminUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAdmin]
    lookup_field = "id"
    http_method_names = ["get", "patch", "head", "options"]
    search_fields = ("email", "first_name", "last_name", "profile__student_id")
    filterset_fields = ("role", "is_active")
    ordering_fields = ("date_joined", "email", "first_name")
    ordering = ("-date_joined",)

    def get_queryset(self):
        return (
            User.objects.select_related("profile")
            .annotate(listings_count=Count("listings", distinct=True))
            .order_by("-date_joined")
        )

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return AdminUserStatusSerializer
        if self.action == "retrieve":
            return AdminUserDetailSerializer
        return AdminUserSummarySerializer

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            AdminUserDetailSerializer(user, context=self.get_serializer_context()).data
        )

    @extend_schema(
        tags=["Admin Dashboard"],
        summary="List listings for a user",
        parameters=PAGE_PARAMS,
        responses={200: AdminListingSerializer, **COMMON_ERROR_RESPONSES},
    )
    @action(detail=True, methods=["get"], url_path="listings")
    def listings(self, request, id=None, **kwargs):
        user = self.get_object()
        qs = (
            Listing.objects.filter(seller=user)
            .select_related("category", "seller", "seller__profile")
            .prefetch_related("images")
            .order_by("-created_at")
        )
        page = self.paginate_queryset(qs)
        serializer = AdminListingSerializer(
            page if page is not None else qs,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        tags=["Admin Dashboard"],
        summary="List all listings (admin)",
        description="Includes non-ACTIVE and REMOVED listings.",
        parameters=ADMIN_LISTING_PARAMS,
        responses={200: AdminListingSerializer, **COMMON_ERROR_RESPONSES},
    ),
    retrieve=extend_schema(
        tags=["Admin Dashboard"],
        summary="Retrieve listing (admin)",
        responses={200: AdminListingSerializer, **COMMON_ERROR_RESPONSES},
    ),
    partial_update=extend_schema(
        tags=["Admin Dashboard"],
        summary="Moderate listing status",
        description="Body: `{ status? }`, `{ remove: true }`, or `{ restore: true }`.",
        request=AdminListingUpdateSerializer,
        responses={200: AdminListingSerializer, **COMMON_ERROR_RESPONSES},
    ),
)
class AdminListingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAdmin]
    lookup_field = "id"
    http_method_names = ["get", "patch", "head", "options"]
    search_fields = ("title", "description", "location", "seller__email")
    filterset_fields = ("status", "transaction_type", "condition", "category")
    ordering_fields = ("created_at", "price", "title", "updated_at")
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            Listing.objects.select_related(
                "category", "seller", "seller__profile"
            )
            .prefetch_related("images")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return AdminListingUpdateSerializer
        return AdminListingSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["favorited_ids"] = set()
        return context

    def partial_update(self, request, *args, **kwargs):
        listing = self.get_object()
        serializer = self.get_serializer(listing, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        return Response(
            AdminListingSerializer(
                listing, context=self.get_serializer_context()
            ).data
        )


@extend_schema_view(
    list=extend_schema(
        tags=["Admin Dashboard"],
        summary="List categories (admin)",
        description="Includes inactive categories and listing counts.",
        parameters=[*PAGE_PARAMS, SEARCH_PARAM, ORDERING_PARAM],
        responses={200: AdminCategorySerializer, **COMMON_ERROR_RESPONSES},
    ),
    retrieve=extend_schema(
        tags=["Admin Dashboard"],
        summary="Retrieve category (admin)",
        responses={200: AdminCategorySerializer, **COMMON_ERROR_RESPONSES},
    ),
    create=extend_schema(
        tags=["Admin Dashboard"],
        summary="Create category",
        request=AdminCategoryWriteSerializer,
        responses={
            201: AdminCategorySerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
        },
    ),
    partial_update=extend_schema(
        tags=["Admin Dashboard"],
        summary="Update category",
        request=AdminCategoryWriteSerializer,
        responses={200: AdminCategorySerializer, **COMMON_ERROR_RESPONSES},
    ),
)
class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    lookup_field = "id"
    http_method_names = ["get", "post", "patch", "head", "options"]
    search_fields = ("name", "description", "slug")
    filterset_fields = ("is_active",)
    ordering_fields = ("sort_order", "name", "created_at")
    ordering = ("sort_order", "name")

    def get_queryset(self):
        return Category.objects.annotate(
            listings_count=Count("listings", distinct=True)
        ).order_by("sort_order", "name")

    def get_serializer_class(self):
        if self.action in {"create", "partial_update", "update"}:
            return AdminCategoryWriteSerializer
        return AdminCategorySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        category = self.get_queryset().get(pk=category.pk)
        return Response(
            AdminCategorySerializer(
                category, context=self.get_serializer_context()
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        category = self.get_object()
        serializer = self.get_serializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        category = self.get_queryset().get(pk=category.pk)
        return Response(
            AdminCategorySerializer(
                category, context=self.get_serializer_context()
            ).data
        )


class AdminDashboardSummaryView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        tags=["Admin Dashboard"],
        summary="Dashboard summary counts",
        responses={
            200: DashboardSummarySerializer,
            401: ERROR_401,
            403: ERROR_403,
        },
    )
    def get(self, request, *args, **kwargs):
        listing_counts = {
            row["status"]: row["count"]
            for row in Listing.objects.values("status").annotate(count=Count("id"))
        }
        return Response(
            {
                "total_students": User.objects.filter(role=UserRole.STUDENT).count(),
                "active_listings": listing_counts.get(ListingStatus.ACTIVE, 0),
                "sold_listings": listing_counts.get(ListingStatus.SOLD, 0),
                "borrowed_listings": listing_counts.get(ListingStatus.BORROWED, 0),
                "exchanged_listings": listing_counts.get(ListingStatus.EXCHANGED, 0),
                "pending_reports": Report.objects.filter(
                    status=ReportStatus.PENDING
                ).count(),
            }
        )


class AdminDashboardStatisticsView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        tags=["Admin Dashboard"],
        summary="Activity statistics",
        responses={
            200: DashboardStatisticsSerializer,
            401: ERROR_401,
            403: ERROR_403,
        },
    )
    def get(self, request, *args, **kwargs):
        by_category = list(
            Listing.objects.values("category__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        by_transaction = list(
            Listing.objects.values("transaction_type")
            .annotate(count=Count("id"))
            .order_by("transaction_type")
        )
        by_status = list(
            Listing.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        since = timezone.now() - timedelta(days=30)
        created_over_time = list(
            Listing.objects.filter(created_at__gte=since)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        return Response(
            {
                "listings_by_category": [
                    {"label": row["category__name"] or "Unknown", "count": row["count"]}
                    for row in by_category
                ],
                "listings_by_transaction_type": [
                    {"label": row["transaction_type"], "count": row["count"]}
                    for row in by_transaction
                ],
                "listing_status_distribution": [
                    {"label": row["status"], "count": row["count"]}
                    for row in by_status
                ],
                "listings_created_over_time": [
                    {
                        "label": row["day"].isoformat() if row["day"] else "",
                        "count": row["count"],
                    }
                    for row in created_over_time
                ],
            }
        )
