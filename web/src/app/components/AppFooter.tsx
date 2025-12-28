"use client";

import Image from "next/image";

export function AppFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-[#0B0D12]/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-center">
        <div className="overflow-hidden flex items-center justify-center">
          <Image
            src="/notes-logo-tmp.png"
            alt="App logo"
            width={100}
            height={100}
            priority
            className="invert scale-[1.8]"
          />
        </div>
      </div>
    </footer>
  );
}
