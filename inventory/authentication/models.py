from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


# ─── Profile ────────────────────────────────────────────────────────────────

class Profile(models.Model):
    ROLE_OWNER   = 'owner'
    ROLE_MANAGER = 'manager'
    ROLE_STAFF   = 'staff'
    ROLE_CHOICES = [
        (ROLE_OWNER,   'Owner'),
        (ROLE_MANAGER, 'Manager'),
        (ROLE_STAFF,   'Staff'),
    ]

    user       = models.OneToOneField(User, on_delete=models.CASCADE)
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STAFF)
    phone      = models.CharField(max_length=100, blank=True, null=True)
    image      = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    title      = models.CharField(max_length=50, blank=True, null=True)
    bio        = models.TextField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    @property
    def is_owner(self):
        return self.role == self.ROLE_OWNER

    @property
    def is_manager(self):
        return self.role == self.ROLE_MANAGER

    @property
    def is_staff_role(self):
        return self.role == self.ROLE_STAFF


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
    else:
        Profile.objects.get_or_create(user=instance)


# ─── Shop ────────────────────────────────────────────────────────────────────

class Shop(models.Model):
    owner      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_shops')
    name       = models.CharField(max_length=150)
    address    = models.TextField(blank=True, null=True)
    phone      = models.CharField(max_length=50, blank=True, null=True)
    email      = models.EmailField(blank=True, null=True)
    logo       = models.ImageField(upload_to='shop_logos/', blank=True, null=True)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# ─── Shop Membership (role per shop) ─────────────────────────────────────────

class ShopMember(models.Model):
    ROLE_MANAGER = 'manager'
    ROLE_STAFF   = 'staff'
    ROLE_CHOICES = [
        (ROLE_MANAGER, 'Manager'),
        (ROLE_STAFF,   'Staff'),
    ]

    shop       = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='members')
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shop_memberships')
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STAFF)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('shop', 'user')   # one role per user per shop

    def __str__(self):
        return f"{self.user.username} → {self.shop.name} ({self.role})"