from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile, User, UserRole
from categories.models import Category


class CategoriesAPITests(APITestCase):
    def setUp(self):
        self.category, _ = Category.objects.get_or_create(
            slug="electronics",
            defaults={
                "name": "Electronics",
                "description": "Gadgets",
                "sort_order": 2,
                "is_active": True,
            },
        )
        self.inactive, _ = Category.objects.get_or_create(
            slug="archived-cat",
            defaults={
                "name": "Archived Cat",
                "description": "Hidden",
                "sort_order": 99,
                "is_active": False,
            },
        )
        self.student = User.objects.create_user(
            email="cat.student@swust.edu.cn",
            password="Pass12345!",
            first_name="Cat",
            last_name="Student",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.student, student_id="CATSTUD01")
        self.admin = User.objects.create_user(
            email="cat.admin@swust.edu.cn",
            password="Pass12345!",
            first_name="Cat",
            last_name="Admin",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        Profile.objects.create(user=self.admin, student_id="CATADMIN01")

    def test_student_lists_only_active_categories(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("api:category-list", kwargs={"version": "v1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        slugs = {item["slug"] for item in results}
        self.assertIn("electronics", slugs)
        self.assertNotIn("archived-cat", slugs)

    def test_student_cannot_create_category_via_public_api(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("api:category-list", kwargs={"version": "v1"})
        response = self.client.post(
            url, {"name": "Hack", "description": "Nope"}, format="json"
        )
        self.assertIn(
            response.status_code,
            {status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED},
        )

    def test_admin_can_manage_categories(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:admin-category-list", kwargs={"version": "v1"})
        created = self.client.post(
            url,
            {
                "name": "Lab Supplies",
                "description": "Pipettes",
                "sort_order": 8,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        detail = reverse(
            "api:admin-category-detail",
            kwargs={"version": "v1", "id": created.data["id"]},
        )
        patched = self.client.patch(detail, {"is_active": False}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_200_OK)
        self.assertFalse(patched.data["is_active"])

    def test_unauthenticated_forbidden(self):
        url = reverse("api:category-list", kwargs={"version": "v1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
