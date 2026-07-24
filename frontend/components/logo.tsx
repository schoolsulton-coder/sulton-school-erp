/**
 * Sulton School emblemasi (toj + qalqon + S).
 * Rangni `currentColor` orqali oladi — qizil fonда oq, oq fonда qizil.
 * Aniq PNG logo bo'lsa, keyin shu komponentni <img> bilan almashtirsa bo'ladi.
 */
export function Logo({ className = 'h-8 w-8', title = 'Sulton School' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 122" className={className} fill="currentColor" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      {/* Toj */}
      <path d="M26 28 L36 12 L44 23 L50 5 L56 23 L64 12 L74 28 Z" />
      {/* Qalqon ramkasi (tashqi − ichki = ramka) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 36 H78 V74 C78 96 64 108 50 116 C36 108 22 96 22 74 Z
           M31 45 H69 V74 C69 92 58 102 50 108 C42 102 31 92 31 74 Z"
      />
      {/* S monogrammasi */}
      <text
        x="50"
        y="93"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="48"
        fontWeight="800"
      >
        S
      </text>
    </svg>
  );
}
