from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from listings.models import ListingStatus
from listings.serializers import ListingListSerializer

from .models import Favorite


class FavoriteSerializer(serializers.ModelSerializer):
    listing_detail = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = Favorite
        fields = ("id", "listing", "listing_detail", "is_available", "created_at")
        read_only_fields = fields

    @extend_schema_field(ListingListSerializer)
    def get_listing_detail(self, obj: Favorite):
        return ListingListSerializer(obj.listing, context=self.context).data

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_is_available(self, obj: Favorite) -> bool:
        return obj.listing.status != ListingStatus.REMOVED


class FavoriteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = ("id", "listing", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_listing(self, listing):
        from listings.models import ListingStatus as Status

        user = self.context["request"].user
        if listing.seller_id == user.id:
            raise serializers.ValidationError("You cannot favorite your own listing.")
        if listing.status == Status.REMOVED:
            raise serializers.ValidationError("This listing is no longer available.")
        if Favorite.objects.filter(user=user, listing=listing).exists():
            raise serializers.ValidationError("You already favorited this listing.")
        return listing

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
