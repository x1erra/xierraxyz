import Starfield from '@/components/Starfield';

export default function Home() {
  return (
    <main className="w-full h-screen bg-black overflow-hidden relative">
      <Starfield />
      {/* 
        The prompt asked for "nothing else appears". 
        So this main container is empty except for the starfield background.
        If any overlay content is needed later, it goes here with z-index > 0.
      */}
    </main>
  );
}
