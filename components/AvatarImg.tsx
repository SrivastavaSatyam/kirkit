import Image from 'next/image';

type AvatarImgProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

/** Remote SVG avatars (Dicebear); `unoptimized` avoids Next SVG pipeline issues. */
export function AvatarImg({ src, alt, width, height, className }: AvatarImgProps) {
  return (
    <Image src={src} alt={alt} width={width} height={height} className={className} unoptimized />
  );
}
