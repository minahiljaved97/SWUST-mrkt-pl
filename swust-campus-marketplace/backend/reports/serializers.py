from rest_framework import serializers

from .models import Report


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ("id", "listing", "reported_user", "reason", "description", "status", "created_at")
        read_only_fields = ("id", "status", "created_at")

    def validate(self, attrs):
        if not attrs.get("listing") and not attrs.get("reported_user"):
            raise serializers.ValidationError(
                "A report must include a listing and/or reported_user."
            )
        return attrs

    def create(self, validated_data):
        validated_data["reporter"] = self.context["request"].user
        return super().create(validated_data)
