import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Marks scores the server produced from the uploaded files, which designers can't edit. */
export const VerifiedBadge = ({ verified, className = "" }: { verified: boolean | null | undefined; className?: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          verified ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
        } ${className}`}
      >
        {verified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldQuestion className="w-3.5 h-3.5" />}
        {verified ? "Verified" : "Unverified"}
      </span>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      {verified
        ? "Scored on our server from the files exactly as uploaded. Neither the score nor the images can be edited afterwards."
        : "Scored before verification existed, so it can't be confirmed. Re-analyze to get a verified score."}
    </TooltipContent>
  </Tooltip>
);
