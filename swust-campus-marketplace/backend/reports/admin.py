from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reporter",
        "listing",
        "reported_user",
        "reason",
        "status",
        "created_at",
    )
    list_filter = ("status", "reason")
    search_fields = (
        "description",
        "admin_notes",
        "reporter__email",
        "reported_user__email",
        "listing__title",
    )
    autocomplete_fields = ("reporter", "listing", "reported_user")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
