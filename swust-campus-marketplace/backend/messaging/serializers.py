from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from listings.models import Listing, ListingStatus
from listings.serializers import ListingListSerializer, SellerSummarySerializer

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender = SellerSummarySerializer(read_only=True)

    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "content", "is_read", "created_at")
        read_only_fields = ("id", "conversation", "sender", "is_read", "created_at")


class MessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=5000)

    def validate_content(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Message content cannot be empty.")
        return cleaned


class ConversationCreateSerializer(serializers.Serializer):
    listing = serializers.UUIDField()
    content = serializers.CharField(required=False, allow_blank=True, max_length=5000)

    def validate_listing(self, listing_id):
        try:
            listing = Listing.objects.select_related("seller").get(id=listing_id)
        except Listing.DoesNotExist as exc:
            raise serializers.ValidationError("Listing not found.") from exc
        if listing.status == ListingStatus.REMOVED:
            raise serializers.ValidationError("This listing is no longer available.")
        return listing

    def validate_content(self, value):
        if value is None:
            return ""
        return value.strip()

    def validate(self, attrs):
        listing = attrs["listing"]
        user = self.context["request"].user
        if listing.seller_id == user.id:
            raise serializers.ValidationError(
                {"listing": ["You cannot message yourself about your own listing."]}
            )
        return attrs

    def create(self, validated_data):
        from django.utils import timezone

        listing = validated_data["listing"]
        user = self.context["request"].user
        content = validated_data.get("content") or ""

        conversation, created = Conversation.objects.get_or_create(
            listing=listing,
            buyer=user,
            seller=listing.seller,
        )
        if content:
            Message.objects.create(
                conversation=conversation,
                sender=user,
                content=content,
            )
            Conversation.objects.filter(id=conversation.id).update(
                updated_at=timezone.now()
            )
            conversation.refresh_from_db()
        self.context["created"] = created
        return conversation


class ConversationListSerializer(serializers.ModelSerializer):
    listing = ListingListSerializer(read_only=True)
    buyer = SellerSummarySerializer(read_only=True)
    seller = SellerSummarySerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True, default=0)
    other_participant = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "listing",
            "buyer",
            "seller",
            "other_participant",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(SellerSummarySerializer)
    def get_other_participant(self, obj: Conversation):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        other = obj.seller if user and user.id == obj.buyer_id else obj.buyer
        return SellerSummarySerializer(other, context=self.context).data

    @extend_schema_field(MessageSerializer)
    def get_last_message(self, obj: Conversation):
        messages = getattr(obj, "prefetched_messages", None)
        if messages is not None:
            message = messages[-1] if messages else None
        else:
            message = (
                obj.messages.select_related("sender", "sender__profile")
                .order_by("-created_at")
                .first()
            )
        if message is None:
            return None
        return MessageSerializer(message, context=self.context).data


class ConversationDetailSerializer(ConversationListSerializer):
    messages = serializers.SerializerMethodField()

    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + ("messages",)

    @extend_schema_field(MessageSerializer(many=True))
    def get_messages(self, obj: Conversation):
        messages = getattr(obj, "prefetched_messages", None)
        if messages is None:
            messages = obj.messages.select_related(
                "sender", "sender__profile"
            ).order_by("created_at")
        return MessageSerializer(messages, many=True, context=self.context).data
