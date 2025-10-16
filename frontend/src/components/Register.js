import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Card, Container, Row, Col } from 'react-bootstrap';
import axios from 'axios';

const Register = () => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    telephone: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    console.log('Tentative d\'inscription avec les données:', form);
    
    try {
      // Test d'abord l'API de base
      const testResponse = await fetch('/api/test/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      });
      
      console.log('Test API response:', testResponse.status, testResponse.statusText);
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('Test API data:', testData);
      }
      
      // Maintenant testons l'inscription
      const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      console.log('Register response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Register data:', data);
        
        if (data && data.email) {
          setSuccess(true);
          setUserInfo({
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name
          });
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError('Erreur lors de l\'inscription');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Register error data:', errorData);
        setError(errorData.detail || Object.values(errorData).join(' ') || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      console.error('Erreur inscription complète:', err);
      setError('Erreur réseau lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F5F5 0%, #E6F7FB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={7}>
            <Card className="shadow-lg" style={{ borderRadius: 24 }}>
              <Card.Body style={{ padding: 36 }}>
                <h3 className="mb-4 text-center" style={{ color: '#1A3761', fontWeight: 700 }}>
                  Inscription
                </h3>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nom</Form.Label>
                    <Form.Control name="last_name" value={form.last_name} onChange={handleChange} required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Prénom</Form.Label>
                    <Form.Control name="first_name" value={form.first_name} onChange={handleChange} required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Numéro de téléphone</Form.Label>
                    <Form.Control name="telephone" value={form.telephone} onChange={handleChange} required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control name="email" type="email" value={form.email} onChange={handleChange} required />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Mot de passe</Form.Label>
                    <Form.Control name="password" type="password" value={form.password} onChange={handleChange} required />
                  </Form.Group>
                  <div className="d-grid">
                    <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ borderRadius: 16, fontWeight: 700 }}>
                      {loading ? 'Inscription...' : "S'inscrire"}
                    </Button>
                  </div>
                </Form>
                <div className="mt-3 text-center">
                  <a href="/login">Déjà un compte ? Se connecter</a>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register; 