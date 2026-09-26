from django.contrib import admin

from .models import Listing, ListingImage


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 1
    fields = ("image", "alt_text", "is_primary", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "seller",
        "category",
        "transaction_type",
        "condition",
        "price",
        "status",
        "location",
        "created_at",
    )
    list_filter = ("status", "transaction_type", "condition", "category")
    search_fields = ("title", "description", "location", "seller__email")
    autocomplete_fields = ("seller", "category")
    readonly_fields = ("created_at", "updated_at")
    inlines = [ListingImageInline]
    date_hierarchy = "created_at"


@admin.register(ListingImage)
class ListingImageAdmin(admin.ModelAdmin):
    list_display = ("listing", "is_primary", "alt_text", "created_at")
    list_filter = ("is_primary",)
    search_fields = ("listing__title", "alt_text")
    autocomplete_fields = ("listing",)
    readonly_fields = ("created_at",)
