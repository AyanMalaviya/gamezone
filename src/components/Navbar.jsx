import { Gamepad2 } from 'lucide-react';

const Navbar = ({ rightSlot }) => (
  <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#0d0d0f]/80 backdrop-blur-md">
    <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
          <Gamepad2 size={20} className="text-violet-400" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">GameZone</span>
      </div>
      {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
    </div>
  </nav>
);

export default Navbar;
