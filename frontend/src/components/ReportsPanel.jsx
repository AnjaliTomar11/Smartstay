import { useEffect, useState } from 'react';
import api from '../api';

const formatMoney = (value) =>
  Number(value).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function StatusChart({ title, statuses }) {
  const entries = Object.entries(statuses || {});
  const maxCount = Math.max(...entries.map(([, count]) => Number(count) || 0), 1);

  return (
    <section className="reports-card reports-chart">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p className="reports-empty">No status data available.</p>
      ) : (
        <div className="reports-bars">
          {entries.map(([status, count], index) => {
            const value = Number(count) || 0;
            return (
              <div className="reports-bar-row" key={status}>
                <span className="reports-bar-label">{status.replaceAll('_', ' ')}</span>
                <div
                  className="reports-bar-track"
                  role="img"
                  aria-label={`${status.replaceAll('_', ' ')}: ${value}`}
                >
                  <div
                    className={`reports-bar reports-bar-${index % 4}`}
                    style={{ width: `${(value / maxCount) * 100}%` }}
                  />
                </div>
                <strong className="reports-bar-value">{value}</strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function ReportsPanel() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const response = await api.get('/reports/summary');
        setReport(response.data.report);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load reports.');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, []);

  if (loading) return <p className="reports-message">Loading reports...</p>;
  if (error) return <p className="error reports-message">{error}</p>;
  if (!report) return <p className="reports-message">No report data available.</p>;

  const stats = [
    {
      label: 'Occupancy',
      value: `${Number(report.rooms.occupancyRate).toFixed(2)}%`,
    },
    { label: 'Total revenue', value: formatMoney(report.revenue.total) },
    { label: 'Completed stays revenue', value: formatMoney(report.revenue.completed) },
    { label: 'Arrivals today', value: report.bookings.arrivalsToday },
    { label: 'Departures today', value: report.bookings.departuresToday },
    { label: 'Total bookings', value: report.bookings.total },
  ];

  return (
    <div className="reports-panel">
      <div className="reports-stats">
        {stats.map(({ label, value }) => (
          <section className="reports-card reports-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </section>
        ))}
      </div>

      <div className="reports-charts">
        <StatusChart title="Rooms by status" statuses={report.rooms.byStatus} />
        <StatusChart title="Bookings by status" statuses={report.bookings.byStatus} />
      </div>

      <section className="reports-card reports-revenue">
        <h3>Revenue by room type</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Room type</th><th>Bookings</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {Object.entries(report.revenue.byRoomType || {}).map(([roomType, data]) => (
                <tr key={roomType}>
                  <td>{roomType}</td>
                  <td>{data.bookings}</td>
                  <td>{formatMoney(data.revenue)}</td>
                </tr>
              ))}
              {Object.keys(report.revenue.byRoomType || {}).length === 0 && (
                <tr><td colSpan="3">No revenue data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
