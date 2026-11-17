import { ArrowIcon, type SectionProps } from "@/ui/panels/shared";

export function Intro({ portfolio, dict }: SectionProps) {
  const { profile } = portfolio;
  const email = profile.contacts.find((c) => c.kind === "email");
  const social = profile.contacts.filter((c) => (c.kind === "linkedin" || c.kind === "github") && c.url);
  return (
    <>
      <h1 className="intro-name">{profile.shortName ?? profile.name}</h1>
      <p className="intro-lede">{dict.hero.lede}</p>
      <p className="intro-actions">
        {email?.url && (
          <a className="button" href={email.url}>
            {dict.nav.cta}
          </a>
        )}
        {social.map((c) => (
          <a key={c.kind} className="text-link" href={c.url} target="_blank" rel="noreferrer">
            {c.kind === "linkedin" ? "LinkedIn" : "GitHub"}
            <ArrowIcon />
          </a>
        ))}
      </p>
    </>
  );
}

/** Required attribution for the CC BY 4.0 models. */
export function Credits({ dict }: Pick<SectionProps, "dict">) {
  return (
    <p className="credits">
      {dict.credits.models} {dict.credits.crate}{" "}
      <a href="https://sketchfab.com/3d-models/scan-of-vinyl-records-in-box-crate-ffb34353b6604adf8ae8abcdd27695ac">
        “Scan of Vinyl records in box crate”
      </a>{" "}
      {dict.credits.by} <a href="https://sketchfab.com/Ellipsoid">Ellipsoid</a>; {dict.credits.deck}{" "}
      <a href="https://sketchfab.com/3d-models/vinyl-recorder-with-until-i-found-you-disc-2c6d0ebeea5c4aeaa0353e23d53f3869">
        “Vinyl Recorder with ‘Until i Found You’ disc”
      </a>{" "}
      {dict.credits.by} <a href="https://sketchfab.com/siyue_cherry">ImSiyue</a>.{" "}
      <a href="http://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
    </p>
  );
}
