from django.contrib.auth import get_user_model
from rest_framework import serializers

from categories.serializers import CategorySerializer
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

    def get_primary_image(self, obj: Listing):
        image = next((img for img in obj.images.all() if img.is_primary), None)
        if image is None:
            image = obj.images.first()
        if image is None:
            return None
        request = self.context.get("request")
        url = image.image.url
        return request.build_absolute_uri(url) if request else url

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
                "Exchange listings require preferred_exchange_item or exchange_description."
            )
        return attrs

    def create(self, validated_data):
        validated_data["seller"] = self.context["request"].user
        return super().create(validated_data)
