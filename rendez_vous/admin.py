from django.contrib import admin
from .models import RendezVous

@admin.register(RendezVous)
class RendezVousAdmin(admin.ModelAdmin):
    list_display = [
        'code_unique', 'cin', 'plaque_camion', 'numero_conteneur',
        'operation', 'sens_trafic', 'type_conteneur', 'date_rdv',
        'heure_rdv', 'statut', 'date_creation'
    ]
    list_filter = [
        'statut', 'operation', 'sens_trafic', 'type_conteneur',
        'date_rdv', 'date_creation'
    ]
    search_fields = [
        'code_unique', 'cin', 'plaque_camion', 'numero_conteneur'
    ]
    readonly_fields = [
        'code_unique', 'qr_code', 'date_creation'
    ]
    date_hierarchy = 'date_creation'
    
    fieldsets = (
        ('Informations du chauffeur', {
            'fields': ('cin',)
        }),
        ('Informations du véhicule', {
            'fields': ('plaque_camion', 'numero_conteneur')
        }),
        ('Détails du rendez-vous', {
            'fields': ('operation', 'sens_trafic', 'type_conteneur', 'date_rdv', 'heure_rdv')
        }),
        ('Informations système', {
            'fields': ('code_unique', 'qr_code', 'statut', 'date_creation'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['valider_rendez_vous', 'annuler_rendez_vous', 'terminer_rendez_vous']
    
    def valider_rendez_vous(self, request, queryset):
        """Action pour valider les rendez-vous sélectionnés"""
        updated = queryset.filter(statut='en_attente').update(statut='valide')
        self.message_user(request, f'{updated} rendez-vous ont été validés.')
    valider_rendez_vous.short_description = "Valider les rendez-vous sélectionnés"
    
    def annuler_rendez_vous(self, request, queryset):
        """Action pour annuler les rendez-vous sélectionnés"""
        updated = queryset.filter(statut__in=['en_attente', 'valide']).update(statut='annule')
        self.message_user(request, f'{updated} rendez-vous ont été annulés.')
    annuler_rendez_vous.short_description = "Annuler les rendez-vous sélectionnés"
    
    def terminer_rendez_vous(self, request, queryset):
        """Action pour terminer les rendez-vous sélectionnés"""
        updated = queryset.filter(statut='valide').update(statut='termine')
        self.message_user(request, f'{updated} rendez-vous ont été terminés.')
    terminer_rendez_vous.short_description = "Terminer les rendez-vous sélectionnés"
    
    def get_queryset(self, request):
        """Optimiser les requêtes"""
        return super().get_queryset(request).select_related()
