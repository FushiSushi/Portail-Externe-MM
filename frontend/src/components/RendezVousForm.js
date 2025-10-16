import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Alert, Card } from 'react-bootstrap';
import { rendezVousService } from '../services/api';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';



const RendezVousForm = ({ type = 'import' }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cin: '',
    plaque_camion: '',
    numero_conteneur: '',
    type_conteneur: 'vide',
    date_rdv: '',
    heure_rdv: ''
  });

  // Créneaux de 2h disponibles
  const creneaux = [
    { value: '06:00', label: '06:00 - 08:00' },
    { value: '08:00', label: '08:00 - 10:00' },
    { value: '10:00', label: '10:00 - 12:00' },
    { value: '12:00', label: '12:00 - 14:00' },
    { value: '14:00', label: '14:00 - 16:00' },
    { value: '16:00', label: '16:00 - 18:00' },
    { value: '18:00', label: '18:00 - 20:00' },
    { value: '20:00', label: '20:00 - 22:00' }
  ];

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [rendezVous, setRendezVous] = useState(null);
  const [creneauxPleins, setCreneauxPleins] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Rediriger si le type n'est pas valide
    if (type && type !== 'import' && type !== 'export') {
      navigate('/');
    }
  }, [navigate, type]);

  useEffect(() => {
    if (!formData.date_rdv) {
      setCreneauxPleins([]);
      return;
    }
    // Remplacez l'URL par celle de votre backend
    fetch(`/api/rdv/creneaux-pleins/?date=${formData.date_rdv}`)
      .then(res => res.json())
      .then(data => {
        setCreneauxPleins(data);
      })
      .catch(() => setCreneauxPleins([]));
  }, [formData.date_rdv]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.cin.match(/^[A-Z]{1,2}\d{6}$/)) {
      errors.push('Le CIN doit être au format: A123456 ou AB123456');
    }
    if (!formData.plaque_camion.match(/^\d{3,4}-[A-Z]{1,3}-\d{1,4}$/)) {
      errors.push('La plaque doit être au format: 123-A-456 ou 1234-ABC-12');
    }
    if (!formData.numero_conteneur.match(/^[A-Z]{4}\d{7}$/)) {
      errors.push('Le numéro de conteneur doit être au format: ABCD1234567');
    }
    if (!formData.date_rdv) {
      errors.push('La date de rendez-vous est obligatoire');
    } else {
      const selectedDate = new Date(formData.date_rdv);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        errors.push('La date de rendez-vous ne peut pas être dans le passé');
      }
    }
    if (!formData.heure_rdv) {
      errors.push('L\'intervalle de rendez-vous est obligatoire');
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setRendezVous(null);
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }
    setLoading(true);
    try {
      // Ajouter les valeurs par défaut pour les champs requis par le backend
      const dataToSend = {
        ...formData,
        sens_trafic: 'entree', // Valeur par défaut
        type_conteneur: formData.type_conteneur || 'vide', // Valeur par défaut si vide
        operation: type, // Ajouter le type d'opération (import/export)
        statut: 'en_attente', // Statut par défaut
        code_unique: '', // Sera généré par le backend
        user: null // Sera géré par le backend
      };
      const response = await rendezVousService.createRendezVous(dataToSend);
      setRendezVous(response);
      setSuccess(true);
      setFormData({
        cin: '',
        plaque_camion: '',
        numero_conteneur: '',
        type_conteneur: type === 'import' ? 'vide' : 'vide',
        date_rdv: '',
        heure_rdv: ''
      });
    } catch (err) {
      if (typeof err === 'object' && err.non_field_errors) {
        setError(err.non_field_errors.join('\n'));
      } else if (typeof err === 'object') {
        const fieldErrors = Object.values(err).flat();
        setError(fieldErrors.join('\n'));
      } else {
        setError(err.toString());
      }
    } finally {
      setLoading(false);
    }
  };

  const getOperationDescription = () => {
    if (type === 'import') {
      return "Import - Entrée de conteneur dans le port";
    } else if (type === 'export') {
      if (formData.type_conteneur === 'vide') {
        return "Export - Conteneur vide";
      } else {
        return "Export - Conteneur plein";
      }
    } else {
      return "Formulaire de rendez-vous";
    }
  };

  const getIntervalleFin = (heureDebut) => {
    if (!heureDebut) return '';
    const [hours, minutes] = heureDebut.split(':').map(Number);
    const heureFin = new Date();
    heureFin.setHours(hours + 2, minutes, 0, 0);
    return heureFin.toTimeString().slice(0, 5);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F5F5F5 0%, #E6F7FB 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0'
    }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="shadow-lg" style={{ borderRadius: 32, background: 'rgba(255,255,255,0.98)', border: 'none' }}>
              <Card.Header style={{ background: '#1A3761', borderRadius: '32px 32px 0 0', textAlign: 'center', border: 'none', padding: 32 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#FFF', letterSpacing: 1 }}>
                  {type === 'import' ? 'Import' : type === 'export' ? 'Export' : 'Rendez-vous'} - Formulaire de Rendez-vous
                </div>
              </Card.Header>
              <Card.Body style={{ padding: 36 }}>
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    <Alert.Heading>Erreur de validation</Alert.Heading>
                    <pre className="mb-0">{error}</pre>
                  </Alert>
                )}

                {success && rendezVous && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #E6F7FB 0%, #D4F1F8 100%)', 
                    border: '2px solid #009FE3', 
                    borderRadius: 20, 
                    padding: 32,
                    marginBottom: 24,
                    boxShadow: '0 4px 20px rgba(0,159,227,0.15)',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%', 
                      background: '#009FE3', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: '0 auto 20px',
                      color: 'white',
                      fontSize: 40
                    }}>
                      <i className="fas fa-check"></i>
                    </div>
                    
                    <h3 style={{ color: '#1A3761', fontWeight: 700, marginBottom: 16 }}>
                      ✅ Rendez-vous confirmé avec succès !
                    </h3>
                    
                    <p style={{ color: '#1A3761', fontSize: 18, marginBottom: 24 }}>
                      Votre rendez-vous a été enregistré dans notre système. 
                      Conservez précieusement votre QR code ci-dessous.
                    </p>
                    
                    <div style={{ 
                      background: '#FFF', 
                      borderRadius: 20, 
                      padding: 32, 
                      margin: '0 auto 24px',
                      maxWidth: 400,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                      <h5 style={{ color: '#1A3761', fontWeight: 600, marginBottom: 16 }}>
                        <i className="fas fa-qrcode me-2"></i>
                        Votre QR Code
                      </h5>
                      <QRCode 
                        value={JSON.stringify({
                          code_unique: rendezVous.code_unique,
                          cin: rendezVous.cin,
                          plaque_camion: rendezVous.plaque_camion,
                          numero_conteneur: rendezVous.numero_conteneur,
                          type_conteneur: rendezVous.type_conteneur,
                          operation: rendezVous.operation,
                          date_rdv: rendezVous.date_rdv,
                          description_operation: rendezVous.description_operation,
                          intervalle_rdv: rendezVous.intervalle_rdv
                        })}
                        size={200}
                        level="H"
                        style={{ background: 'white', padding: 12, borderRadius: 12 }}
                      />
                    </div>
                    
                    <div style={{ 
                      background: '#FFF', 
                      borderRadius: 16, 
                      padding: 24, 
                      margin: '0 auto',
                      maxWidth: 500,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
                    }}>
                      <h5 style={{ color: '#1A3761', fontWeight: 600, marginBottom: 16 }}>
                        <i className="fas fa-info-circle me-2"></i>
                        Détails du rendez-vous
                      </h5>
                      <div style={{ color: '#1A3761', fontWeight: 500, lineHeight: 2 }}>
                        <div><strong>Code unique :</strong> <span style={{ color: '#009FE3', fontFamily: 'monospace' }}>{rendezVous.code_unique}</span></div>
                        <div><strong>Date :</strong> {format(new Date(rendezVous.date_rdv), 'dd/MM/yyyy', { locale: fr })}</div>
                        <div><strong>Intervalle :</strong> {rendezVous.heure_rdv} - {getIntervalleFin(rendezVous.heure_rdv)}</div>
                        <div><strong>Plaque :</strong> {rendezVous.plaque_camion}</div>
                        <div><strong>Conteneur :</strong> {rendezVous.numero_conteneur}</div>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 24, padding: 16, background: '#FFF', borderRadius: 12 }}>
                      <p style={{ color: '#1A3761', margin: 0, fontWeight: 500 }}>
                        <i className="fas fa-exclamation-triangle me-2" style={{ color: '#FFA500' }}></i>
                        <strong>Important :</strong> Présentez ce QR code à l'entrée du site pour valider votre rendez-vous.
                      </p>
                    </div>
                  </div>
                )}

                <Form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ color: '#1A3761', fontWeight: 600 }}><i className="fas fa-id-card me-2"></i>CIN du chauffeur *</Form.Label>
                        <Form.Control
                          type="text"
                          name="cin"
                          value={formData.cin}
                          onChange={handleInputChange}
                          required
                        />
                        <Form.Text className="text-muted">
                          Format: AB123456 
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ color: '#1A3761', fontWeight: 600 }}><i className="fas fa-truck me-2"></i>Plaque du camion *</Form.Label>
                        <Form.Control
                          type="text"
                          name="plaque_camion"
                          value={formData.plaque_camion}
                          onChange={handleInputChange}
                          required
                        />
                        <Form.Text className="text-muted">
                          Format: 123-A-456 
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ color: '#1A3761', fontWeight: 600 }}><i className="fas fa-cube me-2"></i>Numéro de conteneur {type === 'import' ? 'à sortir' : 'à entrer'} *</Form.Label>
                        <Form.Control
                          type="text"
                          name="numero_conteneur"
                          value={formData.numero_conteneur}
                          onChange={handleInputChange}
                          required
                        />
                        <Form.Text className="text-muted">
                          Format: ABCD1234567
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ color: '#1A3761', fontWeight: 600 }}><i className="fas fa-box-open me-2"></i>Type de conteneur *</Form.Label>
                        <Form.Select
                          name="type_conteneur"
                          value={formData.type_conteneur}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="vide">Vide</option>
                          <option value="plein">Plein</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>



                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ color: '#1A3761', fontWeight: 600 }}><i className="fas fa-calendar-alt me-2"></i>Date du rendez-vous *</Form.Label>
                        <Form.Control
                          type="date"
                          name="date_rdv"
                          value={formData.date_rdv}
                          onChange={handleInputChange}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ color: '#1A3761', fontWeight: 600 }}><i className="fas fa-clock me-2"></i>Intervalle de rendez-vous *</Form.Label>
                        <Form.Select
                          name="heure_rdv"
                          value={formData.heure_rdv}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Sélectionner un créneau</option>
                          {creneaux.map((creneau, index) => (
                            <option
                              key={index}
                              value={creneau.value}
                              disabled={creneauxPleins.includes(creneau.value)}
                            >
                              {creneau.label}
                              {creneauxPleins.includes(creneau.value) ? ' (complet)' : ''}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          Créneaux de 2h disponibles entre 6h00 et 22h00
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>



                  <Alert variant="info" className="mb-3" style={{ background: '#E6F7FB', color: '#1A3761', border: 'none', borderRadius: 12 }}>
                    <strong>Description de l'opération :</strong><br />
                    {getOperationDescription()}
                  </Alert>

                  <div className="d-grid">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={loading}
                      style={{ borderRadius: 16, fontWeight: 700, fontSize: 20, padding: '14px 0', letterSpacing: 1, boxShadow: '0 2px 8px rgba(26,55,97,0.10)' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Création en cours...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-calendar-plus me-2"></i>
                          Créer le rendez-vous
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RendezVousForm; 