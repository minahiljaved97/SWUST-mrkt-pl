from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("reports", "0001_phase2_models"),
    ]

    operations = [
        migrations.AlterField(
            model_name="report",
            name="reason",
            field=models.CharField(
                choices=[
                    ("SPAM", "Spam"),
                    ("FRAUD", "Fraud / scam"),
                    ("INAPPROPRIATE_CONTENT", "Inappropriate content"),
                    ("WRONG_INFORMATION", "Wrong information"),
                    ("DUPLICATE_LISTING", "Duplicate listing"),
                    ("OTHER", "Other"),
                ],
                max_length=30,
            ),
        ),
    ]
