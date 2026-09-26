from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Profile, User, UserRole


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    extra = 0
    fk_name = "user"


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    readonly_fields = ("date_joined", "updated_at", "last_login")
    inlines = [ProfileInline]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        (
            "Permissions",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "role",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if obj.role == UserRole.ADMIN and not obj.is_staff:
            obj.is_staff = True
        super().save_model(request, obj, form, change)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("student_id", "user", "campus_location", "phone", "updated_at")
    search_fields = ("student_id", "user__email", "phone", "campus_location")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
