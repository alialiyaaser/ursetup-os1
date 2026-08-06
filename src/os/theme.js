// Shared design tokens for UR SETUP OS — monochrome marble aesthetic.
// No blue. Only near-black, near-white, and warm neutrals.
export const tokens = (theme) => {
  const dark = theme === "dark";
  return {
    dark,
    shellBg:      dark ? "bg-[#0A0A0B]"                     : "bg-[#FAFAF9]",
    shellText:    dark ? "text-[#F5F5F4]"                   : "text-[#0A0A0B]",
    cardBg:       dark ? "bg-[#141416]"                     : "bg-white",
    cardBorder:   dark ? "border-white/[0.08]"              : "border-[#E7E5E4]",
    sideBg:       dark ? "bg-[#0F0F11]"                     : "bg-white",
    sideBorder:   dark ? "border-white/[0.06]"              : "border-[#EFEDEA]",
    barBg:        dark ? "bg-[#0A0A0B]/85 border-white/[0.06]" : "bg-white/95 border-[#EFEDEA]",
    hover:        dark ? "hover:bg-white/[0.05]"            : "hover:bg-[#F4F3F1]",
    muted:        dark ? "text-[#8A8A8E]"                   : "text-[#6B6968]",
    subtle:       dark ? "text-[#B4B4B7]"                   : "text-[#3F3D3C]",
    input:        dark ? "bg-[#0A0A0B] border-white/[0.1] focus:border-white/40 text-white placeholder-[#5A5A5E]" : "bg-white border-[#E0DEDB] focus:border-[#1B1B1D] text-[#0A0A0B] placeholder-[#9A9895]",
    ring:         "focus:outline-none focus:ring-2 focus:ring-white/10",
    primary:      dark ? "bg-white text-black hover:bg-[#EDEDED]" : "bg-[#0A0A0B] text-white hover:bg-[#1B1B1D]",
    ghost:        dark ? "border-white/[0.1] hover:bg-white/[0.05] text-[#E5E5E4]" : "border-[#E0DEDB] hover:bg-[#F4F3F1] text-[#0A0A0B]",
    danger:       dark ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50",
    chip:         dark ? "bg-white/[0.06] border-white/[0.08] text-[#D4D4D4]" : "bg-[#F4F3F1] border-[#EFEDEA] text-[#3F3D3C]",
    accentSoft:   dark ? "bg-white/[0.05] text-white" : "bg-[#F4F3F1] text-[#0A0A0B]",
    tableHead:    dark ? "bg-white/[0.03] text-[#8A8A8E]" : "bg-[#F7F5F2] text-[#6B6968]",
    rowBorder:    dark ? "border-white/[0.05]" : "border-[#EFEDEA]",
    logoBg:       dark ? "bg-white text-black" : "bg-[#0A0A0B] text-white",
    online:       "text-emerald-500 fill-emerald-500",
    offline:      "text-[#8A8A8E] fill-[#8A8A8E]",
  };
};
