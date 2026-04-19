// Calculators: BudgetCalc + CompoundCalc
// Exported to window for use in steps.jsx

function BudgetCalc() {
  const [income, setIncome] = React.useState('');
  const [expenses, setExpenses] = React.useState('');
  const leftover = (parseFloat(income) || 0) - (parseFloat(expenses) || 0);
  const hasValues = income !== '' || expenses !== '';

  const fmt = (n) => new Intl.NumberFormat('nb-NO').format(Math.abs(Math.round(n)));

  const inputStyle = {
    width: '100%',
    padding: '14px 18px',
    border: '2px solid var(--border)',
    borderRadius: '14px',
    background: 'var(--warm)',
    color: 'var(--navy)',
    fontFamily: 'var(--font-body)',
    fontSize: '16px',
    fontWeight: '600',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      background: 'var(--warm)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '28px',
      marginTop: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: '700', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Enkelt budsjett</span>
      </div>
      <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>INNTEKT / MND</label>
          <input
            type="number"
            placeholder="40 000"
            value={income}
            onChange={e => setIncome(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>UTGIFTER / MND</label>
          <input
            type="number"
            placeholder="32 000"
            value={expenses}
            onChange={e => setExpenses(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>
      {hasValues && (
        <div style={{
          marginTop: '20px',
          padding: '20px 24px',
          borderRadius: '14px',
          background: leftover >= 0 ? 'var(--green-light)' : '#fde8e8',
          border: `1px solid ${leftover >= 0 ? '#b8e8d0' : '#f5b8b8'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: '600', color: leftover >= 0 ? '#1a6b45' : '#8b2020', fontSize: '15px' }}>
            {leftover >= 0 ? '✓ Til overs' : '✗ Underskudd'}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '700', color: leftover >= 0 ? '#1a6b45' : '#8b2020' }}>
            {leftover < 0 ? '−' : '+'}{fmt(leftover)} kr
          </span>
        </div>
      )}
      {hasValues && leftover > 0 && (
        <p style={{ marginTop: '14px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
          💡 Med {fmt(leftover)} kr til overs per måned kan du begynne å bygge buffer — og senere investere.
        </p>
      )}
    </div>
  );
}

function CompoundCalc() {
  const [start, setStart] = React.useState('10000');
  const [monthly, setMonthly] = React.useState('2000');
  const [years, setYears] = React.useState('20');
  const [rate, setRate] = React.useState('7');

  const calculate = () => {
    const p = parseFloat(start) || 0;
    const pmt = parseFloat(monthly) || 0;
    const n = parseFloat(years) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const months = n * 12;

    let total = p * Math.pow(1 + r, months);
    if (r > 0) {
      total += pmt * ((Math.pow(1 + r, months) - 1) / r);
    } else {
      total += pmt * months;
    }
    return total;
  };

  const totalValue = calculate();
  const totalInvested = (parseFloat(start) || 0) + (parseFloat(monthly) || 0) * (parseFloat(years) || 0) * 12;
  const gain = totalValue - totalInvested;
  const fmt = (n) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n);

  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
  const barWidth = totalValue > 0 ? Math.min((totalInvested / totalValue) * 100, 100) : 50;

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid var(--border)',
    borderRadius: '12px',
    background: 'var(--warm)',
    color: 'var(--navy)',
    fontFamily: 'var(--font-body)',
    fontSize: '16px',
    fontWeight: '600',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--muted)',
    marginBottom: '7px',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
  };

  return (
    <div style={{
      background: 'var(--warm)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '28px',
      marginTop: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: '700', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Rentes rente kalkulator</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <div>
          <label style={labelStyle}>Startbeløp (kr)</label>
          <input type="number" value={start} onChange={e => setStart(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={labelStyle}>Månedlig sparing (kr)</label>
          <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={labelStyle}>Antall år</label>
          <input type="number" value={years} onChange={e => setYears(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={labelStyle}>Årlig avkastning (%)</label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '24px',
        borderRadius: '16px',
        background: 'var(--navy)',
        color: 'white',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '6px' }}>Total verdi etter {years} år</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: '700', color: '#7de8b2', lineHeight: 1 }}>{fmt(totalValue)} kr</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ height: '100%', width: `${Math.min(barWidth, 100)}%`, background: '#93c5fd', borderRadius: '99px 0 0 99px', transition: 'width 0.5s ease', flexShrink: 0 }} />
            <div style={{ height: '100%', width: `${Math.min(100 - barWidth, 100)}%`, background: 'var(--green)', borderRadius: '0 99px 99px 0', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Innskudd</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(125,232,178,0.6)' }}>Avkastning</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Du sparer inn</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '600', color: 'white' }}>{fmt(totalInvested)} kr</p>
          </div>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(125,232,178,0.1)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(125,232,178,0.6)', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Avkastning</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '600', color: '#7de8b2' }}>+{fmt(gain)} kr</p>
          </div>
        </div>
        {gain > 0 && (
          <p style={{ marginTop: '14px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: '1.5' }}>
            Pengene dine vokser {Math.round(gainPct)}% utover det du setter inn — takket være rentes rente.
          </p>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BudgetCalc, CompoundCalc });
