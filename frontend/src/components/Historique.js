import React, { useState, useEffect } from 'react';
import { Container, Table, Alert, Spinner, Button, Modal, Form, Badge } from 'react-bootstrap';
import { getMesRendezVous, modifierRendezVous, supprimerRendezVous } from '../services/api';
import QRCode from 'react-qr-code';

function Historique() {
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [showSupprimerModal, setShowSupprimerModal] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState(null);
  const [formData, setFormData] = useState({});
  const [modifying, setModifying] = useState(false);
  const [suppriming, setSuppriming] = useState(false);

  const fetchRdvs = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Vous devez être connecté pour voir votre historique.');
        setRdvs([]);
        return;
      }

      const data = await getMesRendezVous();
      if (Array.isArray(data)) {
        setRdvs(data);
      } else if (data.error) {
        setError(data.error);
        setRdvs([]);
      } else {
        setRdvs([]);
        setError('Format de données inattendu');
      }
    } catch (err) {
      console.error('Erreur fetchRdvs:', err);
      if (err.message.includes('token not valid') || err.message.includes('Token non trouvé')) {
        setError('Votre session a expiré. Veuillez vous reconnecter.');
        // Rediriger vers la page de connexion
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        window.location.href = '/login';
      } else {
        setError(`Erreur lors du chargement de l'historique: ${err.message}`);
      }
      setRdvs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRdvs();
  }, []);

  const handleModifier = (rdv) => {
    setSelectedRdv(rdv);
    setFormData({
      cin: rdv.cin,
      plaque_camion: rdv.plaque_camion,
      numero_conteneur: rdv.numero_conteneur,
      operation: rdv.operation,
      type_conteneur: rdv.type_conteneur,
      date_rdv: rdv.date_rdv,
      heure_rdv: rdv.heure_rdv
    });
    setShowModifierModal(true);
  };

  const handleSupprimer = (rdv) => {
    setSelectedRdv(rdv);
    setShowSupprimerModal(true);
  };

  const handleModifierSubmit = async (e) => {
    e.preventDefault();
    setModifying(true);
    try {
      const response = await modifierRendezVous(selectedRdv.id, formData);
      if (response.error) {
        setError(response.error);
      } else {
        setShowModifierModal(false);
        setError('');
        fetchRdvs(); // Recharger la liste
        alert('Rendez-vous modifié avec succès !');
      }
    } catch (err) {
      if (err.error) {
        setError(err.error);
      } else if (typeof err === 'object' && err.non_field_errors) {
        setError(err.non_field_errors.join('\n'));
      } else if (typeof err === 'object') {
        const fieldErrors = Object.values(err).flat();
        setError(fieldErrors.join('\n'));
      } else {
        setError(`Erreur lors de la modification du rendez-vous: ${err.toString()}`);
      }
    } finally {
      setModifying(false);
    }
  };

  const handleSupprimerConfirm = async () => {
    setSuppriming(true);
    try {
      const response = await supprimerRendezVous(selectedRdv.id);
      if (response.error) {
        setError(response.error);
      } else {
        setShowSupprimerModal(false);
        setError('');
        fetchRdvs(); // Recharger la liste
        alert('Rendez-vous supprimé avec succès !');
      }
    } catch (err) {
      setError('Erreur lors de la suppression du rendez-vous.');
    } finally {
      setSuppriming(false);
    }
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'en_attente': 'warning',
      'valide': 'success',
      'annule': 'danger',
      'termine': 'info'
    };
    const labels = {
      'en_attente': 'En attente',
      'valide': 'Validé',
      'annule': 'Annulé',
      'termine': 'Terminé'
    };
    return <Badge bg={variants[statut]}>{labels[statut]}</Badge>;
  };

  const canModify = (rdv) => {
    return rdv.statut === 'en_attente' || rdv.statut === 'valide';
  };

  const canDelete = (rdv) => {
    return rdv.statut !== 'termine';
  };

  const getIntervalleFin = (heureDebut) => {
    if (!heureDebut) return '';
    const [hours, minutes] = heureDebut.split(':').map(Number);
    const heureFin = new Date();
    heureFin.setHours(hours + 2, minutes, 0, 0);
    return heureFin.toTimeString().slice(0, 5);
  };

  const today = new Date();

  return (
    <Container className="py-4">
      <h2 className="mb-4" style={{ color: '#1A3761', fontWeight: 700 }}>
        <i className="fas fa-history me-2"></i>
        Mes Rendez-vous
      </h2>
      
      {loading && <Spinner animation="border" variant="primary" />}
      {error && <Alert variant="danger">{error}</Alert>}
      
      {!loading && !error && rdvs.length === 0 && (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          Aucun rendez-vous trouvé.
        </Alert>
      )}
      
      {!loading && !error && rdvs.length > 0 && (
        <div className="table-responsive">
          <Table striped bordered hover className="shadow-sm">
            <thead style={{ background: '#1A3761', color: 'white' }}>
              <tr>
                <th>Date</th>
                <th>Intervalle</th>
                <th>Opération</th>
                <th>CIN</th>
                <th>Plaque</th>
                <th>Conteneur</th>
                <th>Type</th>
                <th>QR Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rdvs.map(rdv => {
                const isFuture = new Date(rdv.date_rdv) > today;
                return (
                  <tr key={rdv.id}>
                    <td>{new Date(rdv.date_rdv).toLocaleDateString('fr-FR')}</td>
                    <td>{rdv.heure_rdv} - {getIntervalleFin(rdv.heure_rdv)}</td>
                    <td>
                      <Badge bg={rdv.operation === 'import' ? 'info' : 'warning'}>
                        {rdv.operation === 'import' ? 'Import' : rdv.operation === 'export' ? 'Export' : 'N/A'}
                      </Badge>
                    </td>
                    <td>{rdv.cin}</td>
                    <td>{rdv.plaque_camion}</td>
                    <td>{rdv.numero_conteneur}</td>
                    <td>
                      <Badge bg={rdv.type_conteneur === 'plein' ? 'primary' : 'secondary'}>
                        {rdv.type_conteneur === 'plein' ? 'Plein' : 'Vide'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isFuture && rdv.code_unique ? (
                        <div style={{ display: 'inline-block', background: '#FFF', padding: 8, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,159,227,0.08)' }}>
                          <QRCode
                            value={JSON.stringify({
                              code_unique: rdv.code_unique,
                              cin: rdv.cin,
                              plaque_camion: rdv.plaque_camion,
                              numero_conteneur: rdv.numero_conteneur,
                              type_conteneur: rdv.type_conteneur,
                              operation: rdv.operation,
                              date_rdv: rdv.date_rdv,
                              description_operation: rdv.description_operation,
                              intervalle_rdv: rdv.intervalle_rdv
                            })}
                            size={64}
                            level="H"
                            style={{ background: 'white', padding: 4, borderRadius: 6 }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: '#bbb', fontSize: 12 }}>-</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        {canModify(rdv) && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleModifier(rdv)}
                          >
                            <i className="fas fa-edit me-1"></i>
                            Modifier
                          </Button>
                        )}
                        {canDelete(rdv) && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleSupprimer(rdv)}
                          >
                            <i className="fas fa-trash me-1"></i>
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal de modification */}
      <Modal show={showModifierModal} onHide={() => setShowModifierModal(false)} size="lg">
        <Modal.Header closeButton style={{ background: '#1A3761', color: 'white' }}>
          <Modal.Title>
            <i className="fas fa-edit me-2"></i>
            Modifier le rendez-vous
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleModifierSubmit}>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>CIN du chauffeur</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.cin || ''}
                    onChange={(e) => setFormData({...formData, cin: e.target.value})}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Plaque du camion</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.plaque_camion || ''}
                    onChange={(e) => setFormData({...formData, plaque_camion: e.target.value})}
                    required
                  />
                </Form.Group>
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Numéro de conteneur</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.numero_conteneur || ''}
                    onChange={(e) => setFormData({...formData, numero_conteneur: e.target.value})}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Opération</Form.Label>
                  <Form.Select
                    value={formData.operation || ''}
                    onChange={(e) => setFormData({...formData, operation: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner...</option>
                    <option value="import">Import</option>
                    <option value="export">Export</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Type de conteneur</Form.Label>
                  <Form.Select
                    value={formData.type_conteneur || ''}
                    onChange={(e) => setFormData({...formData, type_conteneur: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner...</option>
                    <option value="plein">Plein</option>
                    <option value="vide">Vide</option>
                  </Form.Select>
                </Form.Group>
              </div>

            </div>
            
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Date du rendez-vous</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date_rdv || ''}
                    onChange={(e) => setFormData({...formData, date_rdv: e.target.value})}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Intervalle de rendez-vous</Form.Label>
                  <Form.Select
                    value={formData.heure_rdv || ''}
                    onChange={(e) => setFormData({...formData, heure_rdv: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner un créneau</option>
                    <option value="06:00">06:00 - 08:00</option>
                    <option value="08:00">08:00 - 10:00</option>
                    <option value="10:00">10:00 - 12:00</option>
                    <option value="12:00">12:00 - 14:00</option>
                    <option value="14:00">14:00 - 16:00</option>
                    <option value="16:00">16:00 - 18:00</option>
                    <option value="18:00">18:00 - 20:00</option>
                    <option value="20:00">20:00 - 22:00</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModifierModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={handleModifierSubmit}
            disabled={modifying}
          >
            {modifying ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Modification...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                Enregistrer
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de suppression */}
      <Modal show={showSupprimerModal} onHide={() => setShowSupprimerModal(false)}>
        <Modal.Header closeButton style={{ background: '#dc3545', color: 'white' }}>
          <Modal.Title>
            <i className="fas fa-exclamation-triangle me-2"></i>
            Confirmer la suppression
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Êtes-vous sûr de vouloir supprimer ce rendez-vous ?</p>
          <div className="alert alert-warning">
            <strong>Rendez-vous :</strong> {selectedRdv?.cin} - {selectedRdv?.plaque_camion}<br/>
            <strong>Date :</strong> {selectedRdv?.date_rdv} à {selectedRdv?.heure_rdv} - {getIntervalleFin(selectedRdv?.heure_rdv)}<br/>
            <strong>Statut :</strong> {getStatutBadge(selectedRdv?.statut)}
          </div>
          <p className="text-danger">
            <i className="fas fa-info-circle me-1"></i>
            Cette action est irréversible.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSupprimerModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="danger" 
            onClick={handleSupprimerConfirm}
            disabled={suppriming}
          >
            {suppriming ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Suppression...
              </>
            ) : (
              <>
                <i className="fas fa-trash me-2"></i>
                Supprimer
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Historique; 