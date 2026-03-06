from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html, mark_safe
from django.urls import reverse
from .models import Profile, Shop, ShopMember


# ─── helpers ──────────────────────────────────────────────────────────────────

def role_pill(role):
    colours = {
        'owner':   ('#4f46e5', '#eef2ff'),
        'manager': ('#b45309', '#fffbeb'),
        'staff':   ('#374151', '#f3f4f6'),
    }
    fg, bg = colours.get(role, ('#374151', '#f3f4f6'))
    return format_html(
        '<span style="background:{bg};color:{fg};padding:2px 10px;border-radius:999px;'
        'font-size:11px;font-weight:600;text-transform:capitalize">{role}</span>',
        bg=bg, fg=fg, role=role,
    )


# ─── Inlines ──────────────────────────────────────────────────────────────────

class ProfileInline(admin.StackedInline):
    model                = Profile
    can_delete           = False
    verbose_name_plural  = "Profile"
    fields               = ('role', 'phone', 'title', 'bio', 'image')
    extra                = 0


class ShopMemberInline(admin.TabularInline):
    model            = ShopMember
    extra            = 0
    fields           = ('user', 'role', 'created_at')
    readonly_fields  = ('created_at',)
    raw_id_fields    = ('user',)


# ─── User ─────────────────────────────────────────────────────────────────────

class CustomUserAdmin(BaseUserAdmin):
    inlines       = (ProfileInline,)
    list_display  = ('username', 'email', 'full_name', 'profile_role', 'is_active', 'date_joined')
    list_filter   = ('is_active', 'is_staff', 'profile__role')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering      = ('-date_joined',)
    list_per_page = 25

    @admin.display(description='Full Name')
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or "—"

    @admin.display(description='Role')
    def profile_role(self, obj):
        try:
            return role_pill(obj.profile.role)
        except Profile.DoesNotExist:
            return "—"


admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


# ─── Profile ──────────────────────────────────────────────────────────────────

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display    = ('username_link', 'role_badge', 'phone', 'title', 'created_at')
    list_filter     = ('role',)
    search_fields   = ('user__username', 'user__email', 'phone', 'title')
    readonly_fields = ('created_at', 'updated_at', 'avatar_preview')
    ordering        = ('-created_at',)
    list_per_page   = 25

    fieldsets = (
        ('User',        {'fields': ('user',)}),
        ('Role & Info', {'fields': ('role', 'phone', 'title', 'bio')}),
        ('Avatar',      {'fields': ('image', 'avatar_preview')}),
        ('Timestamps',  {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='Username')
    def username_link(self, obj):
        url = reverse('admin:auth_user_change', args=[obj.user.pk])
        return format_html('<a href="{url}"><strong>{name}</strong></a>', url=url, name=obj.user.username)

    @admin.display(description='Role')
    def role_badge(self, obj):
        return role_pill(obj.role)

    @admin.display(description='Avatar Preview')
    def avatar_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{url}" style="width:60px;height:60px;border-radius:50%;object-fit:cover"/>',
                url=obj.image.url,
            )
        return format_html(
            '<div style="width:60px;height:60px;border-radius:50%;background:#e0e7ff;'
            'display:flex;align-items:center;justify-content:center;'
            'font-weight:700;font-size:20px;color:#4f46e5">{initial}</div>',
            initial=obj.user.username[0].upper(),
        )


# ─── Shop ─────────────────────────────────────────────────────────────────────

@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display    = ('logo_thumb', 'name', 'owner_link', 'member_count', 'phone', 'email', 'status_badge', 'created_at')
    list_filter     = ('is_active', 'created_at')
    search_fields   = ('name', 'owner__username', 'owner__email', 'phone', 'email', 'address')
    readonly_fields = ('created_at', 'updated_at', 'logo_preview', 'member_count')
    ordering        = ('-created_at',)
    list_per_page   = 20
    inlines         = [ShopMemberInline]
    raw_id_fields   = ('owner',)

    fieldsets = (
        ('Shop Info',  {'fields': ('name', 'owner', 'is_active')}),
        ('Contact',    {'fields': ('address', 'phone', 'email')}),
        ('Logo',       {'fields': ('logo', 'logo_preview')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='')
    def logo_thumb(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{url}" style="width:36px;height:36px;border-radius:8px;object-fit:cover"/>',
                url=obj.logo.url,
            )
        return format_html(
            '<div style="width:36px;height:36px;border-radius:8px;background:#e0e7ff;'
            'display:flex;align-items:center;justify-content:center;'
            'font-weight:700;color:#4f46e5;font-size:14px">{initial}</div>',
            initial=obj.name[0].upper(),
        )

    @admin.display(description='Owner')
    def owner_link(self, obj):
        url = reverse('admin:auth_user_change', args=[obj.owner.pk])
        return format_html('<a href="{url}">{name}</a>', url=url, name=obj.owner.username)

    @admin.display(description='Members')
    def member_count(self, obj):
        count = obj.members.count()
        label = f"{count} member{'s' if count != 1 else ''}"
        return format_html(
            '<span style="background:#e0e7ff;color:#4f46e5;padding:2px 10px;'
            'border-radius:999px;font-size:11px;font-weight:600">{label}</span>',
            label=label,
        )

    @admin.display(description='Status')
    def status_badge(self, obj):
        if obj.is_active:
            return mark_safe(
                '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;'
                'border-radius:999px;font-size:11px;font-weight:600">&#9679; Active</span>'
            )
        return mark_safe(
            '<span style="background:#f3f4f6;color:#6b7280;padding:2px 10px;'
            'border-radius:999px;font-size:11px;font-weight:600">&#9675; Inactive</span>'
        )

    @admin.display(description='Logo Preview')
    def logo_preview(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{url}" style="width:80px;height:80px;border-radius:12px;object-fit:cover"/>',
                url=obj.logo.url,
            )
        return "No logo uploaded."

    actions = ['mark_active', 'mark_inactive']

    @admin.action(description='Mark selected shops as Active')
    def mark_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} shop(s) marked as active.")

    @admin.action(description='Mark selected shops as Inactive')
    def mark_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} shop(s) marked as inactive.")


# ─── ShopMember ───────────────────────────────────────────────────────────────

@admin.register(ShopMember)
class ShopMemberAdmin(admin.ModelAdmin):
    list_display    = ('user_link', 'shop_link', 'role_badge', 'created_at')
    list_filter     = ('role', 'shop')
    search_fields   = ('user__username', 'user__email', 'shop__name')
    readonly_fields = ('created_at',)
    ordering        = ('-created_at',)
    list_per_page   = 25
    raw_id_fields   = ('user', 'shop')

    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:auth_user_change', args=[obj.user.pk])
        return format_html(
            '<a href="{url}"><strong>{name}</strong></a>'
            '<br><span style="color:#9ca3af;font-size:11px">{email}</span>',
            url=url,
            name=obj.user.get_full_name() or obj.user.username,
            email=obj.user.email,
        )

    @admin.display(description='Shop')
    def shop_link(self, obj):
        url = reverse('admin:authentication_shop_change', args=[obj.shop.pk])
        return format_html('<a href="{url}">{name}</a>', url=url, name=obj.shop.name)

    @admin.display(description='Role')
    def role_badge(self, obj):
        return role_pill(obj.role)


# ─── Admin site branding ──────────────────────────────────────────────────────

admin.site.site_header = "Inventory System Admin"
admin.site.site_title  = "Inventory Admin"
admin.site.index_title = "Dashboard"