from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile, User, UserRole


class AuthenticationAPITests(APITestCase):
    def setUp(self):
        self.password = "Pass12345!"
        self.student = User.objects.create_user(
            email="auth.student@swust.edu.cn",
            password=self.password,
            first_name="Auth",
            last_name="Student",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(
            user=self.student,
            student_id="AUTHSTUD01",
            phone="13800000000",
        )
        self.admin = User.objects.create_user(
            email="auth.admin@swust.edu.cn",
            password=self.password,
            first_name="Auth",
            last_name="Admin",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        Profile.objects.create(user=self.admin, student_id="AUTHADMIN01")

    def test_register_login_me_and_logout(self):
        register_url = reverse("api:auth-register", kwargs={"version": "v1"})
        register = self.client.post(
            register_url,
            {
                "email": "new.student@swust.edu.cn",
                "password": "Pass12345!",
                "first_name": "New",
                "last_name": "Student",
                "student_id": "NEWSTUD01",
            },
            format="json",
        )
        self.assertEqual(register.status_code, status.HTTP_201_CREATED)

        login_url = reverse("api:auth-login", kwargs={"version": "v1"})
        login = self.client.post(
            login_url,
            {"email": "new.student@swust.edu.cn", "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("access", login.data)
        self.assertIn("refresh", login.data)

        access = login.data["access"]
        refresh = login.data["refresh"]
        me_url = reverse("api:auth-me", kwargs={"version": "v1"})
        me = self.client.get(me_url, HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["email"], "new.student@swust.edu.cn")

        logout_url = reverse("api:auth-logout", kwargs={"version": "v1"})
        logout = self.client.post(
            logout_url,
            {"refresh": refresh},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(logout.status_code, status.HTTP_205_RESET_CONTENT)

    def test_register_rejects_non_swust_email(self):
        url = reverse("api:auth-register", kwargs={"version": "v1"})
        response = self.client.post(
            url,
            {
                "email": "outsider@gmail.com",
                "password": "Pass12345!",
                "first_name": "Out",
                "last_name": "Sider",
                "student_id": "OUTSIDER01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_cannot_list_admin_users(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("api:auth-users-list", kwargs={"version": "v1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_list_excludes_phone(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("api:auth-users-list", kwargs={"version": "v1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertTrue(len(results) >= 1)
        self.assertNotIn("phone", str(results))
        self.assertNotIn("profile", results[0])

    def test_unauthenticated_me_forbidden(self):
        url = reverse("api:auth-me", kwargs={"version": "v1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
