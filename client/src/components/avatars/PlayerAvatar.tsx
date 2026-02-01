import { cn } from "@/lib/utils";
import { AvatarStyle, Emotion, HatType, Hairstyle, BodyVariant } from "./avatarStyles";

interface PlayerAvatarProps {
  style: AvatarStyle;
  emotion?: Emotion;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-12",   // 40x48
  md: "w-16 h-20",   // 64x80
  lg: "w-20 h-24",   // 80x96
};

export function PlayerAvatar({
  style,
  emotion = "neutral",
  size = "md",
  className,
}: PlayerAvatarProps) {
  return (
    <div
      className={cn(
        sizeClasses[size],
        "relative transition-transform duration-500",
        emotion === "frustrated" && "avatar-frustrated",
        emotion === "joyous" && "avatar-joyous",
        className
      )}
    >
      <svg
        viewBox="0 0 80 100"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
      >
        {/* Hairstyle behind head */}
        <HairstyleBack hairstyle={style.hairstyle} />

        {/* Body/shoulders */}
        <BodySilhouette variant={style.bodyVariant} />

        {/* Head */}
        <ellipse cx="40" cy="32" rx="17" ry="20" className="fill-slate-700 dark:fill-slate-500" />

        {/* Neck */}
        <rect x="34" y="48" width="12" height="8" className="fill-slate-700 dark:fill-slate-500" />

        {/* Hairstyle in front */}
        <HairstyleFront hairstyle={style.hairstyle} />

        {/* Hat (on top of everything) */}
        <Hat hatType={style.hatType} />
      </svg>
    </div>
  );
}

function BodySilhouette({ variant }: { variant: BodyVariant }) {
  const paths = {
    default: "M12 100 Q12 70 40 60 Q68 70 68 100",
    broader: "M8 100 Q8 68 40 58 Q72 68 72 100",
    slimmer: "M18 100 Q18 72 40 62 Q62 72 62 100",
  };

  return <path d={paths[variant]} className="fill-slate-700 dark:fill-slate-500" />;
}

function HairstyleBack({ hairstyle }: { hairstyle: Hairstyle }) {
  switch (hairstyle) {
    case "long":
      // Long hair flowing behind shoulders
      return (
        <path
          d="M20 25 Q15 35 18 55 Q20 70 25 80 L30 75 Q28 60 30 45 Q32 35 35 28 M60 25 Q65 35 62 55 Q60 70 55 80 L50 75 Q52 60 50 45 Q48 35 45 28"
          className="fill-slate-600 dark:fill-slate-400"
        />
      );
    case "curly":
      // Curly/afro expanded silhouette behind head
      return (
        <ellipse cx="40" cy="28" rx="26" ry="26" className="fill-slate-600 dark:fill-slate-400" />
      );
    default:
      return null;
  }
}

function HairstyleFront({ hairstyle }: { hairstyle: Hairstyle }) {
  switch (hairstyle) {
    case "short":
      // Short cropped hair outline
      return (
        <path
          d="M25 20 Q30 10 40 10 Q50 10 55 20 Q58 15 55 12 Q48 6 40 6 Q32 6 25 12 Q22 15 25 20"
          className="fill-slate-600 dark:fill-slate-400"
        />
      );
    case "ponytail":
      // Ponytail at back
      return (
        <>
          <path
            d="M25 20 Q30 10 40 10 Q50 10 55 20 Q58 15 55 12 Q48 6 40 6 Q32 6 25 12 Q22 15 25 20"
            className="fill-slate-600 dark:fill-slate-400"
          />
          <path
            d="M55 28 Q62 30 65 40 Q66 50 62 60 Q60 65 58 60 Q60 50 58 42 Q56 35 52 32"
            className="fill-slate-600 dark:fill-slate-400"
          />
        </>
      );
    case "bun":
      // Top bun
      return (
        <>
          <path
            d="M25 20 Q30 10 40 10 Q50 10 55 20"
            className="fill-slate-600 dark:fill-slate-400"
            strokeWidth="0"
          />
          <ellipse cx="40" cy="6" rx="10" ry="8" className="fill-slate-600 dark:fill-slate-400" />
        </>
      );
    case "curly":
      // Front curly bits
      return (
        <path
          d="M22 22 Q18 18 22 14 Q26 10 30 14 M58 22 Q62 18 58 14 Q54 10 50 14"
          className="fill-slate-600 dark:fill-slate-400"
        />
      );
    case "bald":
    default:
      return null;
  }
}

function Hat({ hatType }: { hatType: HatType }) {
  switch (hatType) {
    case "cowboy":
      return (
        <g className="fill-amber-800 dark:fill-amber-700">
          {/* Wide brim */}
          <ellipse cx="40" cy="18" rx="32" ry="6" />
          {/* Crown */}
          <path d="M28 18 Q28 5 40 4 Q52 5 52 18 L50 16 Q48 8 40 7 Q32 8 30 16 Z" />
          {/* Crown indent */}
          <path d="M32 8 Q40 12 48 8" className="stroke-amber-900 dark:stroke-amber-600" strokeWidth="2" fill="none" />
        </g>
      );
    case "beanie":
      return (
        <g className="fill-red-700 dark:fill-red-600">
          {/* Beanie dome */}
          <ellipse cx="40" cy="14" rx="18" ry="12" />
          {/* Fold at bottom */}
          <rect x="22" y="18" width="36" height="6" rx="2" className="fill-red-800 dark:fill-red-700" />
          {/* Pom pom */}
          <circle cx="40" cy="3" r="5" className="fill-red-600 dark:fill-red-500" />
        </g>
      );
    case "tophat":
      return (
        <g className="fill-slate-900 dark:fill-slate-700">
          {/* Brim */}
          <ellipse cx="40" cy="16" rx="22" ry="4" />
          {/* Tall crown */}
          <rect x="26" y="-8" width="28" height="24" rx="2" />
          {/* Band */}
          <rect x="26" y="8" width="28" height="4" className="fill-amber-600" />
        </g>
      );
    case "baseball":
      return (
        <g className="fill-blue-700 dark:fill-blue-600">
          {/* Cap dome */}
          <path d="M22 22 Q22 8 40 6 Q58 8 58 22 Q50 20 40 20 Q30 20 22 22" />
          {/* Bill */}
          <path d="M22 22 Q20 24 16 26 Q20 28 30 26 Q35 24 36 22 Z" className="fill-blue-800 dark:fill-blue-700" />
          {/* Button */}
          <circle cx="40" cy="6" r="2" className="fill-blue-500" />
        </g>
      );
    case "fedora":
      return (
        <g className="fill-stone-600 dark:fill-stone-500">
          {/* Brim */}
          <ellipse cx="40" cy="18" rx="26" ry="5" />
          {/* Crown */}
          <path d="M26 18 Q24 8 40 6 Q56 8 54 18" />
          {/* Indent */}
          <path d="M30 10 L40 14 L50 10" className="stroke-stone-700 dark:stroke-stone-400" strokeWidth="2" fill="none" />
          {/* Band */}
          <rect x="26" y="14" width="28" height="3" className="fill-stone-800 dark:fill-stone-600" />
        </g>
      );
    case "beret":
      return (
        <g className="fill-rose-800 dark:fill-rose-700">
          {/* Beret blob */}
          <ellipse cx="35" cy="12" rx="20" ry="10" />
          {/* Small stem */}
          <circle cx="35" cy="4" r="3" className="fill-rose-700 dark:fill-rose-600" />
        </g>
      );
    case "sunhat":
      return (
        <g className="fill-yellow-100 dark:fill-yellow-200">
          {/* Very wide floppy brim */}
          <ellipse cx="40" cy="16" rx="35" ry="8" />
          {/* Shallow crown */}
          <ellipse cx="40" cy="10" rx="16" ry="10" />
          {/* Ribbon */}
          <path d="M24 14 Q40 18 56 14" className="stroke-pink-400" strokeWidth="3" fill="none" />
        </g>
      );
    case "none":
    default:
      return null;
  }
}

export default PlayerAvatar;
