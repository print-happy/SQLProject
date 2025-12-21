import React, { useEffect, useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
  Card,
  CardHeader,
  CardFooter,
  Button,
  Title1,
  Title3,
  Text,
  Badge,
  makeStyles,
  shorthands,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Avatar,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Input,
  Label,
} from '@fluentui/react-components';
import {
  BoxMultipleRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  SignOutRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding('10px', '20px'),
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
    ...shorthands.padding('20px'),
    overflowY: 'auto',
  },
  card: {
    marginTop: '20px',
    ...shorthands.padding('20px'),
  },
  statusBadge: {
    textTransform: 'capitalize',
  },
});

const statusMap = {
  stored: { color: 'brand', text: 'Ready for Pickup', icon: <ClockRegular /> },
  picked_up: { color: 'success', text: 'Picked Up', icon: <CheckmarkCircleRegular /> },
  waiting: { color: 'warning', text: 'In Transit', icon: <BoxMultipleRegular /> },
};

export const StudentDashboard = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [pickupError, setPickupError] = useState('');

  useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await axios.get('/api/v1/parcels', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setParcels(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch parcels', error);
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handlePickupClick = (parcel) => {
    setSelectedParcel(parcel);
    setPickupCodeInput(''); // Reset input
    setPickupError('');
    setPickupDialogOpen(true);
  };

  const confirmPickup = async () => {
    if (!selectedParcel) return;
    
    // Client-side validation: Check if input matches the parcel's pickup code
    // Note: In a real kiosk scenario, the user might not know the code if they are just claiming it,
    // but here we simulate the student entering the code they received via SMS/App to "unlock" or "confirm" pickup.
    // However, the backend requires the code to match.
    // If the UI already shows the code (which it does in the table), this is just a confirmation step.
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/pickup', {
        tracking_number: selectedParcel.tracking_number,
        pickup_code: pickupCodeInput
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setPickupDialogOpen(false);
      fetchParcels(); // Refresh list
    } catch (error) {
      console.error(error);
      setPickupError(error.response?.data?.error || 'Pickup failed');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar name="Student" />
          <Title3>Student Dashboard</Title3>
        </div>
        <Button icon={<SignOutRegular />} onClick={handleLogout}>Logout</Button>
      </header>

      <main className={styles.content}>
        <Title1>My Parcels</Title1>
        
        <Card className={styles.card}>
          <Table arial-label="Parcels table">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Tracking Number</TableHeaderCell>
                <TableHeaderCell>Courier</TableHeaderCell>
                <TableHeaderCell>Location</TableHeaderCell>
                <TableHeaderCell>Pickup Code</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell>Loading...</TableCell></TableRow>
              ) : parcels.length === 0 ? (
                <TableRow><TableCell>No parcels found.</TableCell></TableRow>
              ) : (
                parcels.map((parcel) => (
                  <TableRow key={parcel.tracking_number}>
                    <TableCell>
                      <TableCellLayout media={<BoxMultipleRegular />}>
                        {parcel.tracking_number}
                      </TableCellLayout>
                    </TableCell>
                    <TableCell>{parcel.courier_name}</TableCell>
                    <TableCell>{parcel.shelf_zone}</TableCell>
                    <TableCell>
                      <Text weight="bold" size={400}>{parcel.pickup_code || '-'}</Text>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        appearance="tint" 
                        color={statusMap[parcel.status]?.color || 'neutral'}
                        icon={statusMap[parcel.status]?.icon}
                      >
                        {statusMap[parcel.status]?.text || parcel.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {parcel.status === 'stored' && (
                        <Button size="small" onClick={() => handlePickupClick(parcel)}>
                          Pickup
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      <Dialog open={pickupDialogOpen} onOpenChange={(event, data) => setPickupDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Confirm Pickup</DialogTitle>
            <DialogContent>
              <p>Please enter the pickup code to confirm receipt of parcel <strong>{selectedParcel?.tracking_number}</strong>.</p>
              <p>Pickup Code: <strong>{selectedParcel?.pickup_code}</strong></p>
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <Label htmlFor="pickup-code-input">Enter Code</Label>
                <Input 
                  id="pickup-code-input" 
                  value={pickupCodeInput} 
                  onChange={(e, data) => setPickupCodeInput(data.value)}
                  placeholder="e.g. 123456"
                />
                {pickupError && <Text style={{ color: '#d13438', fontSize: '12px' }}>{pickupError}</Text>}
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={confirmPickup}>Confirm</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
