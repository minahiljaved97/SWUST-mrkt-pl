from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Profile, UserRole
from .validators import validate_swust_email

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = (
            "student_id",
            "phone",
            "profile_image",
            "bio",
            "campus_location",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("student_id", "created_at", "updated_at")


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
            "updated_at",
            "profile",
        )
        read_only_fields = fields


class AdminManagedUserSerializer(serializers.ModelSerializer):
    """Admin user list/detail without phone or profile image URLs."""

    student_id = serializers.CharField(
        source="profile.student_id", read_only=True, default=""
    )
    campus_location = serializers.CharField(
        source="profile.campus_location", read_only=True, default=""
    )

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
            "updated_at",
            "student_id",
            "campus_location",
        )
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    student_id = serializers.CharField(max_length=32)

    def validate_email(self, value: str) -> str:
        email = validate_swust_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_student_id(self, value: str) -> str:
        student_id = value.strip()
        if not student_id:
            raise serializers.ValidationError("Student ID is required.")
        if Profile.objects.filter(student_id__iexact=student_id).exists():
            raise serializers.ValidationError("This student ID is already registered.")
        return student_id

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def validate_first_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("First name is required.")
        return name

    def validate_last_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Last name is required.")
        return name

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        student_id = validated_data.pop("student_id")
        user = User.objects.create_user(
            password=password,
            role=UserRole.STUDENT,
            **validated_data,
        )
        Profile.objects.create(user=user, student_id=student_id)
        return user


class LoginResponseSerializer(serializers.Serializer):
    """Documented login success payload (tokens + user)."""

    access = serializers.CharField(help_text="JWT access token.")
    refresh = serializers.CharField(help_text="JWT refresh token.")
    user = UserSerializer()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        email_field = self.username_field
        if email_field in attrs and attrs[email_field]:
            attrs[email_field] = attrs[email_field].strip().lower()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data



class MeUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    campus_location = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )

    def update(self, instance: User, validated_data):
        for field in ("first_name", "last_name"):
            if field in validated_data:
                setattr(instance, field, validated_data[field].strip())
        instance.save()

        profile, _ = Profile.objects.get_or_create(
            user=instance,
            defaults={"student_id": f"TEMP-{instance.id.hex[:12]}"},
        )
        for field in ("phone", "bio", "campus_location"):
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        profile.save()
        return instance


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("is_active", "role", "first_name", "last_name")

    def validate_role(self, value):
        if value not in UserRole.values:
            raise serializers.ValidationError("Invalid role.")
        return value


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
