from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile, User, UserRole
from categories.models import Category
from favorites.models import Favorite
from listings.models import (
    Listing,
    ListingCondition,
    ListingStatus,
    TransactionType,
)


class FavoritesAPITests(APITestCase):
    def setUp(self):
        self.category, _ = Category.objects.get_or_create(
            slug="textbooks",
            defaults={
                "name": "Textbooks",
                "description": "Books",
                "sort_order": 1,
            },
        )
        self.seller = User.objects.create_user(
            email="seller.fav@swust.edu.cn",
            password="Pass12345!",
            first_name="Sell",
            last_name="Er",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.seller, student_id="FAVSELL01")
        self.student = User.objects.create_user(
            email="student.fav@swust.edu.cn",
            password="Pass12345!",
            first_name="Stu",
            last_name="Dent",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.student, student_id="FAVSTUD01")
        self.admin = User.objects.create_user(
            email="admin.fav@swust.edu.cn",
            password="Pass12345!",
            first_name="Ad",
            last_name="Min",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        Profile.objects.create(user=self.admin, student_id="FAVADMIN01")
        self.listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Favorite me textbook",
            description="A textbook used for favorites tests.",
            price=Decimal("20.00"),
            condition=ListingCondition.GOOD,
            transaction_type=TransactionType.SELL,
            status=ListingStatus.ACTIVE,
            location="Library",
        )

    def _login(self, user):
        self.client.force_authenticate(user=user)

    def test_student_can_favorite_listing(self):
        self._login(self.student)
        url = reverse("api:listing-favorite", kwargs={"version": "v1", "id": self.listing.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Favorite.objects.filter(user=self.student, listing=self.listing).exists()
        )

    def test_duplicate_favorite_rejected(self):
        self._login(self.student)
        url = reverse("api:listing-favorite", kwargs={"version": "v1", "id": self.listing.id})
        self.client.post(url)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unfavorite_listing(self):
        Favorite.objects.create(user=self.student, listing=self.listing)
        self._login(self.student)
        url = reverse("api:listing-favorite", kwargs={"version": "v1", "id": self.listing.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Favorite.objects.filter(user=self.student, listing=self.listing).exists()
        )

    def test_list_favorites(self):
        Favorite.objects.create(user=self.student, listing=self.listing)
        self._login(self.student)
        url = reverse("api:favorite-list", kwargs={"version": "v1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["listing_detail"]["title"], self.listing.title)
        self.assertTrue(results[0]["is_available"])

    def test_cannot_favorite_own_listing(self):
        self._login(self.seller)
        url = reverse("api:listing-favorite", kwargs={"version": "v1", "id": self.listing.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_use_student_favorite_endpoint(self):
        self._login(self.admin)
        url = reverse("api:listing-favorite", kwargs={"version": "v1", "id": self.listing.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_forbidden(self):
        url = reverse("api:listing-favorite", kwargs={"version": "v1", "id": self.listing.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_removed_listing_marked_unavailable_in_favorites(self):
        Favorite.objects.create(user=self.student, listing=self.listing)
        self.listing.status = ListingStatus.REMOVED
        self.listing.save(update_fields=["status"])
        self._login(self.student)
        url = reverse("api:favorite-list", kwargs={"version": "v1"})
        response = self.client.get(url)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["is_available"])
