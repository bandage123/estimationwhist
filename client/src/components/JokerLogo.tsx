interface JokerLogoProps {
  size?: number;
  className?: string;
}

export function JokerLogo({ size = 64, className = "" }: JokerLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle - black with gold border */}
      <circle cx="50" cy="50" r="48" fill="#1a1a1a" stroke="#d4af37" strokeWidth="2" />

      {/* Overlapping cards around the edge - 16 cards in a ring */}
      {/* Cards are positioned around the circle, each rotated to point outward */}
      {[...Array(16)].map((_, i) => {
        const angle = (i * 22.5) - 90; // 22.5 degrees apart, starting from top
        const radians = (angle * Math.PI) / 180;
        const radius = 42;
        const x = 50 + radius * Math.cos(radians) - 8;
        const y = 50 + radius * Math.sin(radians) - 11;
        const suits = ['♥', '♠', '♦', '♣'];
        const suit = suits[i % 4];
        const isRed = suit === '♥' || suit === '♦';
        const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A', 'K', 'Q'];
        const rank = ranks[i];
        return (
          <g key={i} transform={`translate(${x}, ${y}) rotate(${angle + 90}, 8, 11)`}>
            <rect x="0" y="0" width="16" height="22" rx="1.5" fill="white" stroke="#ccc" strokeWidth="0.4" />
            <text x="2" y="7" fontSize="5" fill={isRed ? "#dc2626" : "#1a1a1a"} fontWeight="bold">{rank}</text>
            <text x="8" y="16" fontSize="8" fill={isRed ? "#dc2626" : "#1a1a1a"}>{suit}</text>
          </g>
        );
      })}

      {/* Inner circle - gold tint */}
      <circle cx="50" cy="52" r="26" fill="#d4af37" opacity="0.15" />

      {/* Simple joker face - no expression */}
      {/* Face - simple circle */}
      <circle cx="50" cy="56" r="14" fill="#fcd34d" />

      {/* Simple dot eyes only */}
      <circle cx="45" cy="55" r="2" fill="#1a1a1a" />
      <circle cx="55" cy="55" r="2" fill="#1a1a1a" />

      {/* Straw hat with wide flat brim - no ribbon */}
      {/* Hat brim - wide and flat */}
      <ellipse cx="50" cy="42" rx="26" ry="5" fill="#d4a574" />
      {/* Brim highlight */}
      <ellipse cx="50" cy="41" rx="24" ry="3" fill="#e8d4b8" opacity="0.5" />
      {/* Brim underside shadow */}
      <ellipse cx="50" cy="43" rx="24" ry="3" fill="#b8956c" />

      {/* Hat crown */}
      <path d="M36 42 L36 32 Q50 26 64 32 L64 42" fill="#d4a574" />
      {/* Crown shading */}
      <path d="M36 42 L36 32 Q50 26 64 32 L64 42" fill="url(#strawTexture)" />

      {/* Hat top */}
      <ellipse cx="50" cy="32" rx="14" ry="3" fill="#e2c197" />

      {/* Straw texture pattern */}
      <defs>
        <pattern id="strawTexture" patternUnits="userSpaceOnUse" width="4" height="4">
          <line x1="0" y1="0" x2="4" y2="4" stroke="#c9a06a" strokeWidth="0.5" opacity="0.4" />
          <line x1="0" y1="2" x2="2" y2="0" stroke="#c9a06a" strokeWidth="0.3" opacity="0.3" />
        </pattern>
      </defs>

      {/* Simple collar - red and gold */}
      <path d="M38 70 L44 66 L50 72 L56 66 L62 70" fill="#dc2626" />
      <circle cx="44" cy="67" r="2" fill="#d4af37" />
      <circle cx="56" cy="67" r="2" fill="#d4af37" />
    </svg>
  );
}
