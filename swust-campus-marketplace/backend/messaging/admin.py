from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ("sender", "content", "is_read", "created_at")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("sender",)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "listing", "buyer", "seller", "updated_at")
    search_fields = (
        "listing__title",
        "buyer__email",
        "seller__email",
    )
    autocomplete_fields = ("listing", "buyer", "seller")
    readonly_fields = ("created_at", "updated_at")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "is_read", "created_at")
    list_filter = ("is_read",)
    search_fields = ("content", "sender__email")
    autocomplete_fields = ("conversation", "sender")
    readonly_fields = ("created_at",)
