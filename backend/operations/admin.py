from django import forms
from django.contrib import admin
from django.contrib.auth.hashers import make_password
from .models import EmergencyOperation, Operator, OperatorSession


class OperatorAdminForm(forms.ModelForm):
    password = forms.CharField(
        label="Mot de passe",
        widget=forms.PasswordInput(render_value=False),
        required=False,
        help_text="Laissez vide lors d'une modification pour conserver le mot de passe actuel.",
    )

    class Meta:
        model = Operator
        fields = ("username", "display_name", "service_id", "password", "is_active")

    def clean_password(self):
        password = self.cleaned_data.get("password")
        if not self.instance.pk and not password:
            raise forms.ValidationError("Un mot de passe est requis pour créer un compte opérateur.")
        return password


@admin.register(Operator)
class OperatorAdmin(admin.ModelAdmin):
    form = OperatorAdminForm
    list_display = ("username", "display_name", "service_id", "is_active", "created_at")
    list_filter = ("service_id", "is_active")
    search_fields = ("username", "display_name")
    fields = ("username", "display_name", "service_id", "password", "is_active")

    def save_model(self, request, obj, form, change):
        raw_password = form.cleaned_data.get("password")
        if raw_password:
            obj.password = make_password(raw_password)
        elif change:
            obj.password = Operator.objects.get(pk=obj.pk).password
        super().save_model(request, obj, form, change)


@admin.register(EmergencyOperation)
class EmergencyOperationAdmin(admin.ModelAdmin):
    list_display = ("id", "service_id", "status", "created_at_ms", "assigned_to")
    list_filter = ("service_id", "status")
    search_fields = ("id", "assigned_to")
    readonly_fields = ("payload",)


admin.site.register(OperatorSession)
