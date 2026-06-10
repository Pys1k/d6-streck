"use client";

interface PersonAvatarProps {
  name: string;
  color?: string;
  imageData?: string | null;
  size?: "xs" | "sm" | "md";
}

export function PersonAvatar({ name, color = "#8b5cf6", imageData, size = "sm" }: PersonAvatarProps) {
  const sz = size === "xs" ? "w-6 h-6 text-[10px]" : size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";

  if (imageData) {
    return (
      <img
        src={imageData}
        alt={name}
        className={`${sz} rounded-full object-cover flex-shrink-0`}
        style={{ border: `2px solid ${color}50` }}
      />
    );
  }

  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: `${color}25`, border: `2px solid ${color}50`, color }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}
