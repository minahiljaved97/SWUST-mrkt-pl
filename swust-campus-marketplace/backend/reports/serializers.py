from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from accounts.models import UserRole
from listings.models import ListingStatus
from listings.serializers import ListingListSerializer, SellerSummarySerializer

from .models import OPEN_REPORT_STATUSES, Report, ReportReason, ReportStatus


class StudentReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ("listing", "reported_user", "reason", "description")

    def validate_reason(self, value):
        if value not in ReportReason.values:
            raise serializers.ValidationError("Invalid report reason.")
        return value

    def validate_description(self, value):
        if value is None:
            return ""
        return value.strip()

    def validate(self, attrs):
        listing = attrs.get("listing")
        reported_user = attrs.get("reported_user")
        reporter = self.context["request"].user

        if not listing and not reported_user:
            raise serializers.ValidationError(
                "A report must include a listing and/or reported_user."
            )

        if listing and listing.seller_id == reporter.id:
            raise serializers.ValidationError(
                {"listing": ["You cannot report your own listing."]}
            )
        if reported_user and reported_user.id == reporter.id:
            raise serializers.ValidationError(
                {"reported_user": ["You cannot report yourself."]}
            )
        if listing and listing.status == ListingStatus.REMOVED:
            raise serializers.ValidationError(
                {"listing": ["This listing is no longer available."]}
            )
        if reported_user and reported_user.role != UserRole.STUDENT:
            raise serializers.ValidationError(
                {"reported_user": ["You can only report student accounts."]}
            )

        open_qs = Report.objects.filter(
            reporter=reporter,
            status__in=OPEN_REPORT_STATUSES,
        )
        if listing and open_qs.filter(listing=listing).exists():
            raise serializers.ValidationError(
                {
                    "listing": [
                        "You already have an open report for this listing."
                    ]
                }
            )
        if reported_user and open_qs.filter(reported_user=reported_user).exists():
            raise serializers.ValidationError(
                {
                    "reported_user": [
                        "You already have an open report for this user."
                    ]
                }
            )
        return attrs

    def create(self, validated_data):
        validated_data["reporter"] = self.context["request"].user
        return super().create(validated_data)


class StudentReportResponseSerializer(serializers.Serializer):
    """Neutral confirmation payload — no admin fields."""

    detail = serializers.CharField()
    id = serializers.UUIDField()


class AdminReportSerializer(serializers.ModelSerializer):
    reporter = SellerSummarySerializer(read_only=True)
    reported_user = SellerSummarySerializer(read_only=True)
    listing = ListingListSerializer(read_only=True)
    listing_id = serializers.SerializerMethodField()
    reported_user_id = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = (
            "id",
            "reporter",
            "listing",
            "listing_id",
            "reported_user",
            "reported_user_id",
            "reason",
            "description",
            "status",
            "admin_notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.UUID)
    def get_listing_id(self, obj: Report):
        return str(obj.listing_id) if obj.listing_id else None

    @extend_schema_field(OpenApiTypes.UUID)
    def get_reported_user_id(self, obj: Report):
        return str(obj.reported_user_id) if obj.reported_user_id else None


class AdminReportUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=ReportStatus.choices, required=False
    )
    admin_notes = serializers.CharField(
        required=False, allow_blank=True, max_length=5000
    )
    remove_listing = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("No updates provided.")
        return attrs

    def update(self, instance: Report, validated_data):
        if "status" in validated_data:
            instance.status = validated_data["status"]
        if "admin_notes" in validated_data:
            instance.admin_notes = validated_data["admin_notes"].strip()
        instance.save()

        if validated_data.get("remove_listing") and instance.listing_id:
            listing = instance.listing
            if listing.status != ListingStatus.REMOVED:
                listing.soft_remove(reason="Removed by moderator")
        return instance
