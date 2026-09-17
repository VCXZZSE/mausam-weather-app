const STARS = [
  { x: 4,  y: 6,  size: 2,   cls: 'star-1' },
  { x: 52, y: 10, size: 1.5, cls: 'star-2' },
  { x: 10, y: 38, size: 1.5, cls: 'star-3' },
  { x: 58, y: 44, size: 2,   cls: 'star-4' },
  { x: 44, y: 2,  size: 1,   cls: 'star-5' },
  { x: 0,  y: 22, size: 1,   cls: 'star-6' },
];

export default function MoonIcon() {
  return (
    <div className="relative" style={{ width: 68, height: 68 }}>
      {STARS.map((s, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${s.cls}`}
          style={{
            left: s.x, top: s.y,
            width: s.size, height: s.size,
            background: 'white',
            boxShadow: `0 0 ${s.size * 2}px ${s.size}px rgba(200,215,255,0.8)`,
          }}
        />
      ))}

      {/* Crescent sphere */}
      <div
        className="moon-body absolute"
        style={{
          left: 12, top: 8,
          width: 44, height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E8EFF8 0%, #C8D8F0 50%, #A0B8E0 100%)',
        }}
      >
        {/* Shadow cutout creates the crescent */}
        <div
          style={{
            position: 'absolute',
            top: -6, left: 14,
            width: 44, height: 44,
            borderRadius: '50%',
            boxShadow: 'inset -10px -6px 0 0 rgba(18,22,42,0.88)',
          }}
        />
      </div>
    </div>
  );
}
