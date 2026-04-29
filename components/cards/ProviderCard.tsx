import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { User, ActivityPackage } from "@/types";

type Props = {
  provider: User & {
    package?: Pick<ActivityPackage, "name" | "activity_type" | "price" | "pricing_unit">;
  };
};

export default function ProviderCard({ provider }: Props) {
  const isVerified = provider.id_verified || provider.verification_status === "verified";

  return (
    <div className="card-hover group cursor-pointer overflow-hidden">
      {/* PHOTO */}
      <div className="relative w-full aspect-[16/10] bg-card2 overflow-hidden">
        {provider.photo ? (
          <Image
            src={provider.photo}
            alt={provider.full_name || "Bestie"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-serif text-4xl text-gold/30">
              {provider.full_name?.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* NAME ROW */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-lg font-semibold text-bestie">{provider.full_name}</span>
          {isVerified && (
            <span className="verified-badge">✓ Verified</span>
          )}
        </div>

        {/* META */}
        <div className="flex items-center gap-2 text-muted text-sm mb-3">
          <MapPin size={13} />
          <span>{provider.city}</span>
          <span>·</span>
          <Star size={13} className="text-gold" />
          <span>
            {provider.average_rating?.toFixed(1)} ({provider.completed_session_count} sessions)
          </span>
        </div>

        {/* BESTIE SCORE */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted uppercase tracking-wide">Bestie Score</span>
          <span className="bestie-score text-base">{provider.bestie_score}</span>
        </div>

        {/* BIO */}
        {provider.bio && (
          <p className="text-muted text-sm leading-relaxed mb-4 line-clamp-2">{provider.bio}</p>
        )}

        {/* PACKAGE */}
        {provider.package && (
          <div className="flex items-center justify-between p-3 bg-gold/5 border border-gold/10 rounded-xl mb-4">
            <div>
              <div className="text-sm font-medium text-bestie">{provider.package.name}</div>
              <div className="text-xs text-muted mt-0.5">{provider.package.activity_type}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gold">${provider.package.price}</div>
              <div className="text-xs text-muted">{provider.package.pricing_unit}</div>
            </div>
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/${provider.username}`}
          className="btn-gold w-full justify-center text-sm py-3"
        >
          → View profile
        </Link>
      </div>
    </div>
  );
}
