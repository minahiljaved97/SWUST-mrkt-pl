from django.contrib.auth import get_user_model
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from categories.serializers import CategorySerializer
from config.media import absolute_media_url
from favorites.models import Favorite

from .models import Listing, ListingImage, TransactionType

User = get_user_model()


class SellerSummarySerializer(serializers.ModelSerializer):
    campus_location = serializers.CharField(
        source="profile.campus_location",
        read_only=True,
        default="",
    )

    class Meta:
        model = User
        fields = ("id", "first_name", "last_name", "campus_location")
        read_only_fields = fields


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ("id", "image", "alt_text", "is_primary", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_image(self, value):
        from .validators import validate_image_upload

        validate_image_upload(value)
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.image:
            data["image"] = absolute_media_url(
                self.context.get("request"), instance.image.url
            )
        return data


OWNER_ALLOWED_STATUSES = {
    "ACTIVE",
    "RESERVED",
    "SOLD",
    "BORROWED",
    "EXCHANGED",
    "CLOSED",
}

class ListingListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    seller = SellerSummarySerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "title",
            "price",
            "condition",
            "transaction_type",
            "status",
            "location",
            "category",
            "seller",
            "primary_image",
            "is_favorited",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.URI)
    def get_primary_image(self, obj: Listing):
        image = next((img for img in obj.images.all() if img.is_primary), None)
        if image is None:
            image = obj.images.first()
        if image is None:
            return None
        return absolute_media_url(self.context.get("request"), image.image.url)

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_is_favorited(self, obj: Listing) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        favorited_ids = self.context.get("favorited_ids")
        if favorited_ids is not None:
            return obj.id in favorited_ids
        return Favorite.objects.filter(user=request.user, listing=obj).exists()


class ListingDetailSerializer(ListingListSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    preferred_exchange_item = serializers.CharField(read_only=True)
    exchange_description = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    favorite_id = serializers.SerializerMethodField()

    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + (
            "description",
            "images",
            "preferred_exchange_item",
            "exchange_description",
            "favorite_id",
        )

    @extend_schema_field(OpenApiTypes.UUID)
    def get_favorite_id(self, obj: Listing):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        favorite = Favorite.objects.filter(user=request.user, listing=obj).first()
        return str(favorite.id) if favorite else None


class ListingCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = (
            "id",
            "category",
            "title",
            "description",
            "price",
            "condition",
            "transaction_type",
            "status",
            "location",
            "preferred_exchange_item",
            "exchange_description",
        )
        read_only_fields = ("id",)

    def validate_status(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        is_admin = bool(
            user
            and (
                getattr(user, "is_admin_role", False)
                or getattr(user, "is_superuser", False)
            )
        )
        if value == "REMOVED" and not is_admin:
            raise serializers.ValidationError(
                "Only administrators can mark a listing as REMOVED."
            )
        if value not in OWNER_ALLOWED_STATUSES and not is_admin:
            raise serializers.ValidationError("Invalid status for sellers.")
        return value

    def validate(self, attrs):
        transaction_type = attrs.get(
            "transaction_type",
            getattr(self.instance, "transaction_type", None),
        )
        price = attrs.get("price", getattr(self.instance, "price", None))
        preferred = attrs.get(
            "preferred_exchange_item",
            getattr(self.instance, "preferred_exchange_item", ""),
        )
        exchange_description = attrs.get(
            "exchange_description",
            getattr(self.instance, "exchange_description", ""),
        )

        if transaction_type == TransactionType.SELL and price is not None and price <= 0:
            raise serializers.ValidationError(
                {"price": "SELL listings require a price greater than zero."}
            )
        if transaction_type == TransactionType.EXCHANGE and not preferred and not exchange_description:
            raise serializers.ValidationError(
                {
                    "preferred_exchange_item": (
                        "Exchange listings require a preferred item or exchange description."
                    )
                }
            )
        return attrs

    def create(self, validated_data):
        validated_data["seller"] = self.context["request"].user
        validated_data["status"] = validated_data.get("status") or "ACTIVE"
        return super().create(validated_data)
