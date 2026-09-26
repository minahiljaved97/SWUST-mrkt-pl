import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.db.models.deletion import ProtectedError


class ReportStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    REVIEWING = "REVIEWING", "Reviewing"
    RESOLVED = "RESOLVED", "Resolved"
    DISMISSED = "DISMISSED", "Dismissed"


class ReportReason(models.TextChoices):
    SPAM = "SPAM", "Spam"
    FRAUD = "FRAUD", "Fraud / scam"
    INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT", "Inappropriate content"
    WRONG_INFORMATION = "WRONG_INFORMATION", "Wrong information"
    DUPLICATE_LISTING = "DUPLICATE_LISTING", "Duplicate listing"
    OTHER = "OTHER", "Other"


OPEN_REPORT_STATUSES = (ReportStatus.PENDING, ReportStatus.REVIEWING)


class Report(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reports_filed",
    )
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.PROTECT,
        related_name="reports",
        null=True,
        blank=True,
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reports_received",
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=30, choices=ReportReason.choices)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.PENDING,
        db_index=True,
    )
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reports"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["reporter", "-created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(listing__isnull=False) | Q(reported_user__isnull=False),
                name="report_requires_listing_or_user",
            ),
        ]

    def __str__(self) -> str:
        target = self.listing_id or self.reported_user_id
        return f"Report {self.get_status_display()} ({target})"

    def clean(self):
        super().clean()
        if not self.listing_id and not self.reported_user_id:
            raise ValidationError("A report must target a listing and/or a user.")

    def delete(self, using=None, keep_parents=False):
        """Reports are retained for moderation history."""
        raise ProtectedError(
            "Reports cannot be deleted; dismiss or resolve them instead.",
            {self},
        )
