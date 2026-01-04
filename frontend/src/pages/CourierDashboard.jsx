import React, { useEffect, useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
  Card,
  CardHeader,
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
  Input,
  Label,
  TabList,
  Tab,
  Toaster,
  useId,
  useToastController,
  Toast,
  ToastTitle,
  ToastBody,
} from '@fluentui/react-components';
import {
  BoxMultipleRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  SignOutRegular,
  AddCircleRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Tesseract from 'tesseract.js';

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
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    maxWidth: '500px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
});

export const CourierDashboard = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);
  
  const [selectedTab, setSelectedTab] = useState('inbound');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Inbound Form State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [studentName, setStudentName] = useState('');
  const [inboundLoading, setInboundLoading] = useState(false);

  // OCR
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText, setOcrText] = useState('');
  const [ocrTracking, setOcrTracking] = useState('');
  const [ocrPhone, setOcrPhone] = useState('');

  useEffect(() => {
    if (selectedTab === 'tasks') {
      fetchTasks();
    }
  }, [selectedTab]);

  useEffect(() => {
    if (!ocrFile) {
      if (ocrPreviewUrl) URL.revokeObjectURL(ocrPreviewUrl);
      setOcrPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(ocrFile);
    setOcrPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocrFile]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/courier/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInbound = async () => {
    if (!trackingNumber || !phone) {
      notify('Error', 'Please fill in all fields', 'error');
      return;
    }

    setInboundLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/inbound', {
        tracking_number: trackingNumber,
        phone: phone,
        user_name: studentName,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify('Success', `Parcel ${trackingNumber} inbound successfully!`, 'success');
      
      // Reset form
      setTrackingNumber('');
      setPhone('');
      setStudentName('');
    } catch (error) {
      console.error(error);
      notify('Error', error.response?.data?.error || 'Inbound failed', 'error');
    } finally {
      setInboundLoading(false);
    }
  };

  const notify = (title, body, intent) => {
    dispatchToast(
      <Toast>
        <ToastTitle>{title}</ToastTitle>
        <ToastBody>{body}</ToastBody>
      </Toast>,
      { intent }
    );
  };

  const computeExpired = (createdAt, status) => {
    if (status !== 'stored' && status !== 'pending') return false;
    if (!createdAt) return false;
    const t = new Date(createdAt).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t > 3 * 24 * 60 * 60 * 1000;
  };

  const preprocessImageForOcr = async (file) => {
    const toCanvas = (img) => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(img.width * scale));
      canvas.height = Math.max(1, Math.floor(img.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return canvas;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      // Simple binarization: handwritten black text on white paper.
      const threshold = 200;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const v = lum > threshold ? 255 : 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
      return canvas;
    };

    try {
      // Fast path (Chromium/modern browsers)
      const bitmap = await createImageBitmap(file);
      return toCanvas(bitmap);
    } catch (e) {
      // Fallback: HTMLImageElement via object URL
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = url;
        });
        return toCanvas(img);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  };

  const extractTrackingAndPhone = (rawText) => {
    const text = rawText || '';
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let foundPhone = '';
    let foundTracking = '';

    const tryExtractPhoneFromLine = (line) => {
      const compact = line.replace(/\s+/g, '');
      // Accept any 11-digit number that starts with 1.
      // (The previous strict CN mobile rule 1[3-9]... rejects samples like 11451400114.)
      const m = compact.match(/1\d{10}/);
      return m ? m[0] : '';
    };

    const tryExtractTrackingFromLine = (line) => {
      const upper = line.toUpperCase();
      const m = upper.match(/TRACKING\s*(?:NO\.?|NUMBER)?\s*[:：]?\s*([A-Z0-9\-\s]{6,})/);
      if (m && m[1]) {
        const cleaned = m[1].toUpperCase().replace(/[^A-Z0-9-]/g, '');
        return cleaned.length >= 6 ? cleaned : '';
      }
      return '';
    };

    for (const line of lines) {
      if (!foundTracking) {
        const t = tryExtractTrackingFromLine(line);
        if (t) foundTracking = t;
      }
      if (!foundPhone) {
        const p = tryExtractPhoneFromLine(line);
        if (p) foundPhone = p;
      }
      if (foundTracking && foundPhone) break;
    }

    // Fallback: global scan
    const upperAll = text.toUpperCase();
    const compactAll = upperAll.replace(/\s+/g, '');

    if (!foundPhone) {
      const m = compactAll.match(/1\d{10}/);
      foundPhone = m ? m[0] : '';
    }

    if (!foundTracking) {
      const stopWords = ['TRACKING', 'NUMBER', 'STUDENT', 'PHONE'];
      const candidates = (compactAll.match(/[A-Z0-9-]{8,}/g) || [])
        .map((s) => s.replace(/[^A-Z0-9-]/g, ''))
        .filter((s) => s.length >= 8)
        .filter((s) => (foundPhone ? s !== foundPhone : true))
        .filter((s) => /\d{6,}/.test(s))
        .filter((s) => stopWords.every((w) => !s.includes(w)));

      foundTracking = candidates.sort((a, b) => b.length - a.length)[0] || '';
    }

    return { trackingNumber: foundTracking, phone: foundPhone };
  };

  const handleOcrRecognize = async () => {
    if (!ocrFile) {
      notify('Error', 'Please choose an image first', 'error');
      return;
    }

    setOcrLoading(true);
    setOcrProgress(0);
    setOcrText('');

    try {
      const input = await preprocessImageForOcr(ocrFile);
      const res = await Tesseract.recognize(input, 'eng', {
        logger: (m) => {
          if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
        // Page segmentation tuned for a small block of text.
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-',
      });

      const text = res?.data?.text || '';
      setOcrText(text);
      const extracted = extractTrackingAndPhone(text);
      setOcrTracking(extracted.trackingNumber);
      setOcrPhone(extracted.phone);

      if (!extracted.trackingNumber && !extracted.phone) {
        notify('Warning', 'OCR finished but did not find tracking/phone. Please edit manually.', 'warning');
      } else {
        notify('Success', 'OCR finished. Please verify and apply.', 'success');
      }
    } catch (e) {
      console.error(e);
      notify('Error', 'OCR failed', 'error');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleApplyOcrToInbound = () => {
    if (ocrTracking) setTrackingNumber(ocrTracking);
    if (ocrPhone) setPhone(ocrPhone);
    setSelectedTab('inbound');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <Toaster toasterId={toasterId} />
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar name="Courier" color="brand" />
          <Title3>Courier Dashboard</Title3>
        </div>
        <Button icon={<SignOutRegular />} onClick={handleLogout}>Logout</Button>
      </header>

      <main className={styles.content}>
        <TabList selectedValue={selectedTab} onTabSelect={(e, data) => setSelectedTab(data.value)}>
          <Tab value="inbound">Inbound Parcel</Tab>
          <Tab value="ocr">OCR Upload</Tab>
          <Tab value="tasks">My Tasks</Tab>
        </TabList>

        {selectedTab === 'inbound' && (
          <Card className={styles.card}>
            <Title3>Inbound New Parcel</Title3>
            <div className={styles.formContainer}>
              <div className={styles.inputGroup}>                                                                                                       
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input id="tracking" value={trackingNumber} onChange={(e, d) => setTrackingNumber(d.value)} placeholder="e.g. SF123456789" />
              </div>
              <div className={styles.inputGroup}>
                <Label htmlFor="phone">Student Phone</Label>
                <Input id="phone" value={phone} onChange={(e, d) => setPhone(d.value)} placeholder="e.g. 13800138000" />
              </div>
              <div className={styles.inputGroup}>
                <Label htmlFor="name">Student Name (optional)</Label>
                <Input id="name" value={studentName} onChange={(e, d) => setStudentName(d.value)} placeholder="e.g. 张三" />
              </div>
              <Button 
                appearance="primary" 
                icon={<AddCircleRegular />} 
                onClick={handleInbound}
                disabled={inboundLoading}
              >
                {inboundLoading ? 'Processing...' : 'Confirm Inbound'}
              </Button>
            </div>
          </Card>
        )}

        {selectedTab === 'ocr' && (
          <Card className={styles.card}>
            <Title3>OCR Upload</Title3>
            <Text size={300}>
              上传运单图
            </Text>

            <div className={styles.formContainer} style={{ marginTop: 12 }}>
              <div className={styles.inputGroup}>
                <Label htmlFor="ocr-file">Waybill Image</Label>
                <input
                  id="ocr-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                />
              </div>

              {ocrPreviewUrl && (
                <div className={styles.inputGroup}>
                  <Label>Preview</Label>
                  <img
                    src={ocrPreviewUrl}
                    alt="waybill preview"
                    style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e5e5e5' }}
                  />
                </div>
              )}

              <Button appearance="primary" onClick={handleOcrRecognize} disabled={ocrLoading}>
                {ocrLoading ? `Recognizing... ${ocrProgress}%` : 'Recognize'}
              </Button>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div className={styles.inputGroup} style={{ minWidth: 240, flex: 1 }}>
                  <Label>Tracking Number (editable)</Label>
                  <Input value={ocrTracking} onChange={(e, d) => setOcrTracking(d.value)} placeholder="e.g. SF123456789" />
                </div>
                <div className={styles.inputGroup} style={{ minWidth: 240, flex: 1 }}>
                  <Label>Student Phone (editable)</Label>
                  <Input value={ocrPhone} onChange={(e, d) => setOcrPhone(d.value)} placeholder="e.g. 13800138000" />
                </div>
              </div>

              <Button appearance="secondary" onClick={handleApplyOcrToInbound}>
                Apply to Inbound Form
              </Button>

              {ocrText && (
                <div className={styles.inputGroup}>
                  <Label>Recognized Text</Label>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12, background: '#fafafa', padding: 12, borderRadius: 8 }}>
                    {ocrText}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        )}

        {selectedTab === 'tasks' && (
          <Card className={styles.card}>
            <Title3>My Tasks (Parcels Handled)</Title3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Tracking Number</TableHeaderCell>
                  <TableHeaderCell>Student Phone</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Time</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell>Loading...</TableCell></TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow><TableCell>No tasks found.</TableCell></TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.tracking_number}>
                      <TableCell>{task.tracking_number}</TableCell>
                      <TableCell>{task.phone || '-'}</TableCell>
                      <TableCell>
                        {computeExpired(task.created_at, task.status) ? (
                          <Badge appearance="filled" color="danger">Expired</Badge>
                        ) : (
                          <Badge appearance="tint">{task.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(task.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
};
