import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Printer, Eraser, PenLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import useAuth from '../stores/auth';

/* ── HTML-Template für das Kündigungsschreiben ─────────────────────── */
function buildCancellationHTML(contract, user, signatureDataUrl) {
  const today   = new Date();
  const dateStr = format(today, "d. MMMM yyyy", { locale: de });
  const city    = user?.city || '[Ort]';

  const senderName  = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '[Name]';
  const senderAddr1 = user?.street && user?.house_number ? `${user.street} ${user.house_number}` : user?.street || '';
  const senderAddr2 = [user?.postal_code, user?.city].filter(Boolean).join(' ');
  const senderEmail = user?.email || '';

  const billingLabel = {
    monthly: 'monatlich', quarterly: 'vierteljährlich',
    biannual: 'halbjährlich', yearly: 'jährlich',
  }[contract.billing_cycle] || contract.billing_cycle || '';

  const endDateStr = contract.end_date
    ? format(new Date(contract.end_date), 'd. MMMM yyyy', { locale: de })
    : 'nächstmöglichen Termin';

  const sigBlock = signatureDataUrl
    ? `<img src="${signatureDataUrl}" alt="Unterschrift" style="max-width:220px;max-height:80px;display:block;margin-top:8px;" />`
    : `<div style="border-bottom:1px solid #999;width:240px;height:60px;margin-top:8px;"></div>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Kündigung – ${contract.title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 20mm 25mm; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.55;
  }
  .page {
    max-width: 165mm;
    margin: 0 auto;
  }
  /* ── Absender klein oben ── */
  .sender-mini {
    font-size: 8pt;
    color: #888;
    border-bottom: 1px solid #ccc;
    padding-bottom: 3px;
    margin-bottom: 14px;
    letter-spacing: 0.03em;
  }
  /* ── Empfängeradresse ── */
  .recipient {
    min-height: 27mm;
    margin-bottom: 10mm;
    font-size: 10.5pt;
    line-height: 1.5;
  }
  /* ── Datum + Ort rechts ── */
  .date-line {
    text-align: right;
    font-size: 10.5pt;
    margin-bottom: 8mm;
    color: #333;
  }
  /* ── Betreff ── */
  .subject {
    font-weight: 700;
    font-size: 12pt;
    margin-bottom: 7mm;
    line-height: 1.4;
  }
  /* ── Meta-Tabelle ── */
  .meta {
    border-collapse: collapse;
    margin-bottom: 6mm;
    font-size: 10pt;
  }
  .meta td { padding: 2px 16px 2px 0; color: #444; }
  .meta td:first-child { color: #888; width: 120px; }
  /* ── Brieftext ── */
  .body-text p { margin-bottom: 5mm; }
  /* ── Unterschrift ── */
  .signature-block { margin-top: 12mm; }
  .signature-block .label { font-size: 9pt; color: #888; margin-bottom: 2px; }

  /* ── Print-Button nur am Bildschirm ── */
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: #1a1a1a; padding: 10px 20px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
  }
  .print-bar span { color: #94a3b8; font-size: 13px; }
  .print-bar button {
    padding: 8px 20px;
    border-radius: 10px; border: none; cursor: pointer;
    font-weight: 600; font-size: 13px;
  }
  .btn-print { background: #f97316; color: #fff; }
  .btn-close { background: #333; color: #ccc; }
  .page-wrap { padding-top: 52px; }

  @media print {
    .print-bar, .page-wrap { padding-top: 0 !important; }
    .print-bar { display: none !important; }
    body { font-size: 11pt; }
  }
</style>
</head>
<body>

<div class="print-bar">
  <span>Kündigung: <strong style="color:#fff">${contract.title}</strong></span>
  <div style="display:flex;gap:8px;">
    <button class="btn-print" onclick="window.print()">Drucken / Als PDF speichern</button>
    <button class="btn-close" onclick="window.close()">Schließen</button>
  </div>
</div>

<div class="page-wrap">
<div class="page">

  <!-- Absender-Mini-Zeile (Fensterkuvert) -->
  <div class="sender-mini">${senderName}${senderAddr1 ? ', ' + senderAddr1 : ''}${senderAddr2 ? ', ' + senderAddr2 : ''}</div>

  <!-- Empfänger -->
  <div class="recipient">
    <strong>${contract.company || '[Unternehmen]'}</strong><br>
    Vertragsabteilung / Kündigung<br>
    <!-- Adresse hier einfügen, falls bekannt -->
  </div>

  <!-- Datum -->
  <div class="date-line">${city}, den ${dateStr}</div>

  <!-- Betreff -->
  <div class="subject">
    Kündigung meines Vertrages<br>
    „${contract.title}"
    ${contract.cancel_until ? `<br><span style="font-size:10pt;color:#c0392b;">Kündigung bis spätestens: ${format(new Date(contract.cancel_until), 'd. MMMM yyyy', { locale: de })}</span>` : ''}
  </div>

  <!-- Meta -->
  <table class="meta">
    ${contract.customer_number ? `<tr><td>Kundennummer:</td><td>${contract.customer_number}</td></tr>` : ''}
    ${contract.contract_number ? `<tr><td>Vertragsnummer:</td><td>${contract.contract_number}</td></tr>` : ''}
    ${contract.phone_number    ? `<tr><td>Rufnummer:</td><td>${contract.phone_number}</td></tr>` : ''}
    ${contract.purpose         ? `<tr><td>Verwendungszweck:</td><td>${contract.purpose}</td></tr>` : ''}
    <tr><td>Vertragsbeginn:</td><td>${contract.start_date ? format(new Date(contract.start_date), 'd. MMMM yyyy', { locale: de }) : '—'}</td></tr>
    <tr><td>Vertragsende:</td><td>${contract.end_date    ? format(new Date(contract.end_date),   'd. MMMM yyyy', { locale: de }) : '—'}</td></tr>
    ${contract.amount ? `<tr><td>Betrag:</td><td>${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(contract.amount)} (${billingLabel})</td></tr>` : ''}
  </table>

  <!-- Brieftext -->
  <div class="body-text">
    <p>Sehr geehrte Damen und Herren,</p>
    <p>
      hiermit kündige ich den oben genannten Vertrag
      ${contract.end_date ? `ordentlich zum <strong>${endDateStr}</strong>` : 'fristgerecht zum <strong>nächstmöglichen Termin</strong>'}.
      ${contract.auto_renew ? 'Ich widerspreche ausdrücklich einer automatischen Verlängerung des Vertrages.' : ''}
    </p>
    <p>
      Bitte senden Sie mir eine schriftliche Bestätigung der Kündigung an meine E-Mail-Adresse
      ${senderEmail ? `<strong>${senderEmail}</strong>` : ''} oder per Post zu.
    </p>
    <p>
      Ich bitte um umgehende Bearbeitung und Freigabe meiner Rufnummer / meiner Daten nach Vertragsende.
    </p>
    <p>Mit freundlichen Grüßen,</p>
  </div>

  <!-- Unterschrift -->
  <div class="signature-block">
    <div class="label">Unterschrift:</div>
    ${sigBlock}
    <div style="margin-top:10px;font-size:10.5pt;">
      <strong>${senderName}</strong><br>
      ${senderAddr1 ? senderAddr1 + '<br>' : ''}
      ${senderAddr2 ? senderAddr2 + '<br>' : ''}
      ${senderEmail ? senderEmail : ''}
    </div>
  </div>

</div>
</div>
</body>
</html>`;
}

/* ── Signature Canvas ───────────────────────────────────────────────── */
function SignaturePad({ canvasRef }) {
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches?.[0] || e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const start = useCallback(e => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPos.current = pos;
    setDrawing(true);
  }, [canvasRef]);

  const move = useCallback(e => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [drawing, canvasRef]);

  const end = useCallback(() => setDrawing(false), []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Redraw background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hier unterschreiben', canvas.width / 2, canvas.height - 10);
    ctx.textAlign = 'left';
  };

  // Init canvas on mount
  useEffect(() => { clear(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={520} height={150}
          style={{ width: '100%', height: '140px', borderRadius: '12px', border: '1px solid #2a2a2a', cursor: 'crosshair', touchAction: 'none', display: 'block', background: '#fff' }}
          onMouseDown={start}  onMouseMove={move}  onMouseUp={end}  onMouseLeave={end}
          onTouchStart={start} onTouchMove={move}  onTouchEnd={end}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', padding: '5px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
      >
        <Eraser size={12} /> Löschen
      </button>
    </div>
  );
}

/* ── KuendigungModal ────────────────────────────────────────────────── */
export default function KuendigungModal({ contract, onClose }) {
  const { user } = useAuth();
  const canvasRef = useRef();
  const [withSig, setWithSig] = useState(true);

  const handleGenerate = () => {
    let sigDataUrl = null;
    if (withSig && canvasRef.current) {
      // Check if canvas has any drawing (not all white)
      const ctx = canvasRef.current.getContext('2d');
      const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data;
      const hasInk = Array.from(data).some((v, i) => i % 4 !== 3 && v < 200);
      if (hasInk) sigDataUrl = canvasRef.current.toDataURL('image/png');
    }

    const html = buildCancellationHTML(contract, user, sigDataUrl);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  };

  const missingData = !user?.first_name || !user?.city;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 9101, width: 'min(580px, calc(100vw - 20px))',
        maxHeight: 'calc(100dvh - 32px)', overflow: 'hidden',
        background: '#161616', border: '1px solid #2a2a2a', borderRadius: '22px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
        animation: 'dialogIn 0.18s ease',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
            <PenLine size={16} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '15px' }}>Kündigung erstellen</p>
            <p style={{ margin: '1px 0 0', color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contract.title}{contract.company ? ` · ${contract.company}` : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Warning if profile incomplete */}
          {missingData && (
            <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px' }}>
              <AlertCircle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, color: '#fbbf24', fontSize: '12px' }}>
                Dein Profil ist unvollständig. <strong>Vorname, Nachname, Adresse und Ort</strong> fehlen — diese erscheinen im Kündigungsschreiben. Ergänze sie im <strong>Profil</strong>.
              </p>
            </div>
          )}

          {/* Contract summary */}
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '14px' }}>
            <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vertragsdaten im Schreiben</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                ['Unternehmen',   contract.company || '—'],
                ['Kundennummer',  contract.customer_number || '—'],
                ['Vertragsnr.',   contract.contract_number || '—'],
                ['Handynummer',   contract.phone_number || '—'],
                ['Laufzeit bis',  contract.end_date ? format(new Date(contract.end_date), 'd. MMM yyyy', { locale: de }) : '—'],
                ['Kündigung bis', contract.cancel_until ? format(new Date(contract.cancel_until), 'd. MMM yyyy', { locale: de }) : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ fontSize: '12px' }}>
                  <span style={{ color: '#475569' }}>{k}: </span>
                  <span style={{ color: v === '—' ? '#374151' : '#e2e8f0' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signature pad */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>Digitale Unterschrift</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={withSig} onChange={e => setWithSig(e.target.checked)} style={{ accentColor: '#f97316', width: 14, height: 14 }} />
                <span style={{ color: '#64748b', fontSize: '12px' }}>Unterschrift hinzufügen</span>
              </label>
            </div>
            {withSig
              ? <SignaturePad canvasRef={canvasRef} />
              : <div style={{ padding: '16px', background: '#0f0f0f', border: '1px dashed #2a2a2a', borderRadius: '12px', textAlign: 'center', color: '#374151', fontSize: '13px' }}>
                  Schreiben wird ohne Unterschrift geöffnet — du kannst nach dem Drucken unterschreiben.
                </div>
            }
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #1e1e1e', display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>
            Abbrechen
          </button>
          <button onClick={handleGenerate} style={{
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            padding: '11px', background: '#ef4444', border: 'none', borderRadius: '12px',
            color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
          }}>
            <Printer size={15} /> PDF erstellen &amp; Drucken
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialogIn { from { opacity:0; transform:translate(-50%,-48%) scale(0.97); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
      `}</style>
    </>
  );
}
