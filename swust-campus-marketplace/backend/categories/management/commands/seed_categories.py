from django.core.management.base import BaseCommand

from categories.models import Category

SEED_CATEGORIES = [
    {
        "name": "Textbooks",
        "slug": "textbooks",
        "description": "Course books, reference materials, and study guides.",
        "sort_order": 1,
    },
    {
        "name": "Bicycles",
        "slug": "bicycles",
        "description": "Campus bikes and cycling accessories.",
        "sort_order": 2,
    },
    {
        "name": "Electronics",
        "slug": "electronics",
        "description": "Laptops, phones, peripherals, and gadgets.",
        "sort_order": 3,
    },
    {
        "name": "Furniture",
        "slug": "furniture",
        "description": "Desks, chairs, shelves, and dorm furniture.",
        "sort_order": 4,
    },
    {
        "name": "Other Student Items",
        "slug": "other-student-items",
        "description": "Miscellaneous items useful for student life.",
        "sort_order": 5,
    },
]


class Command(BaseCommand):
    help = "Seed the five default marketplace categories."

    def handle(self, *args, **options):
        created_count = 0
        for item in SEED_CATEGORIES:
            _, created = Category.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name": item["name"],
                    "description": item["description"],
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Categories ready. Created {created_count}, "
                f"total seeded={len(SEED_CATEGORIES)}."
            )
        )
