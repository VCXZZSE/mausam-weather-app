export default function SunIcon() {
  const rays = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      <div
        className="absolute rounded-full"
        style={{
          width: 72, height: 72,
          background: 'radial-gradient(circle, rgba(255,200,60,0.35) 0%, transparent 70%)',
        }}
      />
      <div className="sun-rays-ring absolute" style={{ width: 64, height: 64 }}>
        {rays.map(i => (
          <div
            key={i}
            className="sun-ray absolute"
            style={{
              width: 3, height: 10,
              background: 'linear-gradient(to bottom, rgba(255,210,60,0.9), rgba(255,180,30,0.4))',
              borderRadius: 2,
              left: '50%', top: '50%',
              transformOrigin: '50% 32px',
              transform: `translateX(-50%) translateY(-32px) rotate(${i * 45}deg)`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <div
        className="sun-core relative rounded-full z-10"
        style={{
          width: 36, height: 36,
          background: 'radial-gradient(circle at 38% 38%, #FFE87C, #FFCA28 55%, #FF9800)',
        }}
      />
    </div>
  );
}
