// OpenStreetMap view of workers' saved base areas (not live GPS).
import { MapContainer, TileLayer, Marker, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';

const youIcon = L.divIcon({ className: '', html: '<div class="you-pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });

// Spread workers who share the same area centre so pins do not overlap.
function offset(i) {
  const angle = i * 2.4;
  const r = 0.0025 * Math.sqrt(i);
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

export default function WorkersMap({ workers, origin, radiusKm, jobId }) {
  const { t, price } = useI18n();
  const navigate = useNavigate();
  const center = origin?.lat ? [origin.lat, origin.lng] : [33.684, 73.047];
  const seen = {};
  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-ink-300/30 lg:h-full lg:min-h-[480px]">
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {origin?.lat && (
          <>
            <Marker position={center} icon={youIcon}>
              <Tooltip>{t('yourLocation')}</Tooltip>
            </Marker>
            {radiusKm && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#167A6E', dashArray: '6 6', fillOpacity: 0.05 }} />}
          </>
        )}
        {workers
          .filter((w) => w.location?.lat)
          .map((w) => {
            const key = w.location.area;
            seen[key] = (seen[key] || 0) + 1;
            const [dLat, dLng] = offset(seen[key] - 1);
            const icon = L.divIcon({
              className: '',
              html: `<div class="worker-pin">${w.rate ? price(w.rate) : w.name.split(' ')[0]}</div>`,
              iconAnchor: [30, 12],
            });
            return (
              <Marker
                key={w.id}
                position={[w.location.lat + dLat, w.location.lng + dLng]}
                icon={icon}
                eventHandlers={{ click: () => navigate(`/workers/${w.id}${jobId ? `?job=${jobId}` : ''}`) }}
              >
                <Tooltip>
                  {w.name} · ★ {w.ratingAvg?.toFixed(1)}
                </Tooltip>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
