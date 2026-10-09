import pytest
from django.core.management import call_command
from django.urls import reverse


@pytest.mark.django_db
def test_admin_login_page_returns_200(client):
    response = client.get(reverse("admin:login"))
    assert response.status_code == 200


def test_django_check_passes():
    call_command("check")
