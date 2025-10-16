from rest_framework import serializers
from .models import RendezVous
from datetime import datetime, timedelta
from django.utils import timezone

class RendezVousSerializer(serializers.ModelSerializer):
    qr_code_url = serializers.SerializerMethodField()
    intervalle_rdv = serializers.SerializerMethodField()
    description_operation = serializers.SerializerMethodField()
    
    class Meta:
        model = RendezVous
        fields = [
            'id', 'cin', 'plaque_camion', 'numero_conteneur', 'sens_trafic',
            'type_conteneur', 'operation', 'date_rdv', 'heure_rdv',
            'code_unique', 'qr_code_url', 'intervalle_rdv', 'description_operation',
            'statut', 'date_creation'
        ]
        read_only_fields = ['id', 'code_unique', 'qr_code_url', 'statut', 'date_creation']
    
    def get_qr_code_url(self, obj):
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None
    
    def get_intervalle_rdv(self, obj):
        return obj.get_intervalle_rdv()
    
    def get_description_operation(self, obj):
        return obj.description_operation

class QRCodeSerializer(serializers.ModelSerializer):
    """Sérialiseur spécifique pour le QR code avec données simplifiées"""
    
    class Meta:
        model = RendezVous
        fields = [
            'code_unique', 'cin', 'plaque_camion', 'numero_conteneur',
            'type_conteneur', 'operation', 'date_rdv'
        ]
    
    def validate_date_rdv(self, value):
        """Valider que la date de rendez-vous n'est pas dans le passé"""
        if value < timezone.now().date():
            raise serializers.ValidationError("La date de rendez-vous ne peut pas être dans le passé.")
        return value
    
    def validate_heure_rdv(self, value):
        """Valider que l'heure de rendez-vous est dans les heures ouvrables"""
        if value.hour < 6 or value.hour > 22:
            raise serializers.ValidationError("Les rendez-vous sont possibles entre 6h00 et 22h00.")
        return value
    
    def validate(self, data):
        """Validation croisée des données"""
        # Vérifier qu'il n'y a pas de conflit de rendez-vous
        date_rdv = data.get('date_rdv')
        heure_rdv = data.get('heure_rdv')
        plaque_camion = data.get('plaque_camion')
        
        if date_rdv and heure_rdv and plaque_camion:
            # Vérifier les conflits pour le même camion
            conflits = RendezVous.objects.filter(
                plaque_camion=plaque_camion,
                date_rdv=date_rdv,
                statut__in=['en_attente', 'valide']
            ).exclude(id=self.instance.id if self.instance else None)
            
            for conflit in conflits:
                heure_debut_conflit = conflit.heure_rdv
                heure_fin_conflit = (datetime.combine(conflit.date_rdv, heure_debut_conflit) + timedelta(hours=2)).time()
                
                heure_debut_nouveau = heure_rdv
                heure_fin_nouveau = (datetime.combine(date_rdv, heure_debut_nouveau) + timedelta(hours=2)).time()
                
                # Vérifier s'il y a chevauchement
                if (heure_debut_nouveau < heure_fin_conflit and heure_fin_nouveau > heure_debut_conflit):
                    raise serializers.ValidationError(
                        f"Conflit de rendez-vous : ce camion a déjà un rendez-vous le {date_rdv} "
                        f"entre {heure_debut_conflit.strftime('%H:%M')} et {heure_fin_conflit.strftime('%H:%M')}"
                    )
        
        return data

class RendezVousCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur spécifique pour la création de rendez-vous"""
    
    class Meta:
        model = RendezVous
        fields = [
            'cin', 'plaque_camion', 'numero_conteneur', 'sens_trafic',
            'type_conteneur', 'operation', 'date_rdv', 'heure_rdv'
        ]
    
    def validate_date_rdv(self, value):
        """Valider que la date de rendez-vous n'est pas dans le passé"""
        if value < timezone.now().date():
            raise serializers.ValidationError("La date de rendez-vous ne peut pas être dans le passé.")
        return value
    
    def validate_heure_rdv(self, value):
        """Valider que l'heure de rendez-vous est dans les heures ouvrables"""
        if value.hour < 6 or value.hour > 22:
            raise serializers.ValidationError("Les rendez-vous sont possibles entre 6h00 et 22h00.")
        return value
    
    def validate(self, data):
        """Validation croisée des données"""
        # Vérifier qu'il n'y a pas de conflit de rendez-vous
        date_rdv = data.get('date_rdv')
        heure_rdv = data.get('heure_rdv')
        plaque_camion = data.get('plaque_camion')
        
        if date_rdv and heure_rdv and plaque_camion:
            # Vérifier les conflits pour le même camion
            conflits = RendezVous.objects.filter(
                plaque_camion=plaque_camion,
                date_rdv=date_rdv,
                statut__in=['en_attente', 'valide']
            ).exclude(id=self.instance.id if self.instance else None)
            
            for conflit in conflits:
                heure_debut_conflit = conflit.heure_rdv
                heure_fin_conflit = (datetime.combine(conflit.date_rdv, heure_debut_conflit) + timedelta(hours=2)).time()
                
                heure_debut_nouveau = heure_rdv
                heure_fin_nouveau = (datetime.combine(date_rdv, heure_debut_nouveau) + timedelta(hours=2)).time()
                
                # Vérifier s'il y a chevauchement
                if (heure_debut_nouveau < heure_fin_conflit and heure_fin_nouveau > heure_debut_conflit):
                    raise serializers.ValidationError(
                        f"Conflit de rendez-vous : ce camion a déjà un rendez-vous le {date_rdv} "
                        f"entre {heure_debut_conflit.strftime('%H:%M')} et {heure_fin_conflit.strftime('%H:%M')}"
                    )
        
        return data 