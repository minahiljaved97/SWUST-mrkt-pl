from django.db import migrations

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


def seed_categories(apps, schema_editor):
    Category = apps.get_model("categories", "Category")
    for item in SEED_CATEGORIES:
        Category.objects.update_or_create(
            slug=item["slug"],
            defaults={
                "name": item["name"],
                "description": item["description"],
                "sort_order": item["sort_order"],
                "is_active": True,
            },
        )


def unseed_categories(apps, schema_editor):
    Category = apps.get_model("categories", "Category")
    Category.objects.filter(
        slug__in=[item["slug"] for item in SEED_CATEGORIES]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("categories", "0001_phase2_models"),
    ]

    operations = [
        migrations.RunPython(seed_categories, unseed_categories),
    ]
