type DNA = { role: string; industry: string; location: string; capabilities: { label: string }[]; needs: { label: string }[] };
type Listing = { offers: string[]; requirements: string[]; industry: string; location: string };
const normalize = (value: string) => value.toLocaleLowerCase().trim();
const overlap = (wanted: string[], available: string[]) => wanted.filter(value => available.some(other => normalize(value) === normalize(other)));
const weights: Record<string, [number, number, number, number]> = {
  Startup: [45, 35, 15, 5], Candidate: [30, 50, 15, 5], Recruiter: [50, 30, 15, 5],
  Creator: [40, 40, 15, 5], Business: [45, 35, 15, 5], 'Event organiser': [50, 30, 15, 5], 'Sponsor / Brand': [45, 35, 15, 5]
};
export function match(profile: DNA | null, listing: Listing) {
  if (!profile) return null;
  const capabilities = profile.capabilities.map(item => item.label);
  const needs = profile.needs.map(item => item.label);
  const forYou = overlap(needs, listing.offers);
  const forThem = overlap(listing.requirements, capabilities);
  const missing = listing.requirements.filter(item => !forThem.includes(item));
  const [needsWeight, skillsWeight, industryWeight, locationWeight] = weights[profile.role] || weights.Startup;
  const industry = normalize(profile.industry) === normalize(listing.industry);
  const location = normalize(profile.location) === normalize(listing.location);
  const score = Math.round((needs.length ? forYou.length / needs.length : 0) * needsWeight + (listing.requirements.length ? forThem.length / listing.requirements.length : 0) * skillsWeight + Number(industry) * industryWeight + Number(location) * locationWeight);
  return { score, forYou, forThem, missing, weights: { needs: needsWeight, capabilities: skillsWeight, industry: industryWeight, location: locationWeight }, industry, location };
}
