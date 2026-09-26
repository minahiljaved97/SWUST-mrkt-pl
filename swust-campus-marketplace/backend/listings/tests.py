from decimal import Decimal
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile, User, UserRole
from categories.models import Category
from listings.models import (
    Listing,
    ListingCondition,
    ListingStatus,
    TransactionType,
)
from listings.validators import MAX_IMAGE_UPLOAD_BYTES, validate_image_upload


def _make_image_upload(name="photo.jpg", fmt="JPEG"):
    buffer = BytesIO()
    Image.new("RGB", (32, 32), color=(20, 80, 120)).save(buffer, format=fmt)
    return SimpleUploadedFile(
        name,
        buffer.getvalue(),
        content_type=f"image/{'jpeg' if fmt == 'JPEG' else fmt.lower()}",
    )


class ListingsAPITests(APITestCase):
    def setUp(self):
        self.category, _ = Category.objects.get_or_create(
            slug="textbooks",
            defaults={
                "name": "Textbooks",
                "description": "Books",
                "sort_order": 1,
                "is_active": True,
            },
        )
        self.owner = User.objects.create_user(
            email="owner.list@swust.edu.cn",
            password="Pass12345!",
            first_name="Own",
            last_name="Er",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.owner, student_id="LISTOWN01")
        self.other = User.objects.create_user(
            email="other.list@swust.edu.cn",
            password="Pass12345!",
            first_name="Oth",
            last_name="Er",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.other, student_id="LISTOTH01")
        self.listing = Listing.objects.create(
            seller=self.owner,
            category=self.category,
            title="Security audit textbook",
            description="Used for listing permission and upload tests.",
            price=Decimal("12.00"),
            condition=ListingCondition.GOOD,
            transaction_type=TransactionType.SELL,
            status=ListingStatus.ACTIVE,
            location="Library",
        )

    def test_owner_can_update_other_cannot(self):
        url = reverse(
            "api:listing-detail",
            kwargs={"version": "v1", "id": self.listing.id},
        )
        self.client.force_authenticate(user=self.other)
        forbidden = self.client.patch(url, {"title": "Hacked"}, format="json")
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.owner)
        ok = self.client.patch(url, {"title": "Updated title"}, format="json")
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.title, "Updated title")

    def test_owner_can_upload_image_other_cannot(self):
        url = reverse(
            "api:listing-upload-image",
            kwargs={"version": "v1", "id": self.listing.id},
        )
        upload = _make_image_upload()
        self.client.force_authenticate(user=self.other)
        forbidden = self.client.post(url, {"image": upload}, format="multipart")
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        upload = _make_image_upload("ok.png", fmt="PNG")
        self.client.force_authenticate(user=self.owner)
        ok = self.client.post(url, {"image": upload, "is_primary": True}, format="multipart")
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.listing.images.count(), 1)

    def test_image_validator_rejects_oversized_and_bad_type(self):
        huge = SimpleUploadedFile(
            "huge.jpg",
            b"x" * (MAX_IMAGE_UPLOAD_BYTES + 1),
            content_type="image/jpeg",
        )
        with self.assertRaises(Exception):
            validate_image_upload(huge)

        bad = SimpleUploadedFile(
            "note.txt",
            b"not-an-image",
            content_type="text/plain",
        )
        with self.assertRaises(Exception):
            validate_image_upload(bad)

    def test_pagination_page_size_capped(self):
        self.client.force_authenticate(user=self.other)
        url = reverse("api:listing-list", kwargs={"version": "v1"})
        response = self.client.get(url, {"page_size": 999})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data.get("results", [])), 50)

    def test_unauthenticated_listings_forbidden(self):
        url = reverse("api:listing-list", kwargs={"version": "v1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
