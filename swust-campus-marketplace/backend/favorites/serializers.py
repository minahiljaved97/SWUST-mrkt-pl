from rest_framework import serializers

from .models import Favorite


class FavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = ("id", "listing", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_listing(self, listing):
        user = self.context["request"].user
        if Favorite.objects.filter(user=user, listing=listing).exists():
            raise serializers.ValidationError("You already favorited this listing.")
        return listing

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
