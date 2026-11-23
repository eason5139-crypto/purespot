"use client";
import { MemberExperience } from "./MemberExperience";
export function MemberClub({ standalone = false }: { standalone?: boolean }) {
  return <MemberExperience view={standalone ? "shop" : "membership"} />;
}
