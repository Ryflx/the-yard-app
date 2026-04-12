export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <img src="/icon-192.png" alt="" className="mb-8 h-20 w-20" />
      <h1 className="mb-4 font-headline text-3xl font-black uppercase tracking-tighter text-white">
        YOU&apos;RE OFFLINE
      </h1>
      <p className="font-label text-sm tracking-widest text-on-surface-variant">
        CHECK YOUR CONNECTION AND TRY AGAIN
      </p>
    </div>
  );
}
