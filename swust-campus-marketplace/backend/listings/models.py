import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class ListingCondition(models.TextChoices):
    NEW = "NEW", "New"
    LIKE_NEW = "LIKE_NEW", "Like new"
    GOOD = "GOOD", "Good"
    FAIR = "FAIR", "Fair"
    POOR = "POOR", "Poor"


class TransactionType(models.TextChoices):
    SELL = "SELL", "Sell"
    BORROW = "BORROW", "Borrow"
    EXCHANGE = "EXCHANGE", "Exchange"


class ListingStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    RESERVED = "RESERVED", "Reserved"
    SOLD = "SOLD", "Sold"
    BORROWED = "BORROWED", "Borrowed"
    EXCHANGED = "EXCHANGED", "Exchanged"
    CLOSED = "CLOSED", "Closed"
    REMOVED = "REMOVED", "Removed"


class Listing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="listings",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.PROTECT,
        related_name="listings",
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="May be 0 for BORROW or EXCHANGE listings.",
    )
    condition = models.CharField(
        max_length=20,
        choices=ListingCondition.choices,
        db_index=True,
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=ListingStatus.choices,
        default=ListingStatus.ACTIVE,
        db_index=True,
    )
    location = models.CharField(max_length=200)
    preferred_exchange_item = models.CharField(
        max_length=255,
        blank=True,
        help_text="Preferred item or description when transaction_type is EXCHANGE.",
    )
    exchange_description = models.TextField(
        blank=True,
        help_text="Additional exchange details when transaction_type is EXCHANGE.",
    )
    removed_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "listings"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "transaction_type"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["seller", "status"]),
            models.Index(fields=["-created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(price__gte=0),
                name="listing_price_non_negative",
            ),
            models.CheckConstraint(
                condition=(
                    ~Q(transaction_type=TransactionType.EXCHANGE)
                    | ~Q(preferred_exchange_item="")
                    | ~Q(exchange_description="")
                ),
                name="listing_exchange_requires_preference_or_description",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.get_transaction_type_display()})"

    def clean(self):
        super().clean()
        if self.transaction_type == TransactionType.SELL and self.price is not None:
            if self.price <= 0:
                raise ValidationError({"price": "SELL listings require a price greater than zero."})
        if self.transaction_type == TransactionType.EXCHANGE:
            if not self.preferred_exchange_item and not self.exchange_description:
                raise ValidationError(
                    "Exchange listings require preferred_exchange_item or exchange_description."
                )

    def soft_remove(self, reason: str = "") -> None:
        self.status = ListingStatus.REMOVED
        self.removed_reason = reason
        self.save(update_fields=["status", "removed_reason", "updated_at"])

    def delete(self, using=None, keep_parents=False):
        self.soft_remove(reason="Deleted via admin/system")
        return 0, {self._meta.label: 0}


class ListingImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="listings/%Y/%m/")
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "listing_images"
        ordering = ["-is_primary", "created_at"]
        indexes = [
            models.Index(fields=["listing", "is_primary"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["listing"],
                condition=Q(is_primary=True),
                name="unique_primary_image_per_listing",
            ),
        ]

    def __str__(self) -> str:
        label = "primary" if self.is_primary else "image"
        return f"{label} for {self.listing_id}"
