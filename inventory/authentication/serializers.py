from rest_framework.serializers import ModelSerializer
from django.contrib.auth.models import User
from .models import Profile
from rest_framework import serializers

class UserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Profile
        fields = ['id', 'user', 'phone', 'image', 'title', 'bio']

    def update(self, instance, validated_data):
        request = self.context.get('request')
        data = request.data

        user = instance.user
        user.username = data.get('username', user.username)
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = data.get('email', user.email)
        user.save()

        # Optional fields (no crash if blank/missing)
        instance.phone = data.get('phone', instance.phone)
        instance.title = data.get('title', instance.title)
        instance.bio = data.get('bio', instance.bio)

        if 'image' in request.FILES:
            instance.image = request.FILES['image']

        instance.save()
        return instance
