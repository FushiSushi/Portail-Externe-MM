from django.core.management.base import BaseCommand
from rendez_vous.models import RendezVous
import os
from django.conf import settings

class Command(BaseCommand):
    help = "Régénère les QR codes manquants pour tous les rendez-vous."

    def handle(self, *args, **options):
        count_regenerated = 0
        for rdv in RendezVous.objects.all():
            regenerate = False
            if not rdv.qr_code:
                regenerate = True
            else:
                # Vérifier si le fichier existe physiquement
                qr_path = os.path.join(settings.MEDIA_ROOT, rdv.qr_code.name)
                if not os.path.isfile(qr_path):
                    regenerate = True
            if regenerate:
                self.stdout.write(f"Régénération du QR code pour le rendez-vous {rdv.id} ({rdv.code_unique})...")
                rdv.qr_code.delete(save=False)  # Supprimer l'ancien chemin si besoin
                rdv.generate_qr_code()
                rdv.save(update_fields=['qr_code'])
                count_regenerated += 1
        self.stdout.write(self.style.SUCCESS(f"QR codes régénérés pour {count_regenerated} rendez-vous.")) 