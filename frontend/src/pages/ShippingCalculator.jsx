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
import { BoxRegular, CalculatorRegular } from '@fluentui/react-icons';

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
    <div className={styles.container}>
      <Title3>Send a Parcel</Title3>
      
      <Card>
        <div className={styles.formGrid}>
          {/* Sender Section */}
          <div className={styles.section}>
            <Text weight="semibold">Sender Information</Text>
            <div className={styles.inputGroup}>
              <Label>Name</Label>
              <Input value={senderName} onChange={(e, d) => setSenderName(d.value)} />
            </div>
            <div className={styles.inputGroup}>
              <Label>Phone</Label>
              <Input value={senderPhone} onChange={(e, d) => setSenderPhone(d.value)} />
            </div>
            <div className={styles.inputGroup}>
              <Label>Address</Label>
              <Input value={senderAddress} onChange={(e, d) => setSenderAddress(d.value)} />
            </div>
          </div>

          {/* Recipient Section */}
          <div className={styles.section}>
            <Text weight="semibold">Recipient Information</Text>
            <div className={styles.inputGroup}>
              <Label>Name</Label>
              <Input value={recipientName} onChange={(e, d) => setRecipientName(d.value)} />
            </div>
            <div className={styles.inputGroup}>
              <Label>Phone</Label>
              <Input value={recipientPhone} onChange={(e, d) => setRecipientPhone(d.value)} />
            </div>
            <div className={styles.inputGroup}>
              <Label>Address</Label>
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
              <Label>Weight (kg)</Label>
              <Input type="number" value={weight} onChange={(e, d) => setWeight(d.value)} placeholder="e.g. 2.5" />
            </div>
            <div className={styles.inputGroup}>
              <Label>Distance (km)</Label>
              <Input type="number" value={distance} onChange={(e, d) => setDistance(d.value)} placeholder="e.g. 500" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button appearance="primary" icon={<CalculatorRegular />} onClick={handleCalculate}>
            Calculate & Generate
          </Button>
        </div>
      </Card>

      {result && (
        <Card className={styles.resultCard}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <BoxRegular fontSize={48} />
            <Title3>Estimated Price: ¥{result.price}</Title3>
            <Text size={400}>Generated Tracking Number: <span style={{ fontWeight: 'bold' }}>{result.trackingNumber}</span></Text>
            <Text size={200} style={{ color: '#666' }}>* This is a simulation. No data is saved to database.</Text>
          </div>
        </Card>
      )}
    </div>
  );
};
