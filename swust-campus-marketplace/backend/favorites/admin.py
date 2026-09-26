from django.contrib import admin

from .models import Favorite


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "listing", "created_at")
    search_fields = ("user__email", "listing__title")
    autocomplete_fields = ("user", "listing")
    readonly_fields = ("created_at",)
