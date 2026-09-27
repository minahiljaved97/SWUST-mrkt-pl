import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.db.models.deletion import ProtectedError


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.PROTECT,
        related_name="conversations",
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="buyer_conversations",
        help_text="Student contacting the seller about the listing.",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="seller_conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "conversations"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "buyer", "seller"],
                name="unique_conversation_per_listing_pair",
            ),
            models.CheckConstraint(
                condition=~Q(buyer=models.F("seller")),
                name="conversation_buyer_ne_seller",
            ),
        ]
        indexes = [
            models.Index(fields=["buyer", "-updated_at"]),
            models.Index(fields=["seller", "-updated_at"]),
        ]

    def __str__(self) -> str:
        return f"Conversation on {self.listing_id}"

    def clean(self):
        super().clean()
        if self.buyer_id and self.seller_id and self.buyer_id == self.seller_id:
            raise ValidationError("Buyer and seller must be different users.")
        if self.listing_id and self.seller_id and self.listing.seller_id != self.seller_id:
            raise ValidationError({"seller": "Seller must match the listing owner."})


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.PROTECT,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_messages",
    )
    content = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["sender", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"Message {self.id} in {self.conversation_id}"

    def clean(self):
        super().clean()
        if not self.content or not self.content.strip():
            raise ValidationError({"content": "Message content cannot be empty."})
        if self.conversation_id and self.sender_id:
            participants = {
                self.conversation.buyer_id,
                self.conversation.seller_id,
            }
            if self.sender_id not in participants:
                raise ValidationError({"sender": "Sender must be a conversation participant."})

    def delete(self, using=None, keep_parents=False):
        raise ProtectedError("Messages cannot be deleted.", {self})
