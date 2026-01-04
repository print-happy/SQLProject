import React, { useState } from 'react';
import {
  makeStyles,
  shorthands,
  Button,
  Input,
  Label,
  Title3,
  Card,
  Text,
  Select,
  Divider,
} from '@fluentui/react-components';
import { BoxRegular, CalculatorRegular, ArrowLeftRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    ...shorthands.padding('20px'),
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  resultCard: {
    marginTop: '20px',
  },
});

export const ShippingCalculator = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  
  // Sender Info
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');

  // Recipient Info
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Parcel Info
  const [courier, setCourier] = useState('SF');
  const [weight, setWeight] = useState('');
  const [distance, setDistance] = useState('');

  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    if (!weight || !distance) {
      alert('Please enter weight and distance');
      return;
    }

    const w = parseFloat(weight);
    const d = parseFloat(distance);
    
    if (isNaN(w) || isNaN(d)) {
      alert('Invalid weight or distance');
      return;
    }

    const price = w * d * 0.01;
    // Mock tracking number generation
    const trackingNo = `${courier}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;

    setResult({
      trackingNumber: trackingNo,
      price: price.toFixed(2),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Title3>{t('shipping.title')}</Title3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button size="small" onClick={toggleLanguage}>
            {language === 'zh' ? 'EN' : '中文'}
          </Button>
          <Button icon={<ArrowLeftRegular />} onClick={() => navigate('/login')}>{t('common.cancel')}</Button>
        </div>
      </header>

      <div className={styles.container}>
      <Title3>Send a Parcel</Title3>
      
      <Card>
        <div className={styles.formGrid}>
          {/* Sender Section */}
          <div className={styles.section}>
            <Text weight="semibold">{t('shipping.senderInfo')}</Text>
            <div className={styles.inputGroup}>
              <Label>{t('shipping.senderName')}</Label>
              <Input value={senderName} onChange={(e, d) => setSenderName(d.value)} />
            </div>
            <div className={styles.inputGroup}>
              <Label>{t('shipping.senderPhone')}</Label>
              <Input value={senderPhone} onChange={(e, d) => setSenderPhone(d.value)} />
            </div>
            <div className={styles.inputGroup}>
              <Label>Address</Label>
              <Input value={senderAddress} onChange={(e, d) => setSenderAddress(d.value)} />
            </div>
          </div>

          {/* Recipient Section */}
          <div className={styles.section}>
            <Text weight="semibold">{t('shipping.recipientInfo')}</Text>
            <div className={styles.inputGroup}>
              <Label>{t('shipping.recipientName')}</Label>
              <Input value={recipientName} onChange={(e, d) => setRecipientName(d.value)} />
            </div>
            <div className={styles.inputGroup}>
              <Label>{t('shipping.recipientPhone')}</Label>
              <Input value={recipientPhone} onChange={(e, d) => setRecipientPhone(d.value)} />
            </div>
            <div className={styles.inputGroup}>
              <Label>{t('shipping.recipientAddress')}</Label>
              <Input value={recipientAddress} onChange={(e, d) => setRecipientAddress(d.value)} />
            </div>
          </div>
        </div>

        <Divider style={{ margin: '20px 0' }} />

        <div className={styles.section}>
          <Text weight="semibold">Parcel Details</Text>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <Label>Courier</Label>
              <Select value={courier} onChange={(e, d) => setCourier(d.value)}>
                <option value="SF">SF Express</option>
                <option value="JD">JD Logistics</option>
                <option value="EMS">EMS</option>
                <option value="YTO">YTO Express</option>
              </Select>
            </div>
            <div className={styles.inputGroup}>
              <Label>{t('shipping.weight')}</Label>
              <Input type="number" value={weight} onChange={(e, d) => setWeight(d.value)} placeholder="e.g. 2.5" />
            </div>
            <div className={styles.inputGroup}>
              <Label>{t('shipping.distance')}</Label>
              <Input type="number" value={distance} onChange={(e, d) => setDistance(d.value)} placeholder="e.g. 500" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button appearance="primary" icon={<CalculatorRegular />} onClick={handleCalculate}>
            {t('shipping.calculateFee')}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className={styles.resultCard}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <BoxRegular fontSize={48} />
            <Title3>{t('shipping.shippingFee')}: ¥{result.price}</Title3>
            <Text size={400}>{t('shipping.generatedTracking')} <span style={{ fontWeight: 'bold' }}>{result.trackingNumber}</span></Text>
            <Text size={200} style={{ color: '#666' }}>* This is a simulation. No data is saved to database.</Text>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
};
